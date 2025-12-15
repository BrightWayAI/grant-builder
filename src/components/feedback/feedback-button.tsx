"use client";

import { useState } from "react";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/primitives/card";
import { Textarea } from "@/components/primitives/textarea";
import { Badge } from "@/components/primitives/badge";
import { X, MessageSquare, Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment>("NEUTRAL");
  const [message, setMessage] = useState("");
  const [allowContact, setAllowContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!message.trim()) {
      toast({ title: "Add a note", description: "Please tell us what happened", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentiment,
          message,
          allowContact,
          pageUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to send feedback");
      toast({ title: "Thanks for the feedback" });
      setMessage("");
      setAllowContact(false);
      setSentiment("NEUTRAL");
      setOpen(false);
    } catch (err) {
      toast({ title: "Error", description: "Could not send feedback", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <Button size="sm" variant="secondary" className="shadow-lg" onClick={() => setOpen(true)}>
          <MessageSquare className="h-4 w-4 mr-2" /> Beta feedback
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
          <div className="w-full max-w-md m-4 pointer-events-auto">
            <Card className="shadow-2xl border-border-strong">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Share beta feedback</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Overall</span>
                  <div className="flex gap-1">
                    <SentimentChip label="👍" value="POSITIVE" active={sentiment === "POSITIVE"} onClick={setSentiment} />
                    <SentimentChip label="😐" value="NEUTRAL" active={sentiment === "NEUTRAL"} onClick={setSentiment} />
                    <SentimentChip label="👎" value="NEGATIVE" active={sentiment === "NEGATIVE"} onClick={setSentiment} />
                  </div>
                </div>
                <Textarea
                  placeholder="What happened? What should we improve?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={allowContact}
                    onChange={(e) => setAllowContact(e.target.checked)}
                  />
                  Okay to contact me about this
                </label>
                <div className="flex justify-end">
                  <Button size="sm" onClick={submit} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Submit
                  </Button>
                </div>
                <p className="text-[11px] text-text-tertiary">We’ll include your email, org, and the page you were on.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function SentimentChip({ label, value, active, onClick }: { label: string; value: Sentiment; active: boolean; onClick: (v: Sentiment) => void }) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className="cursor-pointer"
      onClick={() => onClick(value)}
    >
      {label}
    </Badge>
  );
}
