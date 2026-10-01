import assert from "node:assert/strict";
import { accountDedupeKey, contactDedupeKey, createEmptyCrmStore, dueTasks, moveOpportunity, pipelineForecast, validateImportRow } from "./lifeline-crm";

const store = createEmptyCrmStore();
assert.equal(store.pipelines[0].stages.length, 6);
assert.equal(contactDedupeKey({ firstName:"A", lastName:"B", email:" TEST@EXAMPLE.COM ", phone:"" }), "test@example.com");
assert.equal(accountDedupeKey({ name:"Acme", domain:" ACME.COM " }), "acme.com");

store.accounts.push({ id:"a1", name:"Acme", type:"prospect", tags:[], customFields:{}, createdAt:"2026-01-01", updatedAt:"2026-01-01" });
store.opportunities.push({ id:"o1", accountId:"a1", pipelineId:"sales-default", stageId:"proposal", title:"Project", value:10000, createdAt:"2026-01-01", updatedAt:"2026-01-01" });
assert.deepEqual(pipelineForecast(store), { gross:10000, weighted:5500, won:0 });
const moved = moveOpportunity(store, "o1", "won", "2026-01-02");
assert.equal(moved.opportunities[0].stageId, "won");
assert.deepEqual(pipelineForecast(moved), { gross:10000, weighted:10000, won:10000 });

store.tasks.push({ id:"t1", accountId:"a1", title:"Call", dueAt:"2026-01-01", priority:"high", status:"open", createdAt:"2025-12-01" });
assert.equal(dueTasks(store, "2026-01-02").length, 1);
assert.equal(validateImportRow({ email:"bad" }).length, 1);
assert.equal(validateImportRow({ accountName:"Acme" }).length, 0);
console.log("lifeline-crm tests passed");
