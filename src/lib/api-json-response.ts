import { NextResponse } from "next/server";

/**
 * Standard mobile/API error JSON (Flutter reads `messageBn` + `error`/`code`).
 */
export function mobileApiErrorBody(
  code: string,
  messageBn: string,
  messageEn?: string,
): {
  ok: false;
  code: string;
  error: string;
  message: string;
  messageBn: string;
} {
  return {
    ok: false,
    code,
    error: code,
    message: messageEn ?? code,
    messageBn,
  };
}

export function mobileApiError(
  status: number,
  code: string,
  messageBn: string,
  messageEn?: string,
): NextResponse {
  return NextResponse.json(mobileApiErrorBody(code, messageBn, messageEn), {
    status,
  });
}
