"use client";

import { useSyncExternalStore } from "react";

// Reports a person writes in the Report modal. No network call and no storage: they live in this
// browser tab's memory only, are shown on the Threat Radar under "Your reports (this tab only, not
// sent anywhere)", and are gone after a reload. Offer Check does not report anything to anyone.

export type LocalReport = {
  id: string;
  title: string;
  type: string;
  region: string;
  description: string;
  warningQuote: string;
};

let reports: readonly LocalReport[] = [];
const listeners = new Set<() => void>();

export function addLocalReport(report: Omit<LocalReport, "id">) {
  reports = [{ ...report, id: `local-${reports.length + 1}` }, ...reports];
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const none: readonly LocalReport[] = [];

export function useLocalReports(): readonly LocalReport[] {
  return useSyncExternalStore(
    subscribe,
    () => reports,
    () => none,
  );
}
