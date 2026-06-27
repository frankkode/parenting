import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { fullName } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required for electronic signature" },
        { status: 400 }
      );
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        familyCase: { select: { parentAId: true, parentBId: true } },
        signatures: true,
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // Determine the signer's role
    const userId = (user as any).id;
    let role = "WITNESS";
    if (userId === agreement.familyCase.parentAId) role = "PARENT_A";
    else if (userId === agreement.familyCase.parentBId) role = "PARENT_B";
    else if ((user as any).role === "ADMIN") role = "ADMIN";
    else if ((user as any).role === "MEDIATOR") role = "MEDIATOR";

    // Upsert the signature (one per user per agreement)
    const signature = await prisma.agreementSignature.upsert({
      where: {
        agreementId_userId: { agreementId: id, userId },
      },
      create: {
        agreementId: id,
        userId,
        fullName: fullName.trim(),
        role,
      },
      update: {
        fullName: fullName.trim(),
        role,
      },
    });

    // Check if all required parties have signed
    const updatedAgreement = await prisma.agreement.findUnique({
      where: { id },
      include: { signatures: true },
    });

    const parentASigned = updatedAgreement!.signatures.some(
      (s) => s.userId === agreement.familyCase.parentAId
    );
    const parentBSigned = updatedAgreement!.signatures.some(
      (s) => s.userId === agreement.familyCase.parentBId
    );

    // Mark as signed when both parents have signed
    if (parentASigned && parentBSigned && agreement.status !== "signed") {
      await prisma.agreement.update({
        where: { id },
        data: { status: "signed" },
      });
    }

    return NextResponse.json({ signature, parentASigned, parentBSigned });
  } catch (error) {
    console.error("[AGREEMENT_SIGN]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
