import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string, encoding: BufferEncoding) {
  const leftBuffer = Buffer.from(left, encoding);
  const rightBuffer = Buffer.from(right, encoding);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeSignature(input: {
  payload: string;
  signatureHeader: string | null;
  secret?: string;
  toleranceSeconds?: number;
}) {
  if (!input.secret || !input.signatureHeader) {
    return false;
  }

  const parts = Object.fromEntries(
    input.signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value];
    }),
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) {
    return false;
  }

  const tolerance = input.toleranceSeconds ?? 300;
  if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) {
    return false;
  }

  const expected = createHmac("sha256", input.secret).update(`${timestamp}.${input.payload}`).digest("hex");
  return safeEqual(expected, signature, "hex");
}

function clerkSigningSecret(secret: string) {
  return secret.startsWith("whsec_") ? Buffer.from(secret.slice("whsec_".length), "base64") : Buffer.from(secret);
}

export function verifyClerkSignature(input: {
  payload: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret?: string;
  toleranceSeconds?: number;
}) {
  if (!input.secret || !input.svixId || !input.svixTimestamp || !input.svixSignature) {
    return false;
  }

  const timestamp = Number(input.svixTimestamp);
  const tolerance = input.toleranceSeconds ?? 300;
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > tolerance) {
    return false;
  }

  const signedPayload = `${input.svixId}.${input.svixTimestamp}.${input.payload}`;
  const expected = createHmac("sha256", clerkSigningSecret(input.secret)).update(signedPayload).digest("base64");
  const signatures = input.svixSignature
    .split(" ")
    .flatMap((part) => part.split(","))
    .map((part) => part.trim().replace(/^v1,/, ""))
    .filter(Boolean);

  return signatures.some((signature) => safeEqual(expected, signature, "base64"));
}
