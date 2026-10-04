import type{GrowthInitiative,GrowthPlan,OperatingSnapshot}from"./growth-engine.ts";import type{SavedReport}from"./saved-report.ts";
export type ExperimentDecision="scale"|"continue"|"stop"|"insufficient-data";
export function initiativeEconomics(i:GrowthInitiative){
 const expectedReturn=i.cost>0?i.expectedMonthlyGrossProfit/i.cost:0,actualReturn=i.cost>0?i.actualMonthlyGrossProfit/i.cost:0;
 const revenueAttainment=i.expectedMonthlyRevenue>0?i.actualMonthlyRevenue/i.expectedMonthlyRevenue:0;
 const profitAttainment=i.expectedMonthlyGrossProfit>0?i.actualMonthlyGrossProfit/i.expectedMonthlyGrossProfit:0;
 const decision:ExperimentDecision=i.actualMonthlyRevenue<=0&&i.actualMonthlyGrossProfit<=0?"insufficient-data":actualReturn<0||profitAttainment<.5?"stop":profitAttainment>=1&&actualReturn>=.5?"scale":"continue";
 return{expectedReturn,actualReturn,revenueAttainment,profitAttainment,decision};
}
export function growthPortfolio(plan:GrowthPlan){
 const rows=plan.initiatives.map(i=>({initiative:i,...initiativeEconomics(i)}));
 const active=rows.filter(x=>!["stop","complete"].includes(x.initiative.status));
 const deployed=active.reduce((n,x)=>n+x.initiative.cost,0),actualProfit=active.reduce((n,x)=>n+x.initiative.actualMonthlyGrossProfit,0);
 return{rows,deployedCapital:deployed,actualMonthlyGrossProfit:actualProfit,portfolioReturn:deployed>0?actualProfit/deployed:0,scale:rows.filter(x=>x.decision==="scale").map(x=>x.initiative.id),stop:rows.filter(x=>x.decision==="stop").map(x=>x.initiative.id)};
}
export function growthReadiness(saved:SavedReport,plan:GrowthPlan,operating:OperatingSnapshot){
 let score=100;const blockers:string[]=[],watch:string[]=[];
 const m=saved.report.metrics;
 if(m.overallScore<70){score-=20;blockers.push("Business health is below the preferred growth threshold.");}
 if(saved.data.overdueTax>0){score-=20;blockers.push("Overdue tax should be stabilised before material growth spend.");}
 if(m.runwayMonths!==null&&m.runwayMonths<2){score-=20;blockers.push("Cash runway is below two months.");}
 if((plan.capacityUtilisationPercent??0)>=90){score-=15;blockers.push("Capacity utilisation is at least 90%.");}
 else if((plan.capacityUtilisationPercent??0)>=80){score-=8;watch.push("Capacity is becoming constrained.");}
 if((plan.ownerHoursPerWeek??0)>=55){score-=12;blockers.push("Owner capacity is structurally constrained.");}
 if((plan.largestCustomerPercent??0)>=40){score-=10;watch.push("Customer concentration increases growth fragility.");}
 if((operating.averageCatalogueMargin??0)>0&&(operating.averageCatalogueMargin??0)<20){score-=10;watch.push("Catalogue gross margin is thin.");}
 const monthlyBudget=Math.max(0,plan.monthlyGrowthBudget??0);
 const affordable=m.monthlyOperatingResult>0?Math.min(1,m.monthlyOperatingResult/Math.max(1,monthlyBudget)):0;
 if(monthlyBudget>0&&affordable<1){score-=10;watch.push("Growth budget exceeds current monthly operating surplus.");}
 return{score:Math.max(0,Math.round(score)),band:score>=80?"ready":score>=60?"caution":"repair-first",blockers,watch,affordableBudgetRatio:affordable};
}
export function growthStressTest(saved:SavedReport,input:{targetMonthlyRevenue:number;grossMarginPercent:number;extraMonthlyPayroll:number;extraMonthlyFixedCost:number;marketingSpend:number;conversionShockPercent?:number;costInflationPercent?:number}){
 const shock=Math.max(0,1-(input.conversionShockPercent??0)/100),revenue=Math.max(0,input.targetMonthlyRevenue*shock);
 const grossProfit=revenue*Math.max(0,input.grossMarginPercent)/100;
 const inflation=1+Math.max(0,input.costInflationPercent??0)/100;
 const fixed=saved.data.fixedExpenses*inflation+input.extraMonthlyFixedCost+input.extraMonthlyPayroll+input.marketingSpend;
 const result=grossProfit-fixed-saved.data.ownerDrawings-saved.data.loanRepayments;
 const breakEvenRevenue=input.grossMarginPercent>0?(fixed+saved.data.ownerDrawings+saved.data.loanRepayments)/(input.grossMarginPercent/100):Infinity;
 return{revenue,grossProfit,result,breakEvenRevenue,marginOfSafety:revenue>0?(revenue-breakEvenRevenue)/revenue:0,viable:result>0};
}
export function growthScorecard(saved:SavedReport,plan:GrowthPlan,operating:OperatingSnapshot){
 const readiness=growthReadiness(saved,plan,operating),portfolio=growthPortfolio(plan);
 const evidence=[operating.customers>0,operating.sales90>0,operating.quoteCount!==undefined,plan.capacityUtilisationPercent!==undefined,plan.monthlyGrowthBudget!==undefined,plan.initiatives.length>0];
 const evidenceScore=Math.round(evidence.filter(Boolean).length/evidence.length*100);
 const score=Math.round(readiness.score*.55+Math.min(100,evidenceScore)*.2+Math.min(100,Math.max(0,50+portfolio.portfolioReturn*50))*.25);
 return{score,readiness,evidenceScore,portfolio};
}
