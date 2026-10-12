import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import designSvg from '../../assets/design.svg';
import { publicApiUrl, type LandingSettings } from '../../api';
import { LANDING_DEFAULTS, logoSrc, pick } from '../../lib/landingDefaults';

/** The closing conversion banner. Texts and logo are admin-managed with bundled fallbacks. */
export const FinalCTA: React.FC<{ content?: LandingSettings | null }> = ({ content }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden bg-[#002E4A]">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="1">
          {Array.from({ length: 21 }, (_, i) => (
            <line key={`grid-v-${i}`} x1={i * 60} y1={0} x2={i * 60} y2={420} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`grid-h-${i}`} x1={0} y1={i * 60} x2={1200} y2={i * 60} />
          ))}
        </g>

        <g
          stroke="#FFFFFF"
          strokeOpacity="0.12"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M70 350 V235 L130 200 V235 L190 200 V235 L250 200 V235 L310 200 V350 Z" />
          <path d="M330 350 V160 h26 V350" />
          <path d="M165 350 V300 h50 V350" />
          <path d="M95 262 h34 v30 h-34 Z" />
          <path d="M240 262 h34 v30 h-34 Z" />
        </g>

        <g
          stroke="#FFFFFF"
          strokeOpacity="0.1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M700 70 H820 V140 H910 V210 H1030" />
          <path d="M760 380 V320 H870 V260 H980" />
          <path d="M1140 120 H1060 V190 H1000" />
        </g>

        <g
          stroke="#E67E00"
          strokeOpacity="0.12"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M840 420 V350 H930 V300" />
          <path d="M640 340 H700 V280" />
        </g>

        <g fill="#E67E00" fillOpacity="0.55">
          <circle cx="700" cy="70" r="4" />
          <circle cx="1030" cy="210" r="4" />
          <circle cx="980" cy="260" r="4" />
          <circle cx="930" cy="300" r="4" />
          <circle cx="700" cy="280" r="4" />
        </g>
      </svg>

      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      >
        {/* Logo — right side (RTL first) */}
        <img
          src={logoSrc(content, publicApiUrl)}
          alt="جَاهِز"
          className="h-24 w-auto shrink-0 self-center object-contain sm:h-36 sm:-translate-y-10 sm:translate-x-6 lg:h-44 lg:-translate-y-20 lg:translate-x-10"
        />

        {/* Text — middle */}
        <div className="flex flex-col items-center justify-center text-center sm:flex-1 sm:translate-x-8 sm:px-4 lg:translate-x-14">
          <h2 className="text-2xl font-black text-white sm:text-3xl lg:text-4xl">
            {pick(content?.cta_title, LANDING_DEFAULTS.ctaTitle)}
          </h2>

          <p className="mt-3 text-sm text-white/75 sm:text-base">
            {pick(content?.cta_subtitle, LANDING_DEFAULTS.ctaSubtitle)}
          </p>

          <button
            type="button"
            onClick={() => navigate('/factory/assessment')}
            className="mt-6 cursor-pointer rounded-2xl bg-[#E67E00] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E85B00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base"
          >
            {pick(content?.cta_button, LANDING_DEFAULTS.ctaButton)}
          </button>

          <p className="mt-3 text-xs text-white/60">
            {pick(content?.cta_note, LANDING_DEFAULTS.ctaNote)}
          </p>
        </div>

        {/* Illustration — left side (RTL last) */}
        <img
          src={designSvg}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none w-full max-w-md shrink-0 self-center object-contain sm:w-auto sm:max-w-2xl sm:max-h-[26rem] sm:-translate-x-8 sm:translate-y-8 lg:max-w-[48rem] lg:max-h-[34rem] lg:-translate-x-20 lg:translate-y-16"
        />
      </motion.div>
    </section>
  );
};

