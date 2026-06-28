import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = (user as any).id;
    const body = await request.json();
    const { caseId, messageIds } = body;

    if (!caseId && !messageIds) {
      return NextResponse.json(
        { error: "caseId or messageIds is required" },
        { status: 400 }
      );
    }

    // Mark specific messages or all messages in a case as read
    const where: any = {
      recipientId: userId,
      isRead: false,
    };

    if (messageIds) {
      where.id = { in: messageIds };
    } else if (caseId) {
      where.familyCaseId = caseId;
    }

    const result = await prisma.message.updateMany({
      where,
      data: { isRead: true },
    });

    return NextResponse.json({ markedRead: result.count });
  } catch (error) {
    console.error("[MARK_READ]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
