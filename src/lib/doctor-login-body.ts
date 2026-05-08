/**
 * Coalesce doctor login JSON from mobile/web clients (identifier vs legacy keys).
 */

export type DoctorLoginJsonBody = {
  identifier?: unknown;
  phone?: unknown;
  email?: unknown;
  doctorId?: unknown;
  password?: unknown;
};

export function pickDoctorLoginIdentifier(body: DoctorLoginJsonBody): string {
  if (typeof body.identifier === "string" && body.identifier.trim()) {
    return body.identifier.trim();
  }
  if (typeof body.phone === "string" && body.phone.trim()) {
    return body.phone.trim();
  }
  if (typeof body.email === "string" && body.email.trim()) {
    return body.email.trim();
  }
  if (body.doctorId != null) {
    if (typeof body.doctorId === "number" && Number.isFinite(body.doctorId)) {
      return String(Math.trunc(body.doctorId));
    }
    if (typeof body.doctorId === "string" && body.doctorId.trim()) {
      return body.doctorId.trim();
    }
  }
  return "";
}

export function pickDoctorLoginPassword(body: DoctorLoginJsonBody): string {
  return typeof body.password === "string" ? body.password : "";
}
