import { BusinessLifelineApp } from "@/components/business-lifeline-app";
import { FirebaseWorkspace } from "@/components/firebase-workspace";
import { LegalFooter } from "@/components/legal-footer";

export default function Home() {
  return (
    <FirebaseWorkspace>
      <div id="main-content" tabIndex={-1}>
        <BusinessLifelineApp />
        <LegalFooter />
      </div>
    </FirebaseWorkspace>
  );
}
