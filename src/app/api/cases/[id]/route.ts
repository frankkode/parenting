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

    const familyCase = await prisma.familyCase.findUnique({
      where: { id },
      include: {
        parentA: {
          select: { id: true, name: true, email: true, image: true, phone: true, profession: true },
        },
        parentB: {
          select: { id: true, name: true, email: true, image: true, phone: true, profession: true },
        },
        mediator: {
          select: { id: true, name: true, email: true, image: true },
        },
        children: true,
        _count: {
          select: {
            messages: true,
            assessments: true,
            agreements: true,
            events: true,
            helpRequests: true,
            sharedNotes: true,
            responsibilityItems: true,
          },
        },
      },
    });

    if (!familyCase) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const role = (user as any).role;
    const userId = (user as any).id;
    const isParticipant =
      familyCase.parentAId === userId ||
      familyCase.parentBId === userId ||
      familyCase.mediatorId === userId;

    if (role !== "admin" && !isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(familyCase);
  } catch (error) {
    console.error("[CASE_GET]", error);
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
    const { title, status, mediatorId } = body;

    const existing = await prisma.familyCase.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const familyCase = await prisma.familyCase.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(mediatorId !== undefined && { mediatorId }),
      },
      include: {
        parentA: { select: { id: true, name: true, email: true } },
        parentB: { select: { id: true, name: true, email: true } },
        mediator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(familyCase);
  } catch (error) {
    console.error("[CASE_PATCH]", error);
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

    const existing = await prisma.familyCase.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    await prisma.familyCase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CASE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
