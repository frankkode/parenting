import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: any = {};

    if (caseId) where.familyCaseId = caseId;
    if (status) where.status = status;
    if (type) where.type = type;

    const agreements = await prisma.agreement.findMany({
      where,
      include: {
        familyCase: {
          select: { id: true, title: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        signatures: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(agreements);
  } catch (error) {
    console.error("[AGREEMENTS_GET]", error);
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
    const { familyCaseId, title, description, type, content } = body;

    if (!familyCaseId || !title || !content) {
      return NextResponse.json(
        { error: "familyCaseId, title, and content are required" },
        { status: 400 }
      );
    }

    const agreement = await prisma.agreement.create({
      data: {
        familyCaseId,
        title,
        description: description || null,
        type: type || "custom",
        status: "draft",
        content,
        version: 1,
        createdById: (user as any).id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        familyCase: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (error) {
    console.error("[AGREEMENTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
