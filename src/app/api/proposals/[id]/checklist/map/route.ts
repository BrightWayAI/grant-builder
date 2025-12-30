/**
 * Checklist Mapping API (AC-2.2)
 * 
 * Manually maps sections to checklist items
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { manualMapSectionToChecklist } from "@/lib/enforcement/checklist-mapper";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganization();
    
    const body = await request.json();
    const { checklistItemId, sectionId } = body;
    
    if (!checklistItemId || !sectionId) {
      return NextResponse.json(
        { error: "checklistItemId and sectionId are required" },
        { status: 400 }
      );
    }
    
    await manualMapSectionToChecklist(checklistItemId, sectionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checklist map error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to map section" }, { status: 500 });
  }
}
