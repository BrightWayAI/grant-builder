"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  FileText,
  Lightbulb,
  CheckCircle,
  Loader2,
} from "lucide-react";

const QUICK_ACTIONS = [
  { type: "expand", label: "Expand", icon: Maximize2, description: "Add more detail" },
  { type: "condense", label: "Condense", icon: Minimize2, description: "Make it shorter" },
  { type: "strengthen", label: "Add Data", icon: FileText, description: "Add evidence" },
  { type: "clarify", label: "Clarify", icon: Lightbulb, description: "Simplify language" },
  { type: "grammar", label: "Fix Grammar", icon: CheckCircle, description: "Fix errors" },
];

interface CopilotPanelProps {
  selectedText: string;
  proposalId: string;
  onResult: (text: string) => void;
  onClose: () => void;
}

export function CopilotPanel({
  selectedText,
  proposalId,
  onResult,
  onClose,
}: CopilotPanelProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState("");
  const { toast } = useToast();

  const runAction = async (type: string, prompt?: string) => {
    if (!selectedText && type !== "custom") {
      toast({
        title: "No text selected",
        description: "Select some text in the editor to use the AI copilot",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResult("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          selectedText: selectedText || prompt,
          customPrompt: prompt,
          proposalId,
        }),
      });

      if (!response.ok) throw new Error("Request failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResult(text);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyResult = () => {
    if (result) {
      onResult(result);
      setResult("");
    }
  };

  return (
    <Card className="fixed right-4 top-24 w-96 shadow-lg z-50 max-h-[calc(100vh-120px)] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Copilot
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-4">
        {selectedText ? (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500 mb-1">Selected text:</p>
            <p className="text-sm line-clamp-3">{selectedText}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Select text in the editor to use quick actions
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.type}
                variant="outline"
                size="sm"
                className="justify-start h-auto py-2"
                onClick={() => runAction(action.type)}
                disabled={isProcessing || !selectedText}
              >
                <Icon className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500">Or ask anything:</p>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Make this more compelling..."
            rows={2}
          />
          <Button
            className="w-full"
            onClick={() => runAction("custom", customPrompt)}
            disabled={isProcessing || (!selectedText && !customPrompt)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Run
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Result:</p>
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{result}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={applyResult}>
                Apply Changes
              </Button>
              <Button variant="outline" onClick={() => setResult("")}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
