/**
 * Voice Profile API (AC-3.4)
 * 
 * Allows users to view and edit their organization's voice profile.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { 
  getVoiceProfile, 
  updateVoiceProfile, 
  buildVoiceProfile 
} from "@/lib/enforcement/voice-profile";

export async function GET() {
  try {
    const { organizationId } = await requireOrganization();
    
    const profile = await getVoiceProfile(organizationId);
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Voice profile fetch error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch voice profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganization();
    
    const body = await request.json();
    const { preferredTerms, bannedTerms } = body;
    
    // Validate input
    if (preferredTerms && !Array.isArray(preferredTerms)) {
      return NextResponse.json({ error: "preferredTerms must be an array" }, { status: 400 });
    }
    if (bannedTerms && !Array.isArray(bannedTerms)) {
      return NextResponse.json({ error: "bannedTerms must be an array" }, { status: 400 });
    }
    
    await updateVoiceProfile(organizationId, {
      preferredTerms: preferredTerms?.map((t: string) => t.trim().toLowerCase()).filter(Boolean),
      bannedTerms: bannedTerms?.map((t: string) => t.trim().toLowerCase()).filter(Boolean),
    });
    
    const updatedProfile = await getVoiceProfile(organizationId);
    
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Voice profile update error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update voice profile" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { organizationId } = await requireOrganization();
    
    // Trigger rebuild
    const result = await buildVoiceProfile(organizationId);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || "Failed to build voice profile" 
      }, { status: 400 });
    }
    
    const profile = await getVoiceProfile(organizationId);
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Voice profile build error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to build voice profile" }, { status: 500 });
  }
}
