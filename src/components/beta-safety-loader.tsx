"use client";
import dynamic from "next/dynamic";
const BetaSafetyCentre = dynamic(() => import("./beta-safety-centre").then(m => m.BetaSafetyCentre), { ssr: false });
export function BetaSafetyLoader(){ return <BetaSafetyCentre />; }
