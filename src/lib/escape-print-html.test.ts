import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { escapePrintHtml } from "./escape-print-html";

test("untrusted client labels are escaped in printable documents", () => {
  assert.equal(escapePrintHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapePrintHtml("A&B's"), "A&amp;B&#39;s");
  assert.equal(escapePrintHtml(undefined), "");
});
test("all printable document templates escape customer-provided details", () => {
  const accounting=readFileSync("src/components/advanced-accounting-hub.tsx","utf8");
  const people=readFileSync("src/components/lifeline-people.tsx","utf8");
  const finance=readFileSync("src/components/commercial-finance-controls.tsx","utf8");
  const vault=readFileSync("src/components/document-vault-migration-centre.tsx","utf8");
  assert.match(accounting,/escapePrintHtml\(i.description\)/);
  assert.match(accounting,/escapePrintHtml\(d.customer\)/);
  assert.match(accounting,/escapePrintHtml\(d.notes\)/);
  assert.match(people,/escapePrintHtml\(line.employeeName\)/);
  assert.match(people,/escapePrintHtml\(person\?\.employerAbn/);
  assert.match(finance,/escapePrintHtml\(customer\)/);
  assert.match(finance,/escapePrintHtml\(item.reference\)/);
  assert.match(vault,/uri.protocol!=="https:"/);
  assert.match(vault,/noopener,noreferrer/);
});
