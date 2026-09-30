"use client";

import { ConnectedOperationsV2 } from "@/components/connected-operations-v2";
import { DocumentVaultMigrationCentre } from "@/components/document-vault-migration-centre";

export function BusinessOperatingPlatform() {
  return <div className="business-operating-stack">
    <ConnectedOperationsV2 />
    <DocumentVaultMigrationCentre />
  </div>;
}
