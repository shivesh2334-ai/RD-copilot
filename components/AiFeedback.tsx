"use client";

import { useState } from "react";
import type { FeedbackSource } from "@/lib/types";

export default function AiFeedback({
  source,
  prompt,
  aiOutput,
  patientId,
  consultId,
}: {
  source: FeedbackSource;
  prompt: string;
  aiOutput: string;
  patientId?: string;
  consultId?: string;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const sendVote = async (v: "up" | "down") => {
    setVote(v);
    setStatus("saving");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          vote: v,
          prompt,
          ai_output: aiOutput,
          patient_id: patientId ?? null,
          consult_id: consultId ?? null,
        }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-paper-ink/50 font-mono">Was this useful?</span>
      <button
        type="button"
        onClick={() => sendVote("up")}
        aria-pressed={vote === "up"}
        className={`px-2 py-1 rounded-md border text-base transition-colors ${
          vote === "up" ? "bg-teal-100 border-teal-500" : "border-paper-dim hover:bg-teal-50"
        }`}
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => sendVote("down")}
        aria-pressed={vote === "down"}
        className={`px-2 py-1 rounded-md border text-base transition-colors ${
          vote === "down" ? "bg-terracotta-100 border-terracotta-500" : "border-paper-dim hover:bg-teal-50"
        }`}
      >
        👎
      </button>
      {status === "saving" && <span className="text-xs text-paper-ink/40">saving…</span>}
      {status === "saved" && <span className="text-xs text-teal-600">recorded, thank you</span>}
      {status === "error" && <span className="text-xs text-terracotta-600">couldn&apos;t save — try again</span>}
    </div>
  );
}
