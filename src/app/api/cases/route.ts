import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const role = (user as any).role;

    const where: any = {};

    if (status) where.status = status;

    if (role === "parent") {
      where.OR = [{ parentAId: (user as any).id }, { parentBId: (user as any).id }];
    } else if (role === "mediator") {
      where.mediatorId = (user as any).id;
    }

    const cases = await prisma.familyCase.findMany({
      where,
      include: {
        parentA: { select: { id: true, name: true, email: true, image: true } },
        parentB: { select: { id: true, name: true, email: true, image: true } },
        mediator: { select: { id: true, name: true, email: true, image: true } },
        _count: {
          select: {
            messages: true,
            assessments: true,
            agreements: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error("[CASES_GET]", error);
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
    const { title, parentAId, parentBId, mediatorId, children } = body;
    const currentUser = user as { id: string; role: string };
    const role = currentUser.role?.toUpperCase() ?? "PARENT";

    // Only admin and mediator can create cases
    if (role !== "ADMIN" && role !== "MEDIATOR") {
      return NextResponse.json(
        { error: "Only administrators and mediators can create cases" },
        { status: 403 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!parentAId || !parentBId) {
      return NextResponse.json(
        { error: "Both Parent A and Parent B are required" },
        { status: 400 }
      );
    }

    const finalParentAId = parentAId;
    const finalParentBId = parentBId;

    // Verify both parents exist and have PARENT role
    const [parentA, parentB] = await Promise.all([
      prisma.user.findUnique({ where: { id: finalParentAId } }),
      prisma.user.findUnique({ where: { id: finalParentBId } }),
    ]);

    if (!parentA || !parentB) {
      return NextResponse.json(
        { error: "One or both parents not found" },
        { status: 400 }
      );
    }

    if (finalParentAId === finalParentBId) {
      return NextResponse.json(
        { error: "Parent A and Parent B must be different" },
        { status: 400 }
      );
    }

    // Create the case with optional children and mediator
    const familyCase = await prisma.familyCase.create({
      data: {
        title,
        status: "ACTIVE",
        parentAId: finalParentAId,
        parentBId: finalParentBId,
        mediatorId: mediatorId || null,
        children: children?.length
          ? {
              create: children.map(
                (child: {
                  name: string;
                  age: number;
                  school?: string;
                  grade?: string;
                  notes?: string;
                }) => ({
                  name: child.name,
                  age: child.age,
                  school: child.school || null,
                  grade: child.grade || null,
                  notes: child.notes || null,
                })
              ),
            }
          : undefined,
      },
      include: {
        parentA: { select: { id: true, name: true, email: true } },
        parentB: { select: { id: true, name: true, email: true } },
        mediator: { select: { id: true, name: true, email: true } },
        children: true,
      },
    });

    // Optionally create assessments for both parents
    const createAssessments = body.createAssessments === true;
    const assessmentType = body.assessmentType || "CO_PARENTING";

    if (createAssessments) {
      await prisma.assessment.createMany({
        data: [
          {
            familyCaseId: familyCase.id,
            userId: finalParentAId,
            type: assessmentType,
            status: "PENDING",
          },
          {
            familyCaseId: familyCase.id,
            userId: finalParentBId,
            type: assessmentType,
            status: "PENDING",
          },
        ],
      });
    }

    return NextResponse.json(familyCase, { status: 201 });
  } catch (error) {
    console.error("[CASES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
