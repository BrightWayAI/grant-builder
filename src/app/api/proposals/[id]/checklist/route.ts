/**
 * Checklist API (AC-2.1, AC-2.2)
 * 
 * Manages RFP checklist items and section mappings
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { getChecklistStatus, autoMapSectionsToChecklist } from "@/lib/enforcement/checklist-mapper";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganization();
    
    const status = await getChecklistStatus(params.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Checklist GET error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to get checklist" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganization();
    
    const body = await request.json();
    const { action } = body;
    
    if (action === "auto-map") {
      const mappings = await autoMapSectionsToChecklist(params.id);
      return NextResponse.json({ mappings });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Checklist POST error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}
