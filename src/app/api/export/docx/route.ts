import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganization();

    const body = await request.json();
    const { proposalId } = body;

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        organizationId,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
        organization: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: proposal.title,
            bold: true,
            size: 48,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    if (proposal.funderName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Submitted to: ${proposal.funderName}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    if (proposal.organization) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Prepared by: ${proposal.organization.name}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      })
    );

    for (const section of proposal.sections) {
      children.push(
        new Paragraph({
          text: section.sectionName,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      const contentParagraphs = htmlToDocxParagraphs(section.content);
      children.push(...contentParagraphs);
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${proposal.title.replace(/[^a-z0-9]/gi, "_")}.docx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to export proposal" }, { status: 500 });
  }
}

function htmlToDocxParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const stripped = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/h[123]>/gi, "\n\n")
    .replace(/<h1[^>]*>/gi, "")
    .replace(/<h2[^>]*>/gi, "")
    .replace(/<h3[^>]*>/gi, "");

  const text = stripped.replace(/<[^>]*>/g, "").trim();

  const lines = text.split(/\n+/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  }

  return paragraphs;
}
