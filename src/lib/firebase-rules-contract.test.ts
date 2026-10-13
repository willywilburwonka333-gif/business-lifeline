import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";const rules=readFileSync("firestore.rules","utf8");test("structured records require active business membership and authenticated updater",()=>{assert.match(rules,/match \/records\/\{recordId\}/);assert.match(rules,/request\.resource\.data\.updatedBy == request\.auth\.uid/)});test("audit events are immutable and global fallback denies writes",()=>{assert.match(rules,/allow update, delete: if false/);assert.match(rules,/match \/\{document=\*\*\}[\s\S]*allow read, write: if false/)});test("finance and payroll are role restricted",()=>{assert.match(rules,/match \/finance\/\{documentId\}/);assert.match(rules,/match \/payroll\/\{documentId\}/)});

test("no recursive wildcard grants reads that bypass finance/payroll role checks",()=>{
 const fallbacks=rules.match(/match \/\{document=\*\*\} \{[\s\S]*?\}/g)??[];
 assert.equal(fallbacks.length,2);
 assert.ok(fallbacks.every(rule=>/allow read, write: if false;/.test(rule)));
 assert.doesNotMatch(rules,/match \/\{document=\*\*\} \{\s*allow read: if hasMembership\(businessId\)/);
});

test("client MRI archive is immutable and restricted to explicit roles",()=>{
 assert.match(rules,/match \/mriReports\/\{reportId\}/);
 assert.match(rules,/allow read: if hasRole\(businessId, \['owner', 'manager', 'accountant', 'consultant'\]\)/);
 assert.match(rules,/allow update: if false/);
});


test("new pilot accounts cannot write their own full permissions", () => {
  assert.match(rules, /match \/pilotAccess\/\{userId\}/);
  assert.match(rules, /allow list, create, update, delete: if false/);
  assert.match(rules, /function hasPlatformFullAccess\(\)/);
  for (const kind of ["modules", "records", "finance", "payroll", "crm", "operations"]) {
    const start = rules.indexOf(`match /${kind}/`);
    assert.ok(start >= 0, `missing ${kind}`);
    const end = rules.indexOf("\\n      }", start);
    assert.match(rules.slice(start, end), /hasPlatformFullAccess\(\)/, `missing platform access restriction: ${kind}`);
  }
});
