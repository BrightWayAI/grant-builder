import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { runCopilotAction, CopilotAction } from "@/lib/ai/generation";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganization();

    const body = await request.json();
    const { type, selectedText, customPrompt, proposalId } = body;

    if (!selectedText) {
      return NextResponse.json({ error: "No text selected" }, { status: 400 });
    }

    const action: CopilotAction = {
      type: type || "custom",
      selectedText,
      customPrompt,
      context: {
        organizationId,
        proposalId,
      },
    };

    const stream = await runCopilotAction(action);

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Copilot error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
