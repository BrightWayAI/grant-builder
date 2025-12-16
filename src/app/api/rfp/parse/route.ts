import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { extractTextFromFile, isValidFileType } from "@/lib/ai/document-parser";
import { parseRFP } from "@/lib/ai/rfp-parser";
import { logAiError } from "@/lib/error-logging";

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

    return NextResponse.json(parsed);
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
