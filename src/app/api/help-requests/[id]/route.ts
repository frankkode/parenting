import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id },
      include: {
        familyCase: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true, email: true, image: true } },
        responder: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!helpRequest) {
      return NextResponse.json(
        { error: "Help request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(helpRequest);
  } catch (error) {
    console.error("[HELP_REQUEST_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.helpRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Help request not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.responderId !== undefined) {
      updateData.responderId = body.responderId;
      updateData.status = "accepted";
      updateData.acceptedAt = new Date();
    }
    if (body.status !== undefined) updateData.status = body.status;
    if (body.responseNote !== undefined) updateData.responseNote = body.responseNote;
    if (body.urgency !== undefined) updateData.urgency = body.urgency;

    if (body.status === "completed") {
      updateData.completedAt = new Date();
    }

    const helpRequest = await prisma.helpRequest.update({
      where: { id },
      data: updateData,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        responder: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(helpRequest);
  } catch (error) {
    console.error("[HELP_REQUEST_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.helpRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Help request not found" },
        { status: 404 }
      );
    }

    await prisma.helpRequest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[HELP_REQUEST_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
