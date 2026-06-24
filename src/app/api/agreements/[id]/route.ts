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

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        familyCase: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        versions: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(agreement);
  } catch (error) {
    console.error("[AGREEMENT_GET]", error);
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

    const existing = await prisma.agreement.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.content !== undefined) {
      updateData.content = body.content;
      updateData.version = { increment: 1 };
    }
    if (body.acceptedById !== undefined) {
      updateData.acceptedById = body.acceptedById;
      updateData.acceptedAt = new Date();
      updateData.status = "accepted";
    }

    const agreement = await prisma.agreement.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(agreement);
  } catch (error) {
    console.error("[AGREEMENT_PATCH]", error);
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

    const existing = await prisma.agreement.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    await prisma.agreement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGREEMENT_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
