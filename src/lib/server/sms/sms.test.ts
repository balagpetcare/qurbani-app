import { describe, expect, it } from "vitest";

import {
  extractResponseCodeFromBody,
  mapBulkSmsResponseCode,
  normalizeBdPhone,
} from "@/lib/server/sms/bulksmsbd";
import { buildOtpSmsBody } from "@/lib/server/sms/sms.templates";
import { getPublicAppUrl } from "@/lib/server/sms/sms-env";

describe("normalizeBdPhone", () => {
  it("accepts local and converts to 880", () => {
    const r = normalizeBdPhone("01711223344");
    expect(r.ok && r.international880).toBe("8801711223344");
  });

  it("accepts +880 international form", () => {
    const r = normalizeBdPhone("+880 1711 223344");
    expect(r.ok && r.international880).toBe("8801711223344");
  });

  it("rejects invalid numbers", () => {
    const r = normalizeBdPhone("999");
    expect(r.ok).toBe(false);
  });
});

describe("mapBulkSmsResponseCode", () => {
  it("maps 202 to success", () => {
    expect(mapBulkSmsResponseCode("202").ok).toBe(true);
  });

  it("maps 1007 to balance issue", () => {
    const m = mapBulkSmsResponseCode("1007");
    expect(m.ok).toBe(false);
    expect(m.internalCode).toBe("balance_insufficient");
  });

  it("maps 1032 to ip whitelist", () => {
    const m = mapBulkSmsResponseCode("1032");
    expect(m.internalCode).toBe("ip_whitelist");
  });
});

describe("extractResponseCodeFromBody", () => {
  it("parses plain code", () => {
    expect(extractResponseCodeFromBody("202")).toBe("202");
  });

  it("parses JSON-like bodies", () => {
    expect(extractResponseCodeFromBody('{"code":1007}')).toBe("1007");
  });
});

describe("OTP template", () => {
  it("includes digits without leaking env secrets", () => {
    process.env.SMS_BRAND_NAME = "TestBrand";
    expect(buildOtpSmsBody("123456")).toBe("Your TestBrand OTP is 123456");
  });
});

describe("tracking URL helper", () => {
  it("uses PUBLIC_APP_URL when set", () => {
    process.env.PUBLIC_APP_URL = "https://example.com";
    expect(getPublicAppUrl()).toBe("https://example.com");
  });
});
