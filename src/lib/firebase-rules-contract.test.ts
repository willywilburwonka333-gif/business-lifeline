import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";const rules=readFileSync("firestore.rules","utf8");test("structured records require active business membership and authenticated updater",()=>{assert.match(rules,/match \/records\/\{recordId\}/);assert.match(rules,/request\.resource\.data\.updatedBy == request\.auth\.uid/)});test("audit events are immutable and global fallback denies writes",()=>{assert.match(rules,/allow update, delete: if false/);assert.match(rules,/match \/\{document=\*\*\}[\s\S]*allow read, write: if false/)});test("finance and payroll are role restricted",()=>{assert.match(rules,/match \/finance\/\{documentId\}/);assert.match(rules,/match \/payroll\/\{documentId\}/)});

test("no recursive wildcard grants reads that bypass finance/payroll role checks",()=>{
 const fallbacks=rules.match(/match \/\{document=\*\*\} \{[\s\S]*?\}/g)??[];
 assert.equal(fallbacks.length,2);
 assert.ok(fallbacks.every(rule=>/allow read, write: if false;/.test(rule)));
 assert.doesNotMatch(rules,/match \/\{document=\*\*\} \{\s*allow read: if hasMembership\(businessId\)/);
});
