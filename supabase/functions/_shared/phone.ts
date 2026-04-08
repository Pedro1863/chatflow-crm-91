export function normalizeBrazilPhoneE164(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";

  const trimmed = rawPhone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("bling_")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  // Already in correct format: 55 + DDD(2) + 9digits = 13 digits
  if (/^55\d{11}$/.test(digits)) return digits;

  // 55 + DDD(2) + 8 digits (mobile missing the leading 9)
  // Brazilian mobiles start with 9 after DDD, so add it
  if (/^55\d{10}$/.test(digits)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    // If the local number starts with [6-9], it's likely a mobile missing the 9
    if (/^[6-9]/.test(local)) {
      return `55${ddd}9${local}`;
    }
    // Landline - keep as is (10 digits after 55)
    return digits;
  }

  // Local number without country code: 11 digits (DDD + 9 + 8)
  if (/^\d{11}$/.test(digits)) return `55${digits}`;

  // Local number without country code: 10 digits (DDD + 8)
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
