import assert from "node:assert/strict";
import test from "node:test";
import { patientLinkOtp } from "./patient-link-otp";

const patientId = "20000000-0000-4000-8000-000000000001";
const secret = "a-test-secret-that-is-long-enough-for-hmac";

test("Patient link OTP is a stable six-digit value", () => {
  const otp = patientLinkOtp(patientId, "provider-1:request-1", secret);

  assert.match(otp, /^\d{6}$/);
  assert.equal(otp, patientLinkOtp(patientId, "provider-1:request-1", secret));
});

test("Patient link OTP changes for a new administration request", () => {
  assert.notEqual(
    patientLinkOtp(patientId, "provider-1:request-1", secret),
    patientLinkOtp(patientId, "provider-1:request-2", secret),
  );
});
