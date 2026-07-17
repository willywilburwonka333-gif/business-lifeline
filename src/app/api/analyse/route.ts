import { NextResponse } from "next/server";
import type { BusinessData, HealthMetrics } from "@/lib/types";

export const runtime = "nodejs";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["diagnosis", "rootCauses", "priorities", "questions", "professionalHelp"],
  properties: {
    diagnosis: { type: "string", minLength: 20, maxLength: 1200 },
    rootCauses: { type: