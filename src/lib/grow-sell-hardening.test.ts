import test from"node:test";import assert from"node:assert/strict";
import{demoBusiness,largeDemoBusiness}from"./demo.ts";
import{generateReport}from"./planner.ts";
import{growthPortfolio,growthReadiness,growthStressTest,growthScorecard}from"./growth-intelligence.ts";
import{emptyExitPlan}from"./exit-readiness.ts";
import{marketReadinessGate,offerQuality,compareOffers,sellScore,normalizedEarningsQuality}from"./sell-intelligence.ts";
import type{GrowthPlan,OperatingSnapshot}from"./growth-engine.ts";
const saved=(data:typeof demoBusiness)=>({data,report:generateReport(data)});
const op:OperatingSnapshot={customers:120,products:20,sales30:85000,sales90:240000,pipeline:90000,lowStock:0,activeJobs:6,openTasks:5,averageCatalogueMargin:42,lowMarginItems:0,quoteCount:20,acceptedQuotes:9,pipelineConversionPercent:45};
test("Grow blocks fragile scaling and scores healthy scaling higher",()=>{
 const fragile:GrowthPlan={annualRevenueTarget:700000,targetOperatingMargin:18,targetMonthlyOwnerIncome:0,targetCashBufferMonths:3,targetDate:"",strategy:"",capacityUtilisationPercent:95,ownerHoursPerWeek:60,monthlyGrowthBudget:12000,largestCustomerPercent:50,initiatives:[]};
 const strong:GrowthPlan={annualRevenueTarget:90000000,targetOperatingMargin:30,targetMonthlyOwnerIncome:0,targetCashBufferMonths:3,targetDate:"",strategy:"",capacityUtilisationPercent:65,ownerHoursPerWeek:35,monthlyGrowthBudget:20000,largestCustomerPercent:12,initiatives:[]};
 const a=growthReadiness(saved(demoBusiness),fragile,op),b=growthReadiness(saved(largeDemoBusiness as typeof demoBusiness),strong,op);
 assert.equal(a.band,"repair-first");assert.ok(a.blockers.length>=2);assert.ok(b.score>a.score);
});
test("Grow portfolio gives deterministic scale and stop decisions",()=>{
 const plan:GrowthPlan={annualRevenueTarget:0,targetOperatingMargin:15,targetMonthlyOwnerIncome:0,targetCashBufferMonths:3,targetDate:"",strategy:"",initiatives:[
 {id:"good",name:"Referral offer",hypothesis:"",cost:1000,expectedMonthlyRevenue:5000,expectedMonthlyGrossProfit:2500,actualMonthlyRevenue:6000,actualMonthlyGrossProfit:3000,owner:"",reviewDate:"",status:"testing"},
 {id:"bad",name:"Ads",hypothesis:"",cost:3000,expectedMonthlyRevenue:9000,expectedMonthlyGrossProfit:4000,actualMonthlyRevenue:2000,actualMonthlyGrossProfit:500,owner:"",reviewDate:"",status:"testing"}]};
 const p=growthPortfolio(plan);assert.ok(p.scale.includes("good"));assert.ok(p.stop.includes("bad"));
 const stress=growthStressTest(saved(demoBusiness),{targetMonthlyRevenue:50000,grossMarginPercent:35,extraMonthlyPayroll:5000,extraMonthlyFixedCost:2000,marketingSpend:3000,conversionShockPercent:20,costInflationPercent:5});
 assert.equal(typeof stress.viable,"boolean");assert.ok(Number.isFinite(stress.breakEvenRevenue));
});
test("Sell market readiness requires transferability, data room and buyer risk",()=>{
 const plan=emptyExitPlan();plan.path="third-party-sale";plan.reportedAnnualEarnings=200000;plan.maintainableAnnualEarnings=180000;plan.ownerHoursPerWeek=20;plan.recurringRevenuePercent=60;plan.largestCustomerPercent=15;
 for(const k of Object.keys(plan.readiness) as Array<keyof typeof plan.readiness>)plan.readiness[k]=2;
 for(const k of Object.keys(plan.dataRoom))plan.dataRoom[k]=true;
 const gate=marketReadinessGate(saved(largeDemoBusiness as typeof demoBusiness),plan,op);assert.equal(gate.ready,true);assert.ok(gate.buyerRisk.score>=80);
 const weak={...plan,ownerHoursPerWeek:65,largestCustomerPercent:55,dataRoom:Object.fromEntries(Object.keys(plan.dataRoom).map(k=>[k,false]))};
 assert.equal(marketReadinessGate(saved(demoBusiness),weak,op).ready,false);
});
test("Sell ranks cleaner cash structure above risky headline and verifies normalisations",()=>{
 const cash={id:"cash",buyer:"Buyer A",headlinePrice:500000,cashAtCompletion:500000,deferredOrEarnout:0,structure:"cash" as const,conditions:"",expiryDate:"",status:"received" as const};
 const risky={id:"risk",buyer:"Buyer B",headlinePrice:650000,cashAtCompletion:250000,deferredOrEarnout:400000,structure:"earnout" as const,conditions:"Revenue targets and retention",expiryDate:"",status:"received" as const};
 assert.ok(offerQuality(cash).qualityScore>offerQuality(risky).qualityScore);assert.equal(compareOffers([risky,cash])[0].offer.id,"cash");
 const plan=emptyExitPlan();plan.reportedAnnualEarnings=150000;
 const q=normalizedEarningsQuality(plan,[{label:"Owner wage",amount:30000,type:"owner-addback",evidence:"Payroll",verified:true},{label:"One-off legal",amount:20000,type:"one-off-addback",evidence:"Owner estimate",verified:false}]);
 assert.equal(q.safeForBuyerPack,false);assert.equal(q.normalized,180000);
});
test("Grow and Sell produce bounded decision scores",()=>{
 const plan:GrowthPlan={annualRevenueTarget:90000000,targetOperatingMargin:30,targetMonthlyOwnerIncome:0,targetCashBufferMonths:3,targetDate:"",strategy:"",capacityUtilisationPercent:60,ownerHoursPerWeek:35,monthlyGrowthBudget:10000,largestCustomerPercent:10,initiatives:[]};
 const g=growthScorecard(saved(largeDemoBusiness as typeof demoBusiness),plan,op);assert.ok(g.score>=0&&g.score<=100);
 const exit=emptyExitPlan();const s=sellScore(saved(demoBusiness),exit,op);assert.ok(s.score>=0&&s.score<=100);
});
