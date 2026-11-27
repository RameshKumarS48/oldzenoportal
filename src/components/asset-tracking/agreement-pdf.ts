import { toast } from "@/store/toast";
import { AGREEMENT_LABELS, type Agreement, type AgreementType } from "@/lib/mock/vehicle-agreements";

/** The sample PDF that stands in for each signed agreement (public/samples). */
const SAMPLE_PDF: Record<AgreementType, string> = {
  warranty: "/samples/user-warranty-agreement-sample.pdf",
  energy: "/samples/zeno-energy-agreement-sample.pdf",
};

/** Where a signed agreement's PDF is served from. */
export const agreementPdfUrl = (a: Agreement): string => SAMPLE_PDF[a.type];

/** "<VIN>-<agreement>-v<version>.pdf", e.g. "ME92ZPSBB1J000760-user-warranty-agreement-v2.1.pdf". */
export function agreementFileName(vin: string, a: Agreement): string {
  const slug = AGREEMENT_LABELS[a.type].toLowerCase().replace(/\s+/g, "-");
  return `${vin}-${slug}-v${a.version}.pdf`;
}

/** Saves the PDF under the agreement's file name. */
export function downloadAgreementPdf(vin: string, a: Agreement) {
  const name = agreementFileName(vin, a);
  const link = document.createElement("a");
  link.href = agreementPdfUrl(a);
  link.download = name;
  link.click();
  toast.success("PDF downloaded", name);
}
