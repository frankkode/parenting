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

    // Cascade delete will remove WishResponses too
    const deleted = await prisma.coparentingWish.deleteMany({
      where: { familyCaseId: caseId },
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
