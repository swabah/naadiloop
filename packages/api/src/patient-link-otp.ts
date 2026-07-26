import { createHmac } from "node:crypto";

const OTP_MODULUS = 1_000_000;

/**
 * Derives a Patient-only six-digit consent code without storing it in
 * plaintext. The request nonce scopes it to one short-lived Provider request.
 */
export function patientLinkOtp(patientId: string, requestNonce: string, secret: string) {
  const digest = createHmac("sha256", secret)
    .update(`patient-link:${patientId}:${requestNonce}`)
    .digest();

  return (digest.readUInt32BE(0) % OTP_MODULUS).toString().padStart(6, "0");
}
