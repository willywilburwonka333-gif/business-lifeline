"use client";
import { LifelineOperationsWorkspace } from "@/components/lifeline-operations-workspace";
import { LifelinePos } from "@/components/lifeline-pos";
import { DocumentVaultMigrationCentre } from "@/components/document-vault-migration-centre";
export function BusinessOperatingPlatform(){return <div className="business-operating-stack"><LifelineOperationsWorkspace/><LifelinePos/><DocumentVaultMigrationCentre/></div>}