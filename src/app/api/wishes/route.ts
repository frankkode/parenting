import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const currentUser = authUser as { id: string; role: string };
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const userId = searchParams.get("userId");
    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";

    let where: any = {};

    if (caseId) {
      where.familyCaseId = caseId;
    } else if (userId && !isStaff) {
      // Parent: get wishes from their own cases
      const userCases = await prisma.familyCase.findMany({
        where: {
          OR: [{ parentAId: userId }, { parentBId: userId }],
        },
        select: { id: true },
      });
      where.familyCaseId = { in: userCases.map((c) => c.id) };
    } else if (userId && isStaff) {
      // Staff viewing a specific user's wishes
      const userCases = await prisma.familyCase.findMany({
        where: {
          OR: [{ parentAId: userId }, { parentBId: userId }],
        },
        select: { id: true },
      });
      where.familyCaseId = { in: userCases.map((c) => c.id) };
    }
    // If no filters and isStaff: return all wishes (where stays {})

    const wishes = await prisma.coparentingWish.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
        familyCase: { select: { id: true, title: true } },
        responses: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(wishes);
  } catch (error) {
    console.error("[WISHES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    const body = await request.json();
    const { familyCaseId, content, category, source, authorId } = body;

    if (!familyCaseId || !content || !category) {
      return NextResponse.json(
        { error: "familyCaseId, content, and category are required" },
        { status: 400 }
      );
    }

    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";

    // Admin/mediator can set the author to a parent in the case
    const finalAuthorId = isStaff && authorId ? authorId : currentUser.id;

    const wish = await prisma.coparentingWish.create({
      data: {
        familyCaseId,
        authorId: finalAuthorId,
        content,
        category,
        source: source || "MANUAL",
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        responses: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    return NextResponse.json(wish, { status: 201 });
  } catch (error) {
    console.error("[WISHES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const currentUser = user as { id: string; role: string };
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const wish = await prisma.coparentingWish.findUnique({
      where: { id },
      select: { authorId: true, familyCaseId: true },
    });

    if (!wish) {
      return NextResponse.json({ error: "Wish not found" }, { status: 404 });
    }

    // Only admin, mediator, or the author can delete
    const isStaff = currentUser.role === "ADMIN" || currentUser.role === "MEDIATOR";
    if (!isStaff && wish.authorId !== currentUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.coparentingWish.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WISHES_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
