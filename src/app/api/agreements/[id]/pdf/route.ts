import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        familyCase: {
          select: {
            id: true,
            title: true,
            parentA: { select: { id: true, name: true, email: true } },
            parentB: { select: { id: true, name: true, email: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        signatures: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Helper: add text with word wrap
    const addText = (text: string, x: number, fontSize: number, options?: { bold?: boolean; maxWidth?: number }) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", options?.bold ? "bold" : "normal");
      const maxW = options?.maxWidth ?? pageWidth - margin * 2;
      const lines = doc.splitTextToSize(text, maxW);
      doc.text(lines, x, y);
      y += lines.length * (fontSize * 0.4) + 2;
    };

    const addLine = () => {
      y += 1;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text("Co-Parenting Agreement", margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(agreement.title, margin, y);
    y += 8;

    // Case info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Case: ${agreement.familyCase.title}`, margin, y);
    y += 5;
    doc.text(`Type: ${agreement.type} | Version: ${agreement.version} | Status: ${agreement.status.toUpperCase()}`, margin, y);
    y += 5;
    doc.text(`Created by: ${agreement.createdBy?.name || "Unknown"} | Date: ${new Date(agreement.createdAt).toLocaleDateString()}`, margin, y);
    y += 8;

    addLine();

    // Participants
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Participants", margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Parent A: ${agreement.familyCase.parentA?.name || "N/A"} (${agreement.familyCase.parentA?.email || ""})`, margin + 5, y);
    y += 5;
    doc.text(`Parent B: ${agreement.familyCase.parentB?.name || "N/A"} (${agreement.familyCase.parentB?.email || ""})`, margin + 5, y);
    y += 8;

    addLine();

    // Agreement Content
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Agreement Content", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    // Split content into paragraphs
    const paragraphs = agreement.content.split("\n");
    for (const para of paragraphs) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      if (para.trim()) {
        addText(para.trim(), margin, 10);
      } else {
        y += 4;
      }
    }

    y += 4;
    addLine();

    // Signatures section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Electronic Signatures", margin, y);
    y += 8;

    if (agreement.signatures.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("No signatures yet.", margin, y);
      y += 6;
    } else {
      for (const sig of agreement.signatures) {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);

        const roleLabel: Record<string, string> = {
          PARENT_A: "Parent A",
          PARENT_B: "Parent B",
          ADMIN: "Administrator",
          MEDIATOR: "Mediator",
          WITNESS: "Witness",
        };

        doc.text(`${roleLabel[sig.role] || sig.role}: ${sig.fullName}`, margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text(`Signed on: ${new Date(sig.createdAt).toLocaleString()} | Verification: ${sig.id}`, margin + 5, y);
        y += 6;
      }
    }

    y += 6;
    addLine();

    // Verification footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    const verificationCode = agreement.id;
    doc.text(`Electronic Signature Verification Code: ${verificationCode}`, margin, y);
    y += 4;
    doc.text(`This document was electronically signed through the Co-Parenting Platform.`, margin, y);
    y += 4;
    doc.text(`Generated: ${new Date().toLocaleString()} | Agreement ID: ${agreement.id}`, margin, y);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="agreement-${agreement.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[AGREEMENT_PDF]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
