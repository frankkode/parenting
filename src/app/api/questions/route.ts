import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    const where: Record<string, string> = {};

    if (category) where.category = category;
    if (type) where.type = type;

    const questions = await prisma.question.findMany({
      where,
      orderBy: { order: "asc" },
    });

    const parsed = questions.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[QUESTIONS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if ((user as { role: string }).role !== "ADMIN" && (user as { role: string }).role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { text, category, subcategory, type, options, order } = body;

    if (!text || !category || !type) {
      return NextResponse.json(
        { error: "text, category, and type are required" },
        { status: 400 }
      );
    }

    const question = await prisma.question.create({
      data: {
        text,
        category,
        subcategory: subcategory || null,
        type,
        options: options ? JSON.stringify(options) : null,
        order: order || 0,
      },
    });

    return NextResponse.json(
      { ...question, options: question.options ? JSON.parse(question.options) : null },
      { status: 201 }
    );
  } catch (error) {
    console.error("[QUESTIONS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    if ((user as { role: string }).role !== "ADMIN" && (user as { role: string }).role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, text, category, subcategory, type, options, order } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(category !== undefined && { category }),
        ...(subcategory !== undefined && { subcategory }),
        ...(type !== undefined && { type }),
        ...(options !== undefined && { options: options ? JSON.stringify(options) : null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json({
      ...question,
      options: question.options ? JSON.parse(question.options) : null,
    });
  } catch (error) {
    console.error("[QUESTIONS_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    if ((user as { role: string }).role !== "ADMIN" && (user as { role: string }).role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Delete related answers first to avoid FK constraint errors
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId: id } }),
      prisma.question.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[QUESTIONS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
