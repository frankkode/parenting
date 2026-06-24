import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_CONTEXTS: Record<string, string> = {
  LIVING_SITUATION:
    "the parent's housing stability, living arrangements, safety of the home environment, and suitability for raising children",
  WORK_SITUATION:
    "the parent's employment stability, work schedule flexibility, ability to balance work and childcare, and career prospects",
  CHILDCARE_CAPACITY:
    "the parent's ability to provide daily care, supervision, nurturing, meal preparation, transportation, and meeting children's routine needs",
  FINANCIAL_CAPACITY:
    "the parent's financial stability, ability to provide for children's material needs (food, clothing, education, healthcare), budgeting skills, and child support responsibility",
  EMOTIONAL_READINESS:
    "the parent's emotional stability, mental health, stress management, conflict resolution skills, and psychological readiness for co-parenting",
  CHILD_WELLBEING:
    "the child's physical health, emotional state, academic performance, social relationships, behavioral indicators, and adjustment to the family situation",
};

const TYPE_GUIDANCE: Record<string, string> = {
  SLIDER:
    "Use SLIDER type for questions that can be answered on a 0-10 scale. Provide no options (options must be null).",
  BOOLEAN:
    "Use BOOLEAN type for yes/no questions. Provide no options (options must be null).",
  TEXT: "Use TEXT type for open-ended questions requiring detailed written responses. Provide no options (options must be null).",
  SINGLE_CHOICE:
    "Use SINGLE_CHOICE type for questions where only one option should be selected. Provide an array of 3-6 string options.",
  MULTIPLE_CHOICE:
    "Use MULTIPLE_CHOICE type for questions where multiple options can be selected. Provide an array of 3-6 string options.",
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const role = (user as { role: string }).role;
    if (role !== "ADMIN" && role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { category, count = 5, type } = body as {
      category: string;
      count?: number;
      type?: string;
    };

    if (!category) {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 }
      );
    }

    if (!CATEGORY_CONTEXTS[category]) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${Object.keys(CATEGORY_CONTEXTS).join(", ")}` },
        { status: 400 }
      );
    }

    const categoryLabel = category.replace(/_/g, " ").toLowerCase();
    const categoryContext = CATEGORY_CONTEXTS[category];
    const typeGuidance = type && TYPE_GUIDANCE[type] ? `\n\nAll questions MUST be of type "${type}". ${TYPE_GUIDANCE[type]}` : "";
    const typeMix = !type
      ? `\n\nMix question types appropriately: use SLIDER for rating-scale questions, BOOLEAN for yes/no, TEXT for open-ended, SINGLE_CHOICE for preference questions, and MULTIPLE_CHOICE for multi-select scenarios.`
      : "";

    // Get existing questions for context (avoid duplicates)
    const existingQuestions = await prisma.question.findMany({
      where: { category },
      select: { text: true },
    });
    const existingTexts = existingQuestions.map((q) => q.text);

    // Get the max order for this category
    const maxOrderResult = await prisma.question.aggregate({
      where: { category },
      _max: { order: true },
    });
    const startOrder = (maxOrderResult._max.order ?? 0) + 1;

    const prompt = `Generate ${count} professional co-parenting assessment questions for the category "${categoryLabel}" which covers ${categoryContext}.

Each question should be specific, actionable, and designed to evaluate ${categoryContext} in a family law / co-parenting mediation context.${typeMix}${typeGuidance}

IMPORTANT: Do NOT generate any of these existing questions:
${existingTexts.map((t) => `- ${t}`).join("\n")}

Return ONLY a valid JSON array of question objects with this exact structure:
[
  {
    "text": "The question text",
    "type": "SLIDER" | "TEXT" | "BOOLEAN" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE",
    "options": ["Option A", "Option B"] or null,
    "subcategory": "optional subcategory string or null"
  }
]

The subcategory field should group related questions (e.g., "housing_stability", "work_schedule", "emotional_support", "financial_planning"). Use snake_case.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a child psychology and family law expert who creates professional co-parenting assessment questionnaires. Respond ONLY with valid JSON. No markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";

    // Parse the JSON response
    let generatedQuestions: {
      text: string;
      type: string;
      options: string[] | null;
      subcategory: string | null;
    }[];

    try {
      // Strip markdown code fences if present
      const jsonStr = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
      generatedQuestions = JSON.parse(jsonStr);

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error("AI did not return a valid array of questions");
      }
    } catch {
      console.error("[QUESTIONS_GENERATE] Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to generate valid questions. Please try again." },
        { status: 500 }
      );
    }

    // Validate and return generated questions (don't save yet — user reviews first)
    const validTypes = ["SLIDER", "TEXT", "BOOLEAN", "SINGLE_CHOICE", "MULTIPLE_CHOICE"];
    const validatedQuestions = [];

    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];

      if (!q.text || !q.type) continue;
      if (!validTypes.includes(q.type)) {
        q.type = "SLIDER"; // Default fallback
      }

      // Ensure options are correct for the type
      let options: string[] | null = null;
      if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
        options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option 1", "Option 2", "Option 3"];
      }

      // Ensure subcategory is valid
      const subcategory = q.subcategory && q.subcategory.trim() ? q.subcategory.trim().toLowerCase().replace(/\s+/g, "_") : null;

      validatedQuestions.push({
        text: q.text,
        category,
        subcategory,
        type: q.type,
        options,
        order: startOrder + i,
      });
    }

    return NextResponse.json(
      { questions: validatedQuestions, count: validatedQuestions.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("[QUESTIONS_GENERATE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
