import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const status = searchParams.get("status");
    const urgency = searchParams.get("urgency");

    const where: any = {};

    if (caseId) where.familyCaseId = caseId;
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;

    const requests = await prisma.helpRequest.findMany({
      where,
      include: {
        familyCase: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true, email: true, image: true } },
        responder: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [
        { urgency: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[HELP_REQUESTS_GET]", error);
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
    const { familyCaseId, title, description, type, urgency } = body;

    if (!familyCaseId || !title) {
      return NextResponse.json(
        { error: "familyCaseId and title are required" },
        { status: 400 }
      );
    }

    const helpRequest = await prisma.helpRequest.create({
      data: {
        familyCaseId,
        requesterId: (user as any).id,
        title,
        description: description || null,
        type: type || "other",
        status: "open",
        urgency: urgency || "medium",
      },
      include: {
        requester: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(helpRequest, { status: 201 });
  } catch (error) {
    console.error("[HELP_REQUESTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
