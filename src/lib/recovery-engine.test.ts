import test from "node:test";import assert from "node:assert/strict";
import {demoBusiness} from "./demo.ts";import {generateReport} from "./planner.ts";import {diagnosticStandard} from "./business-health-standard.ts";import {buildRecoveryFindings,recoveryProgress} from "./recovery-engine.ts";
test("recovery engine traces distressed figures to actions",()=>{const d={...demoBusiness,monthlyRevenue:10000,fixedExpenses:9000,variableExpenses:5000,cashAvailable:1000,overdueTax:5000,overdueSuppliers:3000,accountsReceivable:5000,overdueInvoices:3000,revenueTrend:"declining" as const};const r=generateReport(d);const s=diagnosticStandard(d,r.metrics);const f=buildRecoveryFindings(d,r,s);assert.ok(f.some(x=>x.id==="cash-deficit"&&x.monthlyImpact!==null));assert.ok(f.some(x=>x.id==="overdue-obligations"&&x.timeframe==="today"));assert.ok(f.every(x=>x.rootCause&&x.action&&x.measure))});
test("recovery progress compares canonical BLH scores",()=>{const r=generateReport(demoBusiness);const a=diagnosticStandard(demoBusiness,r.metrics);const better={...demoBusiness,cashAvailable:demoBusiness.cashAvailable+100000,overdueTax:0,overdueSuppliers:0};const br=generateReport(better);const b=diagnosticStandard(better,br.metrics);const p=recoveryProgress(a,b);assert.equal(p.baselineScore,a.score);assert.equal(p.currentScore,b.score);assert.equal(p.delta,b.score-a.score)});

test("cash shortfall is not mislabeled as an accounting operating loss",()=>{
 const report=generateReport(demoBusiness);
 assert.ok(report.metrics.operatingMargin>0,"demonstration has a positive accounting operating margin");
 assert.ok(report.metrics.monthlyOperatingResult<0,"cash estimate is negative after owner drawings and loan repayments");
 assert.ok(report.warnings.some(w=>w.includes("cash outgoings")));
 assert.ok(!report.warnings.some(w=>/business is losing money|current operations are losing/i.test(w)));
 const standard=diagnosticStandard(demoBusiness,report.metrics);
 const findings=buildRecoveryFindings(demoBusiness,report,standard);
 const cash=findings.find(f=>f.id==="cash-deficit");
 assert.ok(cash);
 assert.match(cash.finding,/monthly cash outgoings/i);
 assert.match(cash.rootCause,/verify/i);
 assert.doesNotMatch(cash.rootCause,/definitive cause/i);
});

test("healthy businesses do not receive automatic crisis-mode freezes or restructuring",()=>{
 const data={...demoBusiness,monthlyRevenue:100000,fixedExpenses:30000,variableExpenses:30000,ownerDrawings:5000,loanRepayments:2000,cashAvailable:250000,accountsReceivable:20000,overdueInvoices:1000,totalDebt:20000,overdueTax:0,overdueSuppliers:0,revenueTrend:"growing" as const,urgentConcerns:[]};
 const report=generateReport(data);
 assert.ok(report.metrics.overallScore>=70);
 assert.ok(!report.sevenDays.some(x=>/freeze|discretionary spending/i.test(x.title)));
 assert.ok(!report.ninetyDays.some(x=>/debt-service|restructur/i.test(x.title)));
});
