import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const authUser = user as { id: string; role: string };
    const { id: caseId } = await params;

    if (authUser.role !== "ADMIN" && authUser.role !== "MEDIATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only clear responses — don't delete the wishes themselves
    const wishes = await prisma.coparentingWish.findMany({
      where: { familyCaseId: caseId },
      select: { id: true },
    });
    const wishIds = wishes.map((w) => w.id);

    const deleted = await prisma.wishResponse.deleteMany({
      where: { wishId: { in: wishIds } },
    });

    return NextResponse.json({ deletedCount: deleted.count });
  } catch (error) {
    console.error("[RESET_WISHES]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
