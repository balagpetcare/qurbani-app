/**
 * Sends OTP via Twilio only when explicitly enabled and credentials exist.
 * Never sends in production without SMS_OTP_ENABLED=1 and valid Twilio env.
 */
export async function sendCustomerOtpSmsIfConfigured(
  phoneCanonLocal: string,
  plainCode: string,
): Promise<{ sent: boolean; reason: "disabled" | "missing_env" | "ok" | "http_error" }> {
  if (process.env.SMS_OTP_ENABLED !== "1") {
    return { sent: false, reason: "disabled" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || !from) {
    console.warn(
      "[customer-otp] SMS_OTP_ENABLED=1 but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER incomplete; skipping send.",
    );
    return { sent: false, reason: "missing_env" };
  }

  const to = `+880${phoneCanonLocal.slice(1)}`;
  const bodyText = `Quurbani যাচাইকরণ কোড: ${plainCode}`;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: bodyText,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[customer-otp] Twilio send failed", res.status, t.slice(0, 500));
    return { sent: false, reason: "http_error" };
  }

  return { sent: true, reason: "ok" };
}
