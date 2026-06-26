import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET — list statements for a case (or all if admin)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const statements = await prisma.parentStatement.findMany({
      where: { familyCaseId: caseId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(statements);
  } catch (error) {
    console.error("[PARENT_STATEMENTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new parent statement with analysis
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { familyCaseId, content, analysis } = body;

    if (!familyCaseId || !content) {
      return NextResponse.json(
        { error: "familyCaseId and content are required" },
        { status: 400 }
      );
    }

    const statement = await prisma.parentStatement.create({
      data: {
        familyCaseId,
        userId: (user as { id: string }).id,
        content,
        analysis: analysis ? JSON.stringify(analysis) : "{}",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    console.error("[PARENT_STATEMENTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — update analysis or content
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, content, analysis } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (content !== undefined) data.content = content;
    if (analysis !== undefined) data.analysis = typeof analysis === "string" ? analysis : JSON.stringify(analysis);

    const statement = await prisma.parentStatement.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(statement);
  } catch (error) {
    console.error("[PARENT_STATEMENTS_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const role = (user as { role: string }).role;
    if (role !== "ADMIN" && role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.parentStatement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PARENT_STATEMENTS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
