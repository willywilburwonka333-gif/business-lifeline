import { PilotWorkspaceGate } from "@/components/pilot-workspace-gate";
import { FirebaseWorkspace } from "@/components/firebase-workspace";
import { LegalFooter } from "@/components/legal-footer";

export default function Home() {
  return (
    <FirebaseWorkspace>
      <div id="main-content" tabIndex={-1}>
        <PilotWorkspaceGate />
        <LegalFooter />
      </div>
    </FirebaseWorkspace>
  );
}
