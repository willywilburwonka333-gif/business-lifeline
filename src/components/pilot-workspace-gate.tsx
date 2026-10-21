"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, reload, type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import type { PilotEntitlement } from "@/lib/pilot-access";
import { BusinessLifelineApp } from "@/components/business-lifeline-app";
import { PilotPublicLanding } from "@/components/pilot-public-landing";
import { PublicBusinessDemo } from "@/components/public-business-demo";
import { PilotAdministration } from "@/components/pilot-administration";
import { BetaSafetyCentre } from "@/components/beta-safety-centre";
import { BusinessOsScrollAssist } from "@/components/business-os-scroll-assist";
import { CommercialCloudBridge } from "@/components/commercial-cloud-bridge";
import { OperatingLedgerSync } from "@/components/operating-ledger-sync";
import { StructuredCoreRecordSync } from "@/components/structured-core-record-sync";
import { SharedPlatformShell } from "@/components/shared-platform-shell";
import { NativeBooksMriSync } from "@/components/native-books-mri-sync";
import { TeamWorkspaceManager } from "@/components/team-workspace-manager";

function FullPlatformServices() {
  return <><CommercialCloudBridge /><OperatingLedgerSync /><NativeBooksMriSync /><TeamWorkspaceManager /><StructuredCoreRecordSync /><SharedPlatformShell /><BusinessOsScrollAssist /></>;
}

export function PilotWorkspaceGate() {
  const [user, setUser] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  const [status, setStatus] = useState<PilotEntitlement | null>(null);
  const [checking, setChecking] = useState(Boolean(firebaseAuth?.currentUser));
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!firebaseAuth) { setChecking(false); return; }
    return onAuthStateChanged(firebaseAuth, next => { setUser(next); setStatus(null); setChecking(Boolean(next)); setError(""); });
  }, []);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let live = true;
    setChecking(true);
    void user.getIdToken().then(token => fetch("/api/pilot/access", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    })).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pilot access cannot be verified.");
      if (live) { setStatus(data as PilotEntitlement); setError(""); }
    }).catch(cause => { if (live) { setError(cause instanceof Error ? cause.message : "Pilot verification failed."); setStatus(null); } })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, [user, retry]);

  if (!user) return <PilotPublicLanding />;
  if (checking || !status) return <main className="cloud-auth-loading" role="status">{checking ? "Checking your account permissions…" : error || "Access temporarily unavailable."}<button type="button" className="button ghost" onClick={() => setRetry(n => n + 1)}>Retry</button></main>;
  if (!status.isStudioOwner && !status.emailVerified) return <main className="cloud-auth-loading"><h1>Verify your email to start your pilot.</h1><p>Open the verification link sent during registration. Use Account above to resend it if necessary.</p><button type="button" className="button primary" onClick={() => void reload(user).then(() => user.getIdToken(true)).then(() => { setRetry(n => n + 1); })}>I have verified my email</button></main>;

  if (status.tier === "public") return <PublicBusinessDemo showBackLink />;
  const full = status.tier === "full";
  return <>
    {full && <FullPlatformServices />}
    <BusinessLifelineApp pilotMode={!full} />
    {status.isStudioOwner && <><PilotAdministration /></>}
    <BetaSafetyCentre />
  </>;
}
