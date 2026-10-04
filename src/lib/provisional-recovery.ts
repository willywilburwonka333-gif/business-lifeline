import type{RecoveryFinding}from"./recovery-engine.ts";import type{ReconciledField}from"./mri-reconciliation.ts";
export function provisionalRecovery(findings:RecoveryFinding[],evidence:ReconciledField[]){
 const unresolved=evidence.filter(x=>x.status==="conflict"||x.status==="stale"||x.status==="provisional");
 const keys=unresolved.map(x=>String(x.key));
 const precisionSafe=unresolved.filter(x=>x.status==="conflict").length===0&&evidence.length>0&&Math.round(evidence.reduce((n,x)=>n+x.confidence,0)/evidence.length)>=80;
 return{precisionSafe,verificationRequired:keys,findings:findings.map(f=>({...f,provisional:!precisionSafe,caution:!precisionSafe?"Validate conflicting/stale source records before relying on exact amounts or irreversible decisions.":""}))}
}
