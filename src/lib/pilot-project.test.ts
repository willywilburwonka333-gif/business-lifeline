import assert from "node:assert/strict";
import test from "node:test";
import { normalizePilotEmail, isCreatorUser, makeInvite, validInvite,
  pilotPaymentAccess, publicPilot, sanitizeReport, type Pilot } from "./pilot-project";

test("pilot client email requires a valid, normalised email", () => {
  assert.equal(normalizePilotEmail("  Owner@Example.com "), "owner@example.com");
  for(const value of ["", "missing-at-sign", "owner@example", "owner@example.com invalid", null, 123])
    assert.equal(normalizePilotEmail(value), null);
});
test("creator role requires a VERIFIED account email and optional matching UID", () => {
  const oldEmail = process.env.BUSINESS_LIFELINE_CREATOR_EMAIL;
  const oldUid = process.env.BUSINESS_LIFELINE_CREATOR_UID;
  const oldOwner = process.env.BUSINESS_LIFELINE_OWNER_UID;
  delete process.env.BUSINESS_LIFELINE_OWNER_UID;
  try {
    process.env.BUSINESS_LIFELINE_CREATOR_EMAIL="creator@example.com";
    process.env.BUSINESS_LIFELINE_CREATOR_UID="original-creator";
    assert.equal(isCreatorUser({ uid:"original-creator",email:"creator@example.com",email_verified:true }), true);
    assert.equal(isCreatorUser({ uid:"attacker",email:"creator@example.com",email_verified:true }), false);
    assert.equal(isCreatorUser({ uid:"original-creator",email:"creator@example.com",email_verified:false }), false);
    assert.equal(isCreatorUser({ uid:"original-creator",email:"other@example.com",email_verified:true }), false);
    delete process.env.BUSINESS_LIFELINE_CREATOR_EMAIL;
    assert.equal(isCreatorUser({ uid:"original-creator",email:"creator@example.com",email_verified:true }), true);
    delete process.env.BUSINESS_LIFELINE_CREATOR_UID;
    assert.equal(isCreatorUser({ uid:"original-creator",email:"creator@example.com",email_verified:true }), false);
    process.env.BUSINESS_LIFELINE_OWNER_UID="original-creator";
    assert.equal(isCreatorUser({ uid:"original-creator",email:"creator@example.com",email_verified:true }), true);
    assert.equal(isCreatorUser({ uid:"attacker",email:"creator@example.com",email_verified:true }), false);
  } finally {
    if(oldEmail===undefined) delete process.env.BUSINESS_LIFELINE_CREATOR_EMAIL; else process.env.BUSINESS_LIFELINE_CREATOR_EMAIL=oldEmail;
    if(oldUid===undefined) delete process.env.BUSINESS_LIFELINE_CREATOR_UID; else process.env.BUSINESS_LIFELINE_CREATOR_UID=oldUid;
    if(oldOwner===undefined) delete process.env.BUSINESS_LIFELINE_OWNER_UID; else process.env.BUSINESS_LIFELINE_OWNER_UID=oldOwner;
  }
});
test("invite token must be cryptographically valid, no deterministic PIN",()=>{
  const one=makeInvite(); const two=makeInvite();
  assert.notEqual(one.code,two.code);
  assert.equal(one.code.length,64);
  assert.equal(validInvite(one.code,one.hash),true);
  assert.equal(validInvite(two.code,one.hash),false);
  assert.equal(validInvite(one.code+"0",one.hash),false);
  assert.equal(validInvite(null,one.hash),false);
});
test("paid and free pilot services require consent and ACTIVE pilot stage",()=>{
  const base={status:"active" as const,consentAt:"2026-10-14T00:00:00Z",paymentStatus:"paid" as const};
  assert.equal(pilotPaymentAccess(base),true);
  assert.equal(pilotPaymentAccess({...base,paymentStatus:"waived"}),true);
  assert.equal(pilotPaymentAccess({...base,paymentStatus:"pending"}),false);
  assert.equal(pilotPaymentAccess({...base,status:"completed"}),false);
  assert.equal(pilotPaymentAccess({...base,consentAt:null}),false);
});
test("pilot API never returns an invitation hash",()=>{
  const pilot = {id:"test",inviteHash:"supersecret",clientEmail:"client@example.com"} as Pilot;
  const output = publicPilot(pilot);
  assert.equal("inviteHash" in output,false);
  assert.equal(output.clientEmail,"client@example.com");
});
test("pilot report sharing only accepts bounded, finite screening summaries",()=>{
  const sample = {businessName:"Small Cafe",overallScore:67,dataConfidence:42,pressureLevel:"Watch",topActions:["Check cash"],warnings:["Figures unverified"]};
  assert.deepEqual(sanitizeReport(sample),sample);
  assert.equal(sanitizeReport({...sample,overallScore:NaN}),null);
  assert.equal(sanitizeReport({...sample,pressureLevel:"Guaranteed turnaround"}),null);
  assert.equal(sanitizeReport({...sample,warnings:["x".repeat(230)]}),null);
  assert.equal(sanitizeReport({...sample,topActions:[1]}),null);
});
