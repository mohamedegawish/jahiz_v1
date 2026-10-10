import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** A wider card for long forms (registration). */
  wide?: boolean;
}

/** Split-navy auth shell (navy brand panel + white card), shared by the password and registration pages. */
export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children, wide = false }) => {
  const navigate = useNavigate();
  return (
    <div dir="rtl" className="relative min-h-screen w-full overflow-hidden bg-[#F7F9FC] text-start">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(160deg,#004A93_0%,#002E4A_48%,#020817_100%)] opacity-20 md:w-[47%] md:opacity-100 lg:w-[56%]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_16%,rgba(45,156,219,0.38),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(3,38,95,0.65),transparent_60%)]" />

        <div className="absolute -left-14 top-[10%] h-72 w-72 rotate-45 border border-white/10 bg-white/[0.05]" />
        <div className="absolute left-[34%] top-[54%] h-96 w-96 rotate-12 bg-white/[0.035] [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
        <div className="absolute left-[6%] bottom-[6%] h-56 w-56 -rotate-12 bg-[#004A93]/20 [clip-path:polygon(25%_0%,100%_0%,75%_100%,0%_100%)]" />
        <div className="absolute left-[58%] top-[8%] h-40 w-40 rotate-[30deg] border border-[#004A93]/25 bg-[#004A93]/10 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />

        <div className="absolute left-[46%] top-0 h-full w-24 -skew-x-12 bg-white/[0.04]" />
        <div className="absolute left-[14%] top-0 h-full w-10 -skew-x-12 bg-white/[0.05]" />
        <div className="absolute left-[70%] top-0 h-full w-2 -skew-x-12 bg-[#004A93]/30" />
      </div>

      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-y-[-12%] left-[47%] w-14 -translate-x-1/2 rotate-[10deg] bg-[linear-gradient(180deg,#FF9E40_0%,#E67E00_55%,#E85B00_100%)] shadow-[0_0_46px_rgba(255,121,0,0.5)] lg:left-[56%]"
      />
      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-y-[-12%] left-[51.5%] w-2 -translate-x-1/2 rotate-[10deg] bg-[#E67E00]/75 shadow-[0_0_22px_rgba(255,121,0,0.6)] lg:left-[60.5%]"
      />
      <div
        aria-hidden="true"
        className="hidden md:block absolute bottom-14 left-8 h-2 w-44 -rotate-[38deg] rounded-full bg-[#E67E00] shadow-[0_0_24px_rgba(255,121,0,0.65)]"
      />

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

      <button
        type="button"
        onClick={() => navigate('/')}
        className="absolute top-5 right-5 z-30 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/85 backdrop-blur-md border border-[#E6EAF0] text-xs font-bold text-[#003a75] shadow-xs hover:bg-white transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4" />
        الصفحة الرئيسية
      </button>

      <div
        className={`relative z-20 flex min-h-screen items-center justify-center px-4 py-12 md:pr-8 ${
          wide ? 'md:pl-[42%] lg:pl-[50%]' : 'md:pl-[50%] lg:pl-[60%]'
        }`}
      >
        <div
          className={`w-full ${
            wide ? 'max-w-3xl' : 'max-w-[470px]'
          } rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_34px_90px_-28px_rgba(6,43,99,0.45)] backdrop-blur-xl sm:p-9`}
        >
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <img src="/jahiz-logo-vector.svg" alt="Jahiz" className="h-11 mx-auto object-contain" />
              <h1 className="text-2xl font-black tracking-tight text-[#172033]">{title}</h1>
              {subtitle && <p className="text-xs leading-relaxed text-[#667085]">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

