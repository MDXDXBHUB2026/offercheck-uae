"use client";

import { useReducer, useState, type FormEvent } from "react";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { gateReducer, INITIAL_GATE_FLOW } from "@/lib/approvalGate";
import type { AnalysisResult } from "@/lib/types";

// ruleCount comes from the server page, so the rules themselves never ship to the browser.
export function OfferChecker({ ruleCount }: { ruleCount: number }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gateFlow, dispatchGate] = useReducer(gateReducer, INITIAL_GATE_FLOW);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    dispatchGate({ type: "reset" });
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="offer">Job offer text</label>
        <textarea
          id="offer"
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the WhatsApp message, email or LinkedIn text here"
        />
        <button type="submit" disabled={loading || text.trim().length === 0}>
          {loading ? "Checking..." : "Check offer"}
        </button>
      </form>
      <div aria-live="polite">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {result && <ResultsPanel result={result} ruleCount={ruleCount} />}
      </div>
      {result && <ApprovalPanel gate={gateFlow.gate} dispatch={dispatchGate} />}
    </>
  );
}
