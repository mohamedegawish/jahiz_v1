/**
 * Client-side password checks. They mirror the API's Password::defaults() (jahez_api
 * AppServiceProvider: at least 12 characters, at most 72 bytes, beyond which bcrypt would
 * silently ignore the rest). The server still validates every password.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;

/** Hint shown under a new-password field. */
export const PASSWORD_HINT = `${MIN_PASSWORD_LENGTH} حرفًا على الأقل. تُحفظ كلمة المرور مشفّرة ولا تُرسل بأي بريد.`;

/** Why a new password cannot be submitted yet, or null when it can. */
export function passwordIssue(password: string, confirmation: string): string | null {
  // Characters as the server counts them (code points), not UTF-16 units.
  if ([...password].length < MIN_PASSWORD_LENGTH) return `اختر كلمة مرور من ${MIN_PASSWORD_LENGTH} حرفًا على الأقل.`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return 'كلمة المرور أطول من المسموح (72 بايت؛ الحرف العربي يُحتسب بايتين). اختر كلمة أقصر.';
  }
  if (password !== confirmation) return 'تأكيد كلمة المرور غير مطابق لكلمة المرور.';
  return null;
}

/** Append a secret exactly as typed: passwords are never trimmed (login sends them as typed). */
export function appendSecret(form: FormData, key: string, value: string): void {
  if (value !== '') form.append(key, value);
}
