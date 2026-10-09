import { firebaseAuth } from "@/lib/firebase-client";

// The Firebase ID token is required for optional provider-backed AI.
// Never send business documents to the AI endpoint when signed out.
export async function authenticatedAiHeaders(): Promise<{ Authorization: string }> {
  const owner = firebaseAuth?.currentUser;
  if (!owner) throw new Error("Sign in before using AI features. The rules-based MRI still works offline.");
  return { Authorization: `Bearer ${await owner.getIdToken()}` };
}
