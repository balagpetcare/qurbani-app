import { describe, expect, it } from "vitest";

import {
  pickDoctorLoginIdentifier,
  pickDoctorLoginPassword,
} from "./doctor-login-body";

describe("pickDoctorLoginIdentifier", () => {
  it("prefers identifier over phone/email", () => {
    expect(
      pickDoctorLoginIdentifier({
        identifier: "  doc@clinic.com ",
        phone: "01711111111",
        email: "other@x.com",
      }),
    ).toBe("doc@clinic.com");
  });

  it("falls back to phone", () => {
    expect(
      pickDoctorLoginIdentifier({
        phone: " 01722222222 ",
      }),
    ).toBe("01722222222");
  });

  it("falls back to email", () => {
    expect(
      pickDoctorLoginIdentifier({
        email: "a@b.co",
      }),
    ).toBe("a@b.co");
  });

  it("falls back to numeric doctorId", () => {
    expect(pickDoctorLoginIdentifier({ doctorId: 42 })).toBe("42");
  });

  it("falls back to string doctorId", () => {
    expect(pickDoctorLoginIdentifier({ doctorId: " 7 " })).toBe("7");
  });
});

describe("pickDoctorLoginPassword", () => {
  it("returns password string", () => {
    expect(pickDoctorLoginPassword({ password: "secret" })).toBe("secret");
  });

  it("returns empty when missing", () => {
    expect(pickDoctorLoginPassword({})).toBe("");
  });
});
