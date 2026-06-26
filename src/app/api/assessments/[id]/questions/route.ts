import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    // Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Check if already added
    const existing = await prisma.assessmentQuestion.findUnique({
      where: { assessmentId_questionId: { assessmentId: id, questionId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Question already in this assessment" }, { status: 409 });
    }

    const entry = await prisma.assessmentQuestion.create({
      data: { assessmentId: id, questionId },
      include: {
        question: {
          select: { id: true, text: true, category: true, subcategory: true, type: true, options: true, order: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("[ASSESSMENT_QUESTIONS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    // Delete the link — does NOT delete the question from the bank
    await prisma.assessmentQuestion.deleteMany({
      where: { assessmentId: id, questionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ASSESSMENT_QUESTIONS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
