export type PhoneStatus = "valid" | "missing" | "invalid";

export function normalizeBrazilPhoneE164(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";

  const trimmed = rawPhone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("bling_")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  // Already correct: 55 + DDD(2) + 9 digits = 13 digits
  if (/^55\d{11}$/.test(digits)) return digits;

  // 55 + DDD(2) + 8 digits: mobile missing the leading 9
  if (/^55\d{10}$/.test(digits)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (/^[6-9]/.test(local)) {
      return `55${ddd}9${local}`;
    }
    return digits;
  }

  // Local: 11 digits (DDD + 9 + 8)
  if (/^\d{11}$/.test(digits)) return `55${digits}`;

  // Local: 10 digits (DDD + 8), add 9 for mobiles
  if (/^\d{10}$/.test(digits)) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (/^[6-9]/.test(local)) {
      return `55${ddd}9${local}`;
    }
    return `55${digits}`;
  }

  return trimmed;
}

export function isValidBrazilPhoneE164(phone: string | null | undefined): boolean {
  return /^55\d{10,11}$/.test(normalizeBrazilPhoneE164(phone));
}

export function getPhoneStatus(phone: string | null | undefined): PhoneStatus {
  if (!phone || phone.trim() === "") return "missing";
  return isValidBrazilPhoneE164(phone) ? "valid" : "invalid";
}
