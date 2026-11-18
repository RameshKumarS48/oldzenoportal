import { toast } from "@/store/toast";

/** Copies a dashboard's link to the clipboard and says so; sandbox links only work in this browser. */
export async function copyLink(path: string, name: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success("Link copied", `Anyone with access can open “${name}”.`);
  } catch {
    toast.error("Couldn’t copy the link", "Copy it from the address bar instead.");
  }
}
