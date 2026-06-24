import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get("isRead");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { userId: (user as any).id };

    if (isRead === "true") where.isRead = true;
    if (isRead === "false") where.isRead = false;
    if (type) where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: (user as any).id, isRead: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
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
    const { userId, caseId, title, message, type, link } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { error: "userId and title are required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        caseId: caseId || null,
        title,
        message: message || null,
        type: type || "info",
        isRead: false,
        link: link || null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ids, markAllRead } = body;

    const where: any = { userId: (user as any).id };

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { ...where, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true });
    }

    if (ids && Array.isArray(ids)) {
      where.id = { in: ids };

      await prisma.notification.updateMany({
        where,
        data: { isRead: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Provide ids array or markAllRead: true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
