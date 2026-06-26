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
    const { id } = await params;
    const body = await request.json();
    const { agreement, comment } = body;

    if (agreement === undefined || agreement === null) {
      return NextResponse.json({ error: "agreement rating (0-10) is required" }, { status: 400 });
    }

    const rating = parseInt(agreement, 10);
    if (isNaN(rating) || rating < 0 || rating > 10) {
      return NextResponse.json({ error: "agreement must be between 0 and 10" }, { status: 400 });
    }

    // Verify wish exists
    const wish = await prisma.coparentingWish.findUnique({
      where: { id },
      select: { id: true, familyCaseId: true, authorId: true, content: true },
    });
    if (!wish) {
      return NextResponse.json({ error: "Wish not found" }, { status: 404 });
    }

    // Can't respond to your own wish
    if (wish.authorId === currentUser.id) {
      return NextResponse.json({ error: "You cannot respond to your own wish" }, { status: 400 });
    }

    // Upsert: create or update the response
    const response = await prisma.wishResponse.upsert({
      where: {
        wishId_userId: { wishId: id, userId: currentUser.id },
      },
      create: {
        wishId: id,
        userId: currentUser.id,
        agreement: rating,
        comment: comment || null,
      },
      update: {
        agreement: rating,
        comment: comment ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Check if both parents have now responded — auto-generate agreement if so
    const allResponses = await prisma.wishResponse.findMany({
      where: { wishId: id },
      select: { userId: true, agreement: true },
    });

    if (allResponses.length >= 2) {
      const scores = allResponses.map((r) => r.agreement);
      const avgAgreement = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      // If both parents agree at a high level (>=7), auto-create a draft agreement
      if (avgAgreement >= 7) {
        const existingAgreement = await prisma.agreement.findFirst({
          where: { familyCaseId: wish.familyCaseId, title: { contains: wish.content.substring(0, 30) } },
        });
        if (!existingAgreement) {
          await prisma.agreement.create({
            data: {
              familyCaseId: wish.familyCaseId,
              title: `Auto: ${wish.content.substring(0, 60)}`,
              content: `Both parents agree on: ${wish.content}\n\nAverage agreement score: ${avgAgreement}/10\n\nThis agreement was automatically generated because both parents rated this wish with high agreement.`,
              type: "CUSTOM",
              status: "DRAFT",
              createdById: currentUser.id,
            },
          });
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[WISH_RESPOND_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
