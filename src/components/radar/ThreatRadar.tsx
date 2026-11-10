"use client";

import { useState } from "react";
import { MapPin, Plus, Search, ShieldAlert } from "lucide-react";
import { ReportModal } from "@/components/radar/ReportModal";
import { useLocalReports } from "@/components/radar/localReports";
import { Button, Card, Chip } from "@/components/ui";
import { SAMPLE_LABEL, THREAT_SAMPLES, THREAT_TYPES } from "@/data/threatSamples";

const ALL = "All";

type Entry = { id: string; title: string; type: string; region: string; description: string; warningQuote: string; severity?: "High" | "Medium" };

function matches(entry: Entry, query: string, type: string): boolean {
  if (type !== ALL && entry.type !== type) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [entry.title, entry.description, entry.warningQuote, entry.region].some((field) => field.toLowerCase().includes(q));
}

function EntryCard({ entry, label }: { entry: Entry; label: string }) {
  return (
    <Card as="li" tone={entry.severity === "High" ? "high" : "medium"} className="stack-sm card-fill radar-card">
      <div className="row-between">
        <Chip tone={entry.severity === "High" ? "high" : "caution"} upper>
          {entry.type}
        </Chip>
        <Chip tone="neutral">{label}</Chip>
      </div>
      <h3 className="h3">{entry.title}</h3>
      <p className="small muted">{entry.description}</p>
      {entry.warningQuote && <p className="quote">{entry.warningQuote}</p>}
      <p className="card-foot small muted row">
        <MapPin className="icon" aria-hidden="true" />
        <span>{entry.region}</span>
      </p>
    </Card>
  );
}

// The reference app's Threat Radar, with static demo entries (src/data/threatSamples.ts) and the
// reports written in this tab. Search and filter run in the browser; nothing is fetched or sent.
export function ThreatRadar() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [reporting, setReporting] = useState(false);
  const local = useLocalReports();
  const samples = THREAT_SAMPLES.filter((entry) => matches(entry, query, type));
  const mine = local.filter((entry) => matches(entry, query, type));

  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="red">
        <div className="stack-sm">
          <p className="eyebrow-pill eyebrow-red">
            <span className="dot dot-high pulse" aria-hidden="true" />
            <ShieldAlert className="icon" aria-hidden="true" />
            <span>{SAMPLE_LABEL}</span>
          </p>
          <h1 id="page-title" className="h1">
            Threat Radar
          </h1>
          <p className="lead">
            Common job-scam patterns, shown with made-up examples. These are not real reports and are not live data.
          </p>
        </div>
        <div className="hero-side">
          <Button variant="danger" className="glow-red" onClick={() => setReporting(true)}>
            <Plus className="icon" aria-hidden="true" />
            Add a report
          </Button>
        </div>
      </section>

      <Card className="stack-sm">
        <div className="filter-row">
          <div className="search-wrap">
            <Search className="icon" aria-hidden="true" />
            <label htmlFor="radar-search" className="visually-hidden">
              Search the reports
            </label>
            <input
              id="radar-search"
              type="search"
              placeholder="Search by words or emirate"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="tabs" role="group" aria-label="Filter by type">
          {[ALL, ...THREAT_TYPES].map((option) => (
            <button key={option} type="button" className="tab" aria-pressed={type === option} onClick={() => setType(option)}>
              {option}
            </button>
          ))}
        </div>
      </Card>

      {local.length > 0 && (
        <section className="stack-sm" aria-labelledby="mine-heading">
          <h2 id="mine-heading" className="h2">
            Your reports (this tab only, not sent anywhere)
          </h2>
          {mine.length === 0 ? (
            <p className="muted">None of your reports match.</p>
          ) : (
            <ul className="grid grid-2">
              {mine.map((entry) => (
                <EntryCard key={entry.id} entry={entry} label="Your report" />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="stack-sm" aria-labelledby="samples-heading">
        <h2 id="samples-heading" className="h2">
          {SAMPLE_LABEL}
        </h2>
        {samples.length === 0 ? (
          <p className="muted">No sample report matches.</p>
        ) : (
          <ul className="grid grid-2">
            {samples.map((entry) => (
              <EntryCard key={entry.id} entry={entry} label="Demo data" />
            ))}
          </ul>
        )}
      </section>

      {reporting && <ReportModal initial={{}} onClose={() => setReporting(false)} />}
    </div>
  );
}
