import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { extractTextFromFile, isValidFileType } from "@/lib/ai/document-parser";
import { parseRFP } from "@/lib/ai/rfp-parser";
import { logAiError } from "@/lib/error-logging";
import { ambiguityDetector } from "@/lib/enforcement/ambiguity-detector";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isValidFileType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: PDF, DOCX, TXT" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(buffer, file.type);

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Could not extract sufficient text from document" },
        { status: 400 }
      );
    }

    const parsed = await parseRFP(text);

    // Detect ambiguities in the RFP text (AC-2.4)
    // Note: proposalId will be set when proposal is created
    let ambiguities: { type: string; description: string; requiresUserInput: boolean }[] = [];
    try {
      const detected = await ambiguityDetector.detectAmbiguities(text, 'pending');
      ambiguities = detected.map(a => ({
        type: a.type,
        description: a.description,
        requiresUserInput: a.requiresUserInput,
        sourceTexts: a.sourceTexts,
        suggestedResolutions: a.suggestedResolutions
      }));
    } catch (ambiguityError) {
      console.error('Ambiguity detection failed:', ambiguityError);
      // Continue without ambiguities - they'll be checked at export
    }

    return NextResponse.json({ 
      ...parsed, 
      rfpText: text, // Include raw text for later ambiguity persistence
      ambiguities 
    });
  } catch (error) {
    console.error("RFP parse error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Log RFP parsing errors (AI-related)
    await logAiError(error, {
      sectionName: "RFP Parse",
    });
    
    return NextResponse.json(
      { error: "Failed to parse RFP. Please try again or enter requirements manually." },
      { status: 500 }
    );
  }
}
