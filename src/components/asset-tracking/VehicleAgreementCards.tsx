"use client";

import { Download, ExternalLink, FileSignature, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatusDot } from "@/components/ui/StatusIndicator";
import {
  AGREEMENT_LABELS,
  AGREEMENT_SHORT_LABELS,
  formatLocalDate,
  formatLocalTime,
  formatUtc,
  type Agreement,
  type VehicleAgreements,
} from "@/lib/mock/vehicle-agreements";
import { AGREEMENT_DOT } from "./AgreementStatus";
import { agreementPdfUrl, downloadAgreementPdf } from "./agreement-pdf";

/**
 * Long values (an email, an ID) wrap onto a second line rather than truncate.
 * `anywhere`, not `break-word`, so a value with no spaces can still shrink to
 * fit the row instead of pushing past the card.
 */
export const WRAP = "[overflow-wrap:anywhere]";

/** The detail page's left-panel card: white, slate-200 border, rounded-xl. */
export const PANEL_CARD = "bg-white border border-slate-200 rounded-xl";

/** Card header, as the vehicle details card's "Bike #VIN" header. */
function CardHead({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="px-5 pt-5 pb-3 border-b border-slate-100">
      <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </h2>
    </div>
  );
}

/** Same as the detail page's InfoRow; a long value wraps onto a second line. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-28">{label}</span>
      <span className={`min-w-0 text-sm text-slate-700 text-right ${WRAP}`}>{children}</span>
    </div>
  );
}

const Dash = () => <span className="text-slate-300">–</span>;

/**
 * The customer attached to the vehicle. Name and phone are read from the
 * vehicle itself, as the list and this page always showed them, so a vehicle
 * with only a phone still shows it. The mock adds customer no., email and type
 * for named customers; without one those rows show a dash.
 */
export function CustomerCard({
  vehicle,
  record,
}: {
  vehicle: { customerName: string; customerPhone: string };
  record: VehicleAgreements;
}) {
  const c = record.customer;
  const attached = !!(vehicle.customerName || vehicle.customerPhone);
  return (
    <section aria-labelledby="customer-card-title" className={PANEL_CARD}>
      <CardHead id="customer-card-title" icon={<User className="w-4 h-4 text-slate-400" aria-hidden />} title="Customer" />
      {attached ? (
        <div className="px-5 py-2">
          <Row label="Customer no.">
            {c ? <CopyButton value={c.customerNo} label="customer number" onWhite /> : <Dash />}
          </Row>
          <Row label="Name">{vehicle.customerName || <Dash />}</Row>
          <Row label="Phone">
            {vehicle.customerPhone ? <CopyButton value={vehicle.customerPhone} label="customer phone" onWhite /> : <Dash />}
          </Row>
          <Row label="Email">
            {c?.email ? (
              <CopyButton value={c.email} label="customer email" onWhite className={`whitespace-normal ${WRAP}`} />
            ) : <Dash />}
          </Row>
          <Row label="Customer type">{c ? c.type : <Dash />}</Row>
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-slate-400">No customer attached</p>
      )}
    </section>
  );
}

/** A status: its dot and word, in primary text ("Not required" muted). The word always names the status. */
function StatusValue({ a }: { a: Agreement }) {
  const muted = a.status === "Not required";
  return (
    <span className={`inline-flex items-center gap-1.5 ${muted ? "text-slate-400" : "text-slate-700"}`}>
      <StatusDot dot={AGREEMENT_DOT[a.status]} />
      {a.status}
    </span>
  );
}

/**
 * View and Download: the shared Button, small outline, 28px tall, icon left
 * of the label. The ring is the cards' teal one, on keyboard focus only.
 */
const ROW_BUTTON =
  "h-7 py-0 px-2.5 gap-1.5 focus:ring-0 focus:ring-offset-0 " +
  "focus-visible:ring-2 focus-visible:ring-zeno-teal/40 focus-visible:ring-offset-1";

/**
 * The current attachment's agreements, one three-line row each: name and
 * status, the details, then (signed only) the actions. Read-only: a signed agreement can be viewed
 * (its PDF in a new tab) or downloaded; pending and not-required rows have no actions.
 */
export function AgreementsCard({
  record,
  vin,
}: {
  record: VehicleAgreements;
  vin: string;
}) {
  let body: React.ReactNode;
  if (!record.customer) {
    body = <p className="px-5 py-4 text-sm text-slate-400">No customer, so no agreements are needed.</p>;
  } else if (record.agreements.length === 0) {
    body = (
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-slate-700">No signing request for this customer.</p>
        <p className="mt-1 text-xs text-slate-500">
          They may have been attached before launch and not included in the backlog list. Ask sales ops to add them.
        </p>
      </div>
    );
  } else {
    body = (
      <ul className="px-5 py-1">
        {record.agreements.map((a) => {
          const name = AGREEMENT_LABELS[a.type];
          return (
            <li
              key={a.type}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-4 border-b border-slate-100 last:border-0"
            >
              {/* Left: name, details and actions. The details wrap here, never under the status. */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700" title={name}>
                  <span aria-hidden>{AGREEMENT_SHORT_LABELS[a.type]}</span>
                  <span className="sr-only">{name}</span>
                </p>

                {/* Line 2: when it was signed, the request, or why it isn't needed. */}
                <p className="mt-1 text-[13px] text-slate-400">
                  {a.status === "Signed" && a.signedAt ? (
                    <time dateTime={a.signedAt} title={formatUtc(a.signedAt)} className="tabular-nums">
                      {formatLocalDate(a.signedAt)}, {formatLocalTime(a.signedAt)}
                    </time>
                  ) : a.status === "Pending" ? (
                    <>
                      Requested{" "}
                      {a.requestedAt && (
                        <time dateTime={a.requestedAt} title={formatUtc(a.requestedAt)} className="tabular-nums">
                          {formatLocalDate(a.requestedAt)}
                        </time>
                      )}
                      {a.trigger && <> · {a.trigger}</>}
                    </>
                  ) : (
                    a.notRequiredReason
                  )}
                </p>

                {/* Line 3, signed only: the actions. */}
                {a.status === "Signed" && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={ROW_BUTTON}
                      onClick={() => window.open(agreementPdfUrl(a), "_blank", "noopener,noreferrer")}
                      aria-label={`View ${name} PDF, opens in a new tab`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={ROW_BUTTON}
                      onClick={() => downloadAgreementPdf(vin, a)}
                      aria-label={`Download ${name} PDF`}
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden />
                      Download
                    </Button>
                  </div>
                )}
              </div>

              {/* Right: the status, top-aligned with the name. */}
              <span className="self-start text-sm">
                <StatusValue a={a} />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section aria-labelledby="agreements-card-title" className={PANEL_CARD}>
      <CardHead id="agreements-card-title" icon={<FileSignature className="w-4 h-4 text-slate-400" aria-hidden />} title="Agreements" />
      {body}
    </section>
  );
}
