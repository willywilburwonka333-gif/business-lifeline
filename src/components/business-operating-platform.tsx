"use client";

import { CommercialOperatingPlatform } from "@/components/commercial-operating-platform";
import { DocumentVaultMigrationCentre } from "@/components/document-vault-migration-centre";

export function BusinessOperatingPlatform() {
  return <div className="business-operating-stack"><CommercialOperatingPlatform /><DocumentVaultMigrationCentre /></div>;
}
