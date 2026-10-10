import React from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';

/** A titled group of fields inside a registration form. */
export const FormSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <fieldset className="space-y-3 pt-4 border-t border-[#E6EAF0] first:border-t-0 first:pt-0">
    <legend className="text-sm font-bold text-[#002E4A]">{title}</legend>
    {description && <p className="text-[11px] text-[#667085] leading-relaxed -mt-1">{description}</p>}
    {children}
  </fieldset>
);

/**
 * Shown after the API accepted a registration. The account already exists: the visitor
 * signs in immediately with the chosen email and password.
 */
export const RegistrationSubmitted: React.FC<{ email: string; reviewNote?: string }> = ({ email, reviewNote }) => (
  <div role="status" className="space-y-4 text-center">
    <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E7F8EE] text-[#1D7E4C] flex items-center justify-center">
      <MailCheck className="w-6 h-6" />
    </div>
    <div className="space-y-1.5">
      <h3 className="text-base font-bold text-[#172033]">تم إنشاء حسابك</h3>
      <p className="text-xs text-[#667085] leading-relaxed">
        أُنشئ حسابك على البريد <span className="font-bold text-[#172033]" dir="ltr">{email}</span> — سجّل الدخول الآن بالبريد الإلكتروني وكلمة المرور اللذين سجّلت بهما.
      </p>
      {reviewNote && <p className="text-xs text-[#003a75] font-semibold leading-relaxed">{reviewNote}</p>}
    </div>
    <div className="flex flex-col items-center gap-2 text-xs">
      <Link to="/login" className="font-bold text-[#003a75] hover:underline">الانتقال إلى تسجيل الدخول</Link>
      <Link to="/" className="text-[#667085] hover:underline">العودة إلى الصفحة الرئيسية</Link>
    </div>
  </div>
);

