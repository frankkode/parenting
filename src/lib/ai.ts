import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RecommendationInput {
  caseId: string;
  assessmentScore?: number;
  recentMessages?: { content: string; hasConflict: boolean }[];
  pendingAgreements?: { title: string; status: string }[];
  upcomingEvents?: { title: string; type: string }[];
}

export interface Recommendation {
  type: "communication" | "agreement" | "mediation" | "wellbeing" | "schedule";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: string;
}

export async function generateRecommendations(
  input: RecommendationInput
): Promise<Recommendation[]> {
  try {
    const prompt = `
You are an AI assistant for a co-parenting coordination platform. Based on the following case data, provide 3-5 actionable recommendations.

Assessment Score: ${input.assessmentScore ?? "N/A"}
Recent Messages: ${JSON.stringify(input.recentMessages ?? [])}
Pending Agreements: ${JSON.stringify(input.pendingAgreements ?? [])}
Upcoming Events: ${JSON.stringify(input.upcomingEvents ?? [])}

For each recommendation, provide:
- type: one of "communication", "agreement", "mediation", "wellbeing", "schedule"
- title: short title
- description: 1-2 sentence explanation
- priority: "high", "medium", or "low"
- action: optional specific action to take

Respond with a JSON array only.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return getDefaultRecommendations(input);

    const parsed = JSON.parse(content);
    return parsed.recommendations ?? parsed ?? getDefaultRecommendations(input);
  } catch (error) {
    console.error("[AI_RECOMMENDATIONS]", error);
    return getDefaultRecommendations(input);
  }
}

function getDefaultRecommendations(
  input: RecommendationInput
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (input.assessmentScore !== null && input.assessmentScore !== undefined && input.assessmentScore < 50) {
    recommendations.push({
      type: "communication",
      title: "Schedule a Mediation Session",
      description:
        "Your assessment score indicates significant co-parenting challenges. Consider scheduling a mediation session.",
      priority: "high",
      action: "Contact a mediator to schedule a session.",
    });
  }

  if (input.recentMessages?.some((m) => m.hasConflict)) {
    recommendations.push({
      type: "communication",
      title: "Practice Mindful Communication",
      description:
        "Recent messages show signs of conflict. Try using 'I' statements and focusing on the children's needs.",
      priority: "high",
      action: "Review the communication guidelines before sending your next message.",
    });
  }

  recommendations.push({
    type: "wellbeing",
    title: "Prioritize Children's Routine",
    description:
      "Maintaining consistent routines helps children adapt to co-parenting arrangements.",
    priority: "medium",
  });

  return recommendations;
}
