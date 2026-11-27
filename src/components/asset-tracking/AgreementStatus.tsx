import { StatusLabel } from "@/components/ui/StatusIndicator";
import type { AgreementStatus, AgreementSummary, OverallAgreementStatus } from "@/lib/mock/vehicle-agreements";

/**
 * Agreement statuses as dot + text, from the existing status tokens: green is
 * done, orange is waiting on the customer, red is a gap to fix. The text always
 * says the status, so colour is never the only signal.
 */
export const OVERALL_DOT: Record<Exclude<OverallAgreementStatus, "No customer">, string> = {
  Complete: "bg-status-online",
  Pending: "bg-status-gps",
  Missing: "bg-status-offline",
};

/** "Not required" takes the grey "no signal" dot, with its text muted. */
export const AGREEMENT_DOT: Record<AgreementStatus, string> = {
  Signed: "bg-status-online",
  Pending: "bg-status-gps",
  "Not required": "bg-status-idle",
};

/** The overall status, or "No customer" muted with no dot. */
export function OverallAgreementLabel({ summary }: { summary: AgreementSummary }) {
  if (summary.status === "No customer") return <span className="text-slate-400">No customer</span>;
  return <StatusLabel dot={OVERALL_DOT[summary.status]}>{summary.status}</StatusLabel>;
}

/** The list's Agreements cell: the overall status only. */
export function AgreementsCellContent({ summary }: { summary: AgreementSummary }) {
  return <OverallAgreementLabel summary={summary} />;
}
