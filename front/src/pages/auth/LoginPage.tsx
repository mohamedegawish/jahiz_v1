import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Home } from 'lucide-react';
import { fieldMessages, isApiError } from '../../api';
import { postLoginPath, useAuth } from '../../auth/authContext';
import { useApiMutation } from '../../hooks/useApiMutation';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { FieldError } from '../../components/ui/FieldError';
import { fieldErrorClass } from '../../lib/forms';

type Lang = 'ar' | 'en';

const COPY: Record<Lang, Record<string, string>> = {
  ar: {
    emailFormatError: 'أدخل البريد الإلكتروني بشكل صحيح (مثال: name@company.com) — ولا تكتب رقم الهاتف في هذا الحقل.',
    home: 'الصفحة الرئيسية',
    eyebrow: 'مرحبًا بعودتك',
    title: 'تسجيل الدخول إلى المنظومة',
    badge: 'المنظومة الوطنية الذكية للثورة الصناعية الرابعة | Industry 4.0',
    blurb: 'أدخل بيانات حسابك المعتمد. تُحدَّد بوابتك وصلاحياتك تلقائيًا من بيانات الحساب لدى الخادم.',
    sessionExpired: 'انتهت جلستك. الرجاء تسجيل الدخول مرة أخرى.',
    emailLabel: 'البريد الإلكتروني المعتمد:',
    passwordLabel: 'كلمة المرور:',
    forgot: 'نسيت كلمة المرور؟',
    credentialError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب غير مفعّل.',
    remember: 'تذكر الجلسة على هذا الجهاز',
    submit: 'الدخول إلى المنظومة',
    verifying: 'جارٍ التحقق...',
    joinFactoryQ: 'منشأة صناعية جديدة ترغب في الانضمام؟',
    joinFactory: 'تقديم طلب تسجيل منشأة',
    joinProviderQ: 'شركة تريد عرض حلولها على المصانع؟',
    joinProvider: 'انضم كمقدّم خدمة',
  },
  en: {
    emailFormatError: 'Enter a valid email address (e.g. name@company.com) — not a phone number.',
    home: 'Home',
    eyebrow: 'WELCOME BACK',
    title: 'Sign in to the platform',
    badge: 'National Smart Ecosystem for Industry 4.0',
    blurb: 'Enter your approved credentials. Your portal and permissions are set automatically from your account on the server.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    emailLabel: 'Approved email:',
    passwordLabel: 'Password:',
    forgot: 'Forgot password?',
    credentialError: 'Email or password is incorrect, or the account is not activated.',
    remember: 'Remember me on this device',
    submit: 'Enter the platform',
    verifying: 'Verifying...',
    joinFactoryQ: 'New industrial facility looking to join?',
    joinFactory: 'Apply for facility registration',
    joinProviderQ: 'Company offering solutions to factories?',
    joinProvider: 'Join as a service provider',
  },
};

/** Same shape the API enforces (RFC + a dot in the domain): format mistakes are caught here so a phone number typed in the email field gets a clear message instead of a credential error. */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const LoginPage: React.FC = () => {
  const { status, user, login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /** The email field holds something that is not an email (often a phone number). */
  const [formatError, setFormatError] = useState(false);
  // Session storage ends with the tab; local storage keeps the 8-hour token across restarts.
  const [remember, setRemember] = useState(false);
  const [lang, setLang] = useState<Lang>('ar');
  const t = COPY[lang];

  const submit = useApiMutation((e: string, p: string, r: boolean) => login(e, p, r));

  // Someone who is already signed in has nothing to do here.
  if (status === 'authenticated' && user) return <Navigate to={postLoginPath(user.role, from)} replace />;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setFormatError(true);
      return;
    }
    setFormatError(false);
    const result = await submit.run(email.trim(), password, remember);
    if (result.ok) navigate(postLoginPath(result.data.role, from), { replace: true });
    else setPassword('');
  };

  // The API answers every credential failure (unknown email, wrong password, deactivated account)
  // with the same 422 on `email`, on purpose: it must not reveal which accounts exist.
  const emailErrors = fieldMessages(submit.error, 'email');
  const isCredentialFailure = isApiError(submit.error) && submit.error.status === 422 && emailErrors.length > 0;
  const passwordErrors = fieldMessages(submit.error, 'password');
  const showGeneric = submit.error !== null && !isCredentialFailure && passwordErrors.length === 0;

  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} className="relative min-h-screen w-full overflow-hidden bg-[#F7F9FC] text-start">
      {/* ============================================================
          Deep navy panel — physical LEFT ~56% on desktop.
          Subtle tint on mobile so the card stays the focus.
          ============================================================ */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(160deg,#004A93_0%,#002E4A_48%,#020817_100%)] opacity-20 md:w-[47%] md:opacity-100 lg:w-[56%]"
      >
        {/* soft blue depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_16%,rgba(45,156,219,0.38),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(3,38,95,0.65),transparent_60%)]" />

        {/* translucent angular / polygon layers */}
        <div className="absolute -left-14 top-[10%] h-72 w-72 rotate-45 border border-white/10 bg-white/[0.05]" />
        <div className="absolute left-[34%] top-[54%] h-96 w-96 rotate-12 bg-white/[0.035] [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
        <div className="absolute left-[6%] bottom-[6%] h-56 w-56 -rotate-12 bg-[#004A93]/20 [clip-path:polygon(25%_0%,100%_0%,75%_100%,0%_100%)]" />
        <div className="absolute left-[58%] top-[8%] h-40 w-40 rotate-[30deg] border border-[#004A93]/25 bg-[#004A93]/10 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />

        {/* futuristic diagonal structures */}
        <div className="absolute left-[46%] top-0 h-full w-24 -skew-x-12 bg-white/[0.04]" />
        <div className="absolute left-[14%] top-0 h-full w-10 -skew-x-12 bg-white/[0.05]" />
        <div className="absolute left-[70%] top-0 h-full w-2 -skew-x-12 bg-[#004A93]/30" />
      </div>

      {/* Orange geometric stripe — connects navy and light sections */}
      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-y-[-12%] left-[47%] w-14 -translate-x-1/2 rotate-[10deg] bg-[linear-gradient(180deg,#FF9E40_0%,#E67E00_55%,#E85B00_100%)] shadow-[0_0_46px_rgba(255,121,0,0.5)] lg:left-[56%]"
      />
      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-y-[-12%] left-[51.5%] w-2 -translate-x-1/2 rotate-[10deg] bg-[#E67E00]/75 shadow-[0_0_22px_rgba(255,121,0,0.6)] lg:left-[60.5%]"
      />

      {/* Small orange diagonal accent — bottom-left corner */}
      <div
        aria-hidden="true"
        className="hidden md:block absolute bottom-14 left-8 h-2 w-44 -rotate-[38deg] rounded-full bg-[#E67E00] shadow-[0_0_24px_rgba(255,121,0,0.65)]"
      />

      {/* Subtle circuit-board pathways — far-right (light area) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 hidden h-full w-[38%] opacity-[0.3] md:block"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g stroke="#004A93" strokeOpacity="0.55" strokeWidth="1.2">
          <path d="M20 60h90l30 30h120l40-40h80" />
          <path d="M60 180h70l34 34v90l26 26h150" />
          <path d="M0 320h130l28 28h96l44-44h102" />
          <path d="M40 470h110l30 30v110l30 30h150" />
          <path d="M10 640h80l36-36h140l30 30h104" />
          <path d="M240 0v70l-26 26v90" />
          <path d="M330 240v80l-30 30v100" />
        </g>
        <g fill="#004A93" fillOpacity="0.6">
          <circle cx="110" cy="60" r="3.5" />
          <circle cx="240" cy="90" r="3.5" />
          <circle cx="130" cy="320" r="3.5" />
          <circle cx="254" cy="348" r="3.5" />
          <circle cx="180" cy="500" r="3.5" />
          <circle cx="126" cy="604" r="3.5" />
          <circle cx="296" cy="350" r="3.5" />
        </g>
        <g fill="#004A93" fillOpacity="0.5">
          <circle cx="140" cy="180" r="2.5" />
          <circle cx="300" cy="470" r="2.5" />
          <circle cx="266" cy="640" r="2.5" />
        </g>
      </svg>

      {/* Language switch */}
      <div
        dir="ltr"
        className="absolute top-5 left-5 z-30 inline-flex overflow-hidden rounded-xl border border-[#E6EAF0] bg-white/85 shadow-xs backdrop-blur-md"
      >
        {(['ar', 'en'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
              lang === l ? 'bg-[#002E4A] text-white' : 'text-[#667085] hover:text-[#172033] hover:bg-white'
            }`}
          >
            {l === 'ar' ? 'AR' : 'EN'}
          </button>
        ))}
      </div>

      {/* Home button */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="absolute top-5 right-5 z-30 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/85 backdrop-blur-md border border-[#E6EAF0] text-xs font-bold text-[#003a75] shadow-xs hover:bg-white transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4" />
        {t.home}
      </button>

      {/* ============================================================
          Login card — right side, vertically centered
          ============================================================ */}
      <div className="relative z-20 flex min-h-screen items-center justify-center px-4 py-12 md:justify-center md:pl-[50%] md:pr-8 lg:pl-[60%]">
        <div className="w-full max-w-[470px] rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_34px_90px_-28px_rgba(6,43,99,0.45)] backdrop-blur-xl sm:p-9">
          <div className="space-y-4 text-center">
            <img src="/jahiz-logo-vector.svg" alt="Jahiz" className="h-11 mx-auto object-contain" />
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#E67E00]">{t.eyebrow}</p>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">{t.title}</h1>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6EAF0] bg-[#DDEBFD] px-3 py-1 text-[10px] font-bold text-[#003a75]">
                {t.badge}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#667085]">{t.blurb}</p>
          </div>

          {sessionExpired && !submit.error && (
            <div role="status" className="mt-5 p-3 rounded-xl bg-[#FEF5E7] border border-[#FDE5BE] text-xs font-semibold text-[#A66F0B]">
              {t.sessionExpired}
            </div>
          )}

          {showGeneric && <div className="mt-5"><ApiErrorState compact error={submit.error} /></div>}

          <form onSubmit={handleLogin} className="mt-5 space-y-4 text-xs" noValidate>
            <div>
              <label htmlFor="login-email" className="font-bold text-[#172033] block mb-1">
                {t.emailLabel}
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFormatError(false); }}
                  required
                  dir="ltr"
                  className={`w-full pr-3 pl-9 py-2.5 bg-white border border-[#E6EAF0] rounded-xl text-xs text-[#172033] text-left transition-colors focus:outline-none focus:border-[#004A93] focus:ring-2 focus:ring-[#004A93]/20 ${fieldErrorClass(isCredentialFailure || formatError)}`}
                />
                <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3 pointer-events-none" />
              </div>
              {formatError ? (
                <div role="alert" className="mt-1 text-[11px] font-medium text-[#B82B3B]">
                  {t.emailFormatError}
                </div>
              ) : isCredentialFailure ? (
                <div role="alert" className="mt-1 text-[11px] font-medium text-[#B82B3B]">
                  {t.credentialError}
                  <span className="block opacity-70" dir="ltr">{emailErrors[0]}</span>
                </div>
              ) : (
                <FieldError messages={emailErrors} />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="font-bold text-[#172033]">
                  {t.passwordLabel}
                </label>
                <Link to="/forgot-password" className="text-[11px] text-[#003a75] hover:underline">
                  {t.forgot}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className={`w-full pr-3 pl-9 py-2.5 bg-white border border-[#E6EAF0] rounded-xl text-xs text-[#172033] text-left transition-colors focus:outline-none focus:border-[#004A93] focus:ring-2 focus:ring-[#004A93]/20 ${fieldErrorClass(passwordErrors.length > 0)}`}
                />
                <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3 pointer-events-none" />
              </div>
              <FieldError messages={passwordErrors} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded accent-[#E67E00]"
                />
                <span className="text-[#667085]">{t.remember}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submit.pending || email.trim() === '' || password === ''}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-bold text-white bg-[#E67E00] shadow-md shadow-[#E67E00]/30 hover:bg-[#E85B00] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#E85B00] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {submit.pending ? t.verifying : t.submit}
              {!submit.pending && <ArrowLeft className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#E6EAF0] text-center text-xs text-[#667085] space-y-2">
            <div>
              {t.joinFactoryQ}{' '}
              <Link to="/register/factory" className="text-[#003a75] font-bold hover:underline">
                {t.joinFactory}
              </Link>
            </div>
            <div>
              {t.joinProviderQ}{' '}
              <Link to="/register/provider" className="text-[#003a75] font-bold hover:underline">
                {t.joinProvider}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

