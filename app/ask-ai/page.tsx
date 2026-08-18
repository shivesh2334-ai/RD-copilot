"use client";

import { useState } from "react";
import MicButton from "@/components/MicButton";
import AiFeedback from "@/components/AiFeedback";

interface Turn {
  id: string;
  question: string;
  answer: string;
}

export default function AskAiPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setQuestion("");
    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), question: q, answer: data.answer ?? "No answer returned." },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), question: q, answer: "AI query failed — check the API configuration." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <span className="eyebrow">ask ai</span>
        <h1 className="text-2xl font-semibold mt-1">Ask any clinical query</h1>
        <p className="text-sm text-paper-ink/60 mt-1">
          Not tied to a specific patient — dosing, guideline thresholds, differential prompts,
          anything you&apos;d otherwise reach for a reference for.
        </p>
      </div>

      <div className="space-y-4">
        {turns.map((t) => (
          <div key={t.id} className="space-y-2">
            <div className="text-sm font-medium text-teal-700">You: {t.question}</div>
            <div className="card p-3 text-sm whitespace-pre-wrap">{t.answer}</div>
            <AiFeedback source="ask_ai" prompt={t.question} aiOutput={t.answer} />
          </div>
        ))}
        {turns.length === 0 && (
          <p className="text-sm text-paper-ink/40">No questions yet — ask your first one below.</p>
        )}
      </div>

      <div className="card p-3 flex items-end gap-2 sticky bottom-4">
        <textarea
          className="input min-h-[48px] flex-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. First-line antihypertensive in a 60-year-old with CKD stage 3?"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
        />
        <MicButton onText={(t) => setQuestion((prev) => (prev ? `${prev} ${t}` : t))} label="Dictate" />
        <button onClick={ask} disabled={asking || !question.trim()} className="btn-primary text-sm">
          {asking ? "Asking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
