import { BusinessLifelineApp } from "@/components/business-lifeline-app";
import { LegalFooter } from "@/components/legal-footer";

export default function Home() {
  return (
    <div id="main-content" tabIndex={-1}>
      <BusinessLifelineApp />
      <LegalFooter />
    </div>
  );
}
