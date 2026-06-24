import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { assessmentId, questionId, value, score } = body;

    if (!assessmentId || !questionId || !value) {
      return NextResponse.json(
        { error: "assessmentId, questionId, and value are required" },
        { status: 400 }
      );
    }

    const answer = await prisma.answer.upsert({
      where: {
        assessmentId_questionId: { assessmentId, questionId },
      },
      create: {
        assessmentId,
        questionId,
        userId: (user as any).id,
        value,
        score: score !== undefined ? parseFloat(score) : null,
      },
      update: {
        value,
        score: score !== undefined ? parseFloat(score) : null,
      },
    });

    return NextResponse.json(answer, { status: 201 });
  } catch (error) {
    console.error("[ANSWERS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { answerId, value, score } = body;

    if (!answerId) {
      return NextResponse.json(
        { error: "answerId is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (value !== undefined) updateData.value = value;
    if (score !== undefined) updateData.score = parseFloat(score);

    const answer = await prisma.answer.update({
      where: { id: answerId },
      data: updateData,
    });

    return NextResponse.json(answer);
  } catch (error) {
    console.error("[ANSWERS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
