import { prisma } from "@/lib/prisma";
import { SmsLogStatus } from "@/generated/prisma/enums";

export function redactSmsPreview(message: string, purpose: string): string {
  if (purpose === "otp") {
    return "[OTP redacted]";
  }
  const t = message.replace(/\s+/g, " ").trim();
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

export async function insertSmsLogPending(input: {
  phoneRaw: string;
  normalizedPhone: string;
  messagePreview: string;
  purpose: string;
  leadId?: number | null;
  userId?: number | null;
}): Promise<string> {
  const row = await prisma.smsLog.create({
    data: {
      phone: input.phoneRaw,
      normalizedPhone: input.normalizedPhone,
      messagePreview: input.messagePreview,
      purpose: input.purpose,
      status: SmsLogStatus.PENDING,
      leadId: input.leadId ?? undefined,
      userId: input.userId ?? undefined,
    },
    select: { id: true },
  });
  return row.id;
}

export async function finalizeSmsLog(
  id: string,
  patch: {
    status: SmsLogStatus;
    providerCode?: string | null;
    providerMessage?: string | null;
  },
): Promise<void> {
  await prisma.smsLog.update({
    where: { id },
    data: {
      status: patch.status,
      providerCode: patch.providerCode ?? undefined,
      providerMessage: patch.providerMessage ?? undefined,
    },
  });
}
