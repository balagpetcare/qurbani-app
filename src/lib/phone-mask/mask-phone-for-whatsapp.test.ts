import { describe, expect, it } from "vitest";

import { maskBangladeshStylePhoneForWhatsApp } from "@/lib/phone-mask/mask-phone-for-whatsapp";

describe("maskBangladeshStylePhoneForWhatsApp", () => {
  it("masks 11-digit BD mobiles per product rule", () => {
    expect(maskBangladeshStylePhoneForWhatsApp("01712345678")).toBe("01712****78");
    expect(maskBangladeshStylePhoneForWhatsApp("+880 1712 345678")).toBe("01712****78");
  });
});
