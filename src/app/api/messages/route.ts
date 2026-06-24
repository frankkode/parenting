import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const senderId = searchParams.get("senderId");
    const hasConflict = searchParams.get("hasConflict");

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId query parameter is required" },
        { status: 400 }
      );
    }

    const where: any = { familyCaseId: caseId };

    if (senderId) where.senderId = senderId;
    if (hasConflict === "true") where.hasConflict = true;
    if (hasConflict === "false") where.hasConflict = false;

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { familyCaseId, recipientId, subject, content, type } = body;

    if (!familyCaseId || !content) {
      return NextResponse.json(
        { error: "familyCaseId and content are required" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        familyCaseId,
        senderId: (user as any).id,
        recipientId: recipientId || null,
        subject: subject || null,
        content,
        type: type || "general",
        isRead: false,
        hasConflict: false,
        attachments: null,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
