import type{DealOffer,ExitPlan,DiligenceIssue}from"./exit-readiness.ts";import type{SavedReport}from"./saved-report.ts";import type{OperatingSnapshot}from"./growth-engine.ts";
export type NormalisationEvidence={label:string;amount:number;type:"owner-addback"|"one-off-addback"|"replacement-cost"|"other";evidence:string;verified:boolean};
export function normalizedEarningsQuality(plan:ExitPlan,evidence:NormalisationEvidence[]){
 const reported=Math.max(0,plan.reportedAnnualEarnings??0);const verified=evidence.filter(x=>x.verified),unverified=evidence.filter(x=>!x.verified);
 const adjustment=verified.reduce((n,x)=>n+(x.type==="replacement-cost"?-Math.abs(x.amount):Math.abs(x.amount)),0);
 const normalized=Math.max(0,reported+adjustment);
 const confidence=evidence.length?Math.round(verified.length/evidence.length*100):reported>0?50:0;
 return{reported,normalized,confidence,verifiedAdjustments:verified.length,unverifiedAdjustments:unverified.length,unverifiedLabels:unverified.map(x=>x.label),safeForBuyerPack:confidence>=80&&unverified.length===0};
}
export function offerQuality(offer:DealOffer){
 const headline=Math.max(0,offer.headlinePrice),cash=Math.max(0,offer.cashAtCompletion),deferred=Math.max(0,offer.deferredOrEarnout);
 const cashRatio=headline>0?Math.min(1,cash/headline):0,deferredRatio=headline>0?Math.min(1,deferred/headline):0;
 let structureRisk=offer.structure==="cash"?5:offer.structure==="mixed"?20:offer.structure==="earnout"?35:offer.structure==="vendor-finance"?40:30;
 if(offer.conditions.trim())structureRisk+=10;if(deferredRatio>.4)structureRisk+=15;
 const qualityScore=Math.max(0,Math.min(100,Math.round(cashRatio*70+(1-deferredRatio)*20+10-structureRisk*.35)));
 return{qualityScore,cashRatio,deferredRatio,structureRisk,headline,cash,deferred};
}
export function compareOffers(offers:DealOffer[]){
 return offers.filter(x=>!["declined","withdrawn"].includes(x.status)).map(o=>({offer:o,...offerQuality(o)})).sort((a,b)=>b.qualityScore-a.qualityScore||b.cash-a.cash||b.headline-a.headline);
}
export function buyerRiskScore(saved:SavedReport,plan:ExitPlan,operating?:OperatingSnapshot,issues:DiligenceIssue[]=plan.diligenceIssues??[]){
 let score=100;const risks:string[]=[];
 const deduct=(points:number,reason:string)=>{score-=points;risks.push(reason)};
 if(saved.report.metrics.overallScore<70)deduct(15,"Business health remains below 70.");
 if(saved.data.overdueTax>0)deduct(15,"Overdue tax is unresolved.");
 if(saved.data.overdueSuppliers>0)deduct(8,"Supplier arrears are unresolved.");
 if(plan.ownerHoursPerWeek>45)deduct(12,"Owner dependence remains high.");
 if(plan.largestCustomerPercent>=40)deduct(12,"Customer concentration is at least 40%.");
 else if(plan.largestCustomerPercent>=25)deduct(6,"Customer concentration is material.");
 if(plan.recurringRevenuePercent<20)deduct(8,"Recurring/repeat revenue is low.");
 if(operating&&operating.openTasks>20)deduct(5,"Operating backlog is high.");
 const high=issues.filter(x=>x.status!=="resolved"&&x.severity==="high").length,medium=issues.filter(x=>x.status!=="resolved"&&x.severity==="medium").length;
 if(high)deduct(Math.min(20,high*6),`${high} high-severity diligence issue(s) remain open.`);
 if(medium)deduct(Math.min(10,medium*2),`${medium} medium-severity diligence issue(s) remain open.`);
 return{score:Math.max(0,Math.round(score)),band:score>=80?"low-risk":score>=60?"moderate-risk":"high-risk",risks};
}
export function marketReadinessGate(saved:SavedReport,plan:ExitPlan,operating?:OperatingSnapshot){
 const readinessValues=Object.values(plan.readiness).map(Number),readiness=Math.round(readinessValues.reduce((n,x)=>n+x,0)/Math.max(1,readinessValues.length*2)*100);
 const room=Object.values(plan.dataRoom),dataRoom=Math.round(room.filter(Boolean).length/Math.max(1,room.length)*100);
 const buyerRisk=buyerRiskScore(saved,plan,operating);
 const earnings=plan.maintainableAnnualEarnings>0||((plan.reportedAnnualEarnings??0)>0);
 const blockers:string[]=[];if(readiness<75)blockers.push("Transferability readiness is below 75%.");if(dataRoom<80)blockers.push("Data room readiness is below 80%.");if(buyerRisk.score<70)blockers.push("Buyer-risk score is below 70.");if(!earnings)blockers.push("Maintainable earnings have not been established.");if(plan.path==="undecided")blockers.push("Exit path is not selected.");
 return{ready:blockers.length===0,readiness,dataRoom,buyerRisk,blockers};
}
export function sellScore(saved:SavedReport,plan:ExitPlan,operating?:OperatingSnapshot){
 const gate=marketReadinessGate(saved,plan,operating),offers=compareOffers(plan.offers??[]);
 const score=Math.round(gate.readiness*.35+gate.dataRoom*.25+gate.buyerRisk.score*.35+(gate.ready?5:0));
 return{score:Math.max(0,Math.min(100,score)),gate,offers,bestOffer:offers[0]??null};
}
