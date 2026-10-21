import type { Metadata } from "next";
import { PublicBusinessDemo } from "@/components/public-business-demo";
import { LegalFooter } from "@/components/legal-footer";

export const metadata: Metadata = {
  title: "Try the Business Lifeline Demo",
  description: "Try an interactive, read-only Business MRI and recovery demonstration using three fictional Australian businesses. No login, confidential information or payment needed.",
};
export default function DemoPage() {
  return <><PublicBusinessDemo /><LegalFooter /></>;
}
