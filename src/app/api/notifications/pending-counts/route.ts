import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = (user as any).id as string;

    // Unsigned agreements: user is a parent in a case with agreements in "accepted" or "signed" status
    // that they haven't signed yet
    const userCases = await prisma.familyCase.findMany({
      where: {
        OR: [{ parentAId: userId }, { parentBId: userId }],
      },
      select: { id: true },
    });

    const caseIds = userCases.map((c) => c.id);

    const unsignedAgreements = caseIds.length > 0
      ? await prisma.agreement.count({
          where: {
            familyCaseId: { in: caseIds },
            status: { in: ["accepted", "signed"] },
            signatures: { none: { userId } },
          },
        })
      : 0;

    // Unread messages
    const unreadMessages = await prisma.message.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    // Pending assessments
    const pendingAssessments = await prisma.assessment.count({
      where: {
        userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    return NextResponse.json({
      unsignedAgreements,
      unreadMessages,
      pendingAssessments,
    });
  } catch (error) {
    console.error("[PENDING_COUNTS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
