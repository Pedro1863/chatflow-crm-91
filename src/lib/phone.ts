export type PhoneStatus = "valid" | "missing" | "invalid";

export function normalizeBrazilPhoneE164(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";

  const trimmed = rawPhone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("bling_")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  if (/^55\d{10,11}$/.test(digits)) return `+${digits}`;
  if (/^\d{10,11}$/.test(digits)) return `+55${digits}`;

  return trimmed;
}

export function isValidBrazilPhoneE164(phone: string | null | undefined): boolean {
  return /^\+55\d{10,11}$/.test(normalizeBrazilPhoneE164(phone));
}

export function getPhoneStatus(phone: string | null | undefined): PhoneStatus {
  if (!phone || phone.trim() === "") return "missing";
  return isValidBrazilPhoneE164(phone) ? "valid" : "invalid";
}