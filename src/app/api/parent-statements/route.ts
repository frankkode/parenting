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

    // Auto-generate wishes from the analysis
    if (analysis) {
      try {
        const parsed = typeof analysis === "string" ? JSON.parse(analysis) : analysis;
        const wishesToCreate: { content: string; category: string }[] = [];

        // Extract from key concerns
        if (parsed.keyConcerns && Array.isArray(parsed.keyConcerns)) {
          for (const concern of parsed.keyConcerns) {
            if (concern.points && Array.isArray(concern.points)) {
              for (const pt of concern.points) {
                wishesToCreate.push({ content: pt, category: concern.category || "EMOTIONAL_READINESS" });
              }
            }
            if (concern.label && concern.label !== concern.points?.[0]) {
              wishesToCreate.push({ content: concern.label, category: concern.category || "EMOTIONAL_READINESS" });
            }
          }
        }

        // Extract from proposed solutions
        if (parsed.proposedSolutions && Array.isArray(parsed.proposedSolutions)) {
          for (const sol of parsed.proposedSolutions) {
            if (sol.points && Array.isArray(sol.points)) {
              for (const pt of sol.points) {
                wishesToCreate.push({ content: pt, category: sol.category || "CHILDCARE_CAPACITY" });
              }
            }
          }
        }

        // Extract from agreement proposals (titles are good wish statements)
        if (parsed.agreementProposals && Array.isArray(parsed.agreementProposals)) {
          for (const prop of parsed.agreementProposals) {
            if (prop.title) {
              wishesToCreate.push({ content: prop.title, category: prop.category || "FINANCIAL_CAPACITY" });
            }
          }
        }

        // Deduplicate and create
        const seen = new Set<string>();
        const unique = wishesToCreate.filter((w) => {
          const key = w.content.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (unique.length > 0) {
          await prisma.coparentingWish.createMany({
            data: unique.map((w) => ({
              familyCaseId,
              authorId: (user as { id: string }).id,
              content: w.content,
              category: w.category,
              source: "STATEMENT",
            })),
          });
        }
      } catch (err) {
        console.error("[PARENT_STATEMENTS_POST] Failed to auto-generate wishes:", err);
        // Don't fail the request — wishes are best-effort
      }
    }

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
