import { describe, expect, it } from "vitest";

import type { AuthTokenPayload } from "@/lib/auth-token";

import {
  DOCTOR_LOGIN_PATH,
  doctorAuthenticatedLoginRedirectTarget,
  resolveDoctorPostLoginHref,
} from "@/lib/doctor-login-redirect";

function payload(role: AuthTokenPayload["role"]): AuthTokenPayload {
  return { sub: 1, role, exp: Math.floor(Date.now() / 1000) + 3600 };
}

describe("doctorAuthenticatedLoginRedirectTarget", () => {
  it("redirects authenticated doctors away from login", () => {
    expect(
      doctorAuthenticatedLoginRedirectTarget(
        DOCTOR_LOGIN_PATH,
        payload("DOCTOR"),
        null,
      ),
    ).toBe("/doctor");
  });

  it("honours safe from query", () => {
    expect(
      doctorAuthenticatedLoginRedirectTarget(
        DOCTOR_LOGIN_PATH,
        payload("DOCTOR"),
        "/doctor/leads",
      ),
    ).toBe("/doctor/leads");
  });

  it("does not redirect other roles", () => {
    expect(
      doctorAuthenticatedLoginRedirectTarget(
        DOCTOR_LOGIN_PATH,
        payload("CUSTOMER"),
        null,
      ),
    ).toBeNull();
    expect(
      doctorAuthenticatedLoginRedirectTarget(
        DOCTOR_LOGIN_PATH,
        payload("ADMIN"),
        null,
      ),
    ).toBeNull();
    expect(
      doctorAuthenticatedLoginRedirectTarget(DOCTOR_LOGIN_PATH, null, null),
    ).toBeNull();
  });

  it("only applies on the login path", () => {
    expect(
      doctorAuthenticatedLoginRedirectTarget(
        "/doctor/apply",
        payload("DOCTOR"),
        null,
      ),
    ).toBeNull();
  });
});

describe("resolveDoctorPostLoginHref", () => {
  it("defaults to dashboard", () => {
    expect(resolveDoctorPostLoginHref(null)).toBe("/doctor");
    expect(resolveDoctorPostLoginHref("")).toBe("/doctor");
    expect(resolveDoctorPostLoginHref("//evil")).toBe("/doctor");
    expect(resolveDoctorPostLoginHref("/customer")).toBe("/doctor");
  });

  it("allows safe doctor deep links", () => {
    expect(resolveDoctorPostLoginHref("/doctor/leads")).toBe("/doctor/leads");
    expect(resolveDoctorPostLoginHref("/doctor/leads/99")).toBe("/doctor/leads/99");
    expect(resolveDoctorPostLoginHref("/doctor/settings")).toBe("/doctor/settings");
  });

  it("rejects login and apply as post-login targets", () => {
    expect(resolveDoctorPostLoginHref("/doctor/login")).toBe("/doctor");
    expect(resolveDoctorPostLoginHref("/doctor/login?x=1")).toBe("/doctor");
    expect(resolveDoctorPostLoginHref("/doctor/apply")).toBe("/doctor");
  });

  it("allows secure WhatsApp lead acceptance deep links", () => {
    expect(resolveDoctorPostLoginHref("/accept-lead/abc123")).toBe("/accept-lead/abc123");
  });
});
