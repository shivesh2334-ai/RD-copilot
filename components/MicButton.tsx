"use client";

import { useVoiceDictation } from "@/lib/useVoiceDictation";

export default function MicButton({
  onText,
  label = "Dictate",
}: {
  onText: (text: string) => void;
  label?: string;
}) {
  const { listening, supported, start, stop } = useVoiceDictation(onText);

  if (!supported) {
    return (
      <span className="text-xs text-paper-ink/40 font-mono">
        Voice input isn't supported in this browser
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
        listening
          ? "bg-terracotta-500 text-white border-terracotta-500 animate-pulse"
          : "border-teal-300 text-teal-700 hover:bg-teal-50"
      }`}
    >
      <span>{listening ? "●" : "🎙"}</span>
      {listening ? "Listening… tap to stop" : label}
    </button>
  );
}
