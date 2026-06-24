import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (caseId) where.familyCaseId = caseId;
    if (userId) where.userId = userId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        familyCase: {
          select: { id: true, title: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[EVENTS_GET]", error);
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
    const { familyCaseId, title, description, startDate, endDate, type, recurring, color } = body;

    if (!familyCaseId || !title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "familyCaseId, title, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        familyCaseId,
        userId: (user as any).id,
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || "other",
        recurring: recurring || null,
        color: color || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[EVENTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
