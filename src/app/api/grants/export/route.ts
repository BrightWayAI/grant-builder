import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedGrants = await prisma.savedGrant.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { matchScore: "desc" },
    });

    // Build CSV content
    const headers = [
      "Title",
      "Funder",
      "Grant ID",
      "Deadline",
      "Award Floor",
      "Award Ceiling",
      "Match Score",
      "Categories",
      "Eligible Types",
      "Saved Date",
    ];

    const rows = savedGrants.map((grant) => [
      escapeCsvField(grant.title),
      escapeCsvField(grant.funderName),
      grant.grantId,
      grant.deadline ? new Date(grant.deadline).toLocaleDateString() : "",
      grant.awardFloor ? `$${grant.awardFloor.toLocaleString()}` : "",
      grant.awardCeiling ? `$${grant.awardCeiling.toLocaleString()}` : "",
      `${grant.matchScore}%`,
      escapeCsvField(grant.categories.join("; ")),
      escapeCsvField(grant.eligibleTypes.join("; ")),
      new Date(grant.savedAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const filename = `grant-watchlist-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting grants:", error);
    return NextResponse.json(
      { error: "Failed to export grants" },
      { status: 500 }
    );
  }
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
