import test from"node:test";import assert from"node:assert/strict";import{atoPayg2026}from"./ato-payg-2026.ts";
test("ATO 2026 scale 2 weekly example",()=>assert.equal(atoPayg2026({gross:1333.45,frequency:"weekly",scale:2}).withholding,245));
test("ATO 2026 scale 2 monthly example",()=>assert.equal(atoPayg2026({gross:5400.33,frequency:"monthly",scale:2}).withholding,940));
test("fortnightly uses weekly equivalent then doubles",()=>assert.equal(atoPayg2026({gross:3000,frequency:"fortnightly",scale:2}).withholding,598));
test("no TFN resident scale 4 withholds 47 percent ignoring cents",()=>assert.equal(atoPayg2026({gross:1000.99,frequency:"weekly",scale:4,resident:true}).withholding,470));
