// Encode untrusted client-entered text before interpolating into printable HTML.
// The print windows inherit the application's origin; escaping is mandatory.
export function escapePrintHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] ?? char));
}
