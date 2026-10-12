import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Cpu,
  Database,
  Lock,
  Cloud,
  Compass,
  Zap,
  Gauge,
  ShieldCheck,
  Handshake,
  LineChart,
  UserPlus,
  Search,
  MessageSquareText,
  FileSignature,
  FileCheck,
  Rocket,
  Factory,
  Briefcase,
  LogIn,
  ArrowLeft,
} from 'lucide-react';
import { HeroSection } from '../../components/hero/HeroSection';
import { AdStrip } from '../../components/hero/AdStrip';
import { FaqSection } from '../../components/landing/FaqSection';
import { FinalCTA } from '../../components/landing/FinalCTA';
import { HomeVideos } from '../../components/landing/HomeVideos';
import { useAuth } from '../../auth/authContext';
import { api } from '../../api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useLandingSettings } from '../../hooks/useLandingSettings';
import { Reveal } from '../../components/ui/Reveal';
import { LANDING_DEFAULTS, pick, pickList } from '../../lib/landingDefaults';

/** Slim trust bar directly under the hero (trust signals live here, never inside the hero). */
const TrustBar: React.FC<{ facts: string[] }> = ({ facts }) => {
  const items = [
    { icon: ShieldCheck, label: facts[0], color: 'text-[#1D7E4C]' },
    { icon: Layers, label: facts[1], color: 'text-[#003a75]' },
    { icon: FileCheck, label: facts[2], color: 'text-[#002E4A]' },
  ];
  return (
    <div className="border-b border-[#E6EAF0] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        {items.map((fact, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#344054] sm:text-xs">
            <fact.icon aria-hidden="true" className={`h-4 w-4 ${fact.color}`} />
            {fact.label}
          </span>
        ))}
      </div>
    </div>
  );
};

type PlatformCardProps = {
  num: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  meta?: string;
  id?: string;
  onClick?: () => void;
};

const PlatformCard: React.FC<PlatformCardProps> = ({ num, icon: Icon, title, desc, meta, id, onClick }) => (
  <div
    id={id}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => {
      if (!onClick) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className={`group rounded-2xl border border-[#E6EAF0] bg-white p-5 text-right transition-all duration-200 hover:-translate-y-[3px] hover:border-[#E67E00] hover:bg-[linear-gradient(180deg,#FFFFFF_45%,#FFFBEC_100%)] hover:shadow-[0_12px_28px_-8px_rgba(0,62,130,0.18),0_6px_14px_-6px_rgba(8,119,232,0.20)] focus-visible:border-[#004A93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004A93]/25 active:border-[#004A93] active:shadow-[0_8px_20px_-4px_rgba(0,62,130,0.14)] ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <span className="mt-0.5 text-[13px] font-black tracking-[0.16em] text-[#004A93]">
        {String(num).padStart(2, '0')}
      </span>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#FFD9B3] bg-[#FFEDD5] text-[#E67E00] transition-colors duration-300 group-hover:border-[#E67E00]">
        <Icon className="h-6 w-6" />
      </div>
    </div>
    <h3 className="text-sm font-extrabold text-[#172033]">{title}</h3>
    <p className="mt-1.5 text-xs leading-relaxed text-[#667085]">{desc}</p>
    <div className="mt-4 flex items-center border-t border-[#F1F4F9] pt-3">
      {meta ? <span className="text-[11px] font-semibold text-[#98A2B3]">{meta}</span> : null}
      <span
        aria-hidden
        className="ms-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#E6EAF0] bg-white text-[#002E4A] transition-all duration-300 group-hover:border-[#E67E00] group-hover:bg-[#E67E00] group-hover:text-white group-active:border-[#004A93] group-active:bg-[#004A93]"
      >
        <ArrowLeft className="h-4 w-4" />
      </span>
    </div>
  </div>
);

/** Fixed visuals and destinations of the admin-editable service cards (position i shows icon/routes[i]). */
const SERVICE_CARD_ICONS = [Gauge, Compass, MessageSquareText, FileSignature];
const SERVICE_CARD_ROUTES = ['/factory/assessment', '/factory/catalog', '/factory/negotiations', '/factory/contracts'];

/** Fixed visuals of the admin-editable usage steps; destinations stay with the step position. */
const STEP_ICONS = [UserPlus, Gauge, Search, Rocket];
const STEP_ROUTES = ['/register/factory', '/factory/assessment', '/factory/catalog', '/login'];

export const LandingHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const isVisitor = !user && status !== 'loading';
  const topFeed = useApiQuery((signal) => api.announcements.publicList('top', signal), []);
  const bottomFeed = useApiQuery((signal) => api.announcements.publicList('bottom', signal), []);
  // Admin-managed copy (logo, hero texts, section texts, FAQ); every use below
  // falls back to the bundled copy, so the page never depends on the API.
  const content = useLandingSettings();
  const trustFacts = pickList(content?.trust_facts, LANDING_DEFAULTS.trustFacts);
  const serviceCards = pickList(content?.service_cards, LANDING_DEFAULTS.serviceCards);
  const howSteps = pickList(content?.how_steps, LANDING_DEFAULTS.howSteps);
  const aboutChips = pickList(content?.about_chips, LANDING_DEFAULTS.aboutChips).slice(0, 3);
  const quickFacts = pickList(content?.quick_facts, LANDING_DEFAULTS.quickFacts).slice(0, 3);
  const chipIcons = [ShieldCheck, Handshake, LineChart];

  const categories = [
    { title: 'ERP & Applications', desc: 'تخطيط الموارد والإنتاج السحابي MRP', icon: Cpu },
    { title: 'OT & Automation', desc: 'ترقية لوحات التحكم والروبوتات الصناعية', icon: Layers },
    { title: 'Cloud & Infrastructure', desc: 'الحوسبة الطرفية Edge وربط الماكينات', icon: Cloud },
    { title: 'Cybersecurity for ICS/OT', desc: 'تحصين شبكات SCADA ومواصفة IEC 62443', icon: Lock },
    { title: 'AI, Data & Analytics', desc: 'الصيانة التنبؤية بالاهتزازات والرؤية الذكية', icon: Database },
    { title: 'Smart Manufacturing', desc: 'التوأم الرقمي Digital Twin ومؤشر OEE', icon: Zap },
    { title: 'Digital Consulting', desc: 'خارطة طريق التحول الرقمي واستشارات الجاهزية', icon: Compass },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      {/* 1. Main Hero Section with ShaderGradient */}
      <HeroSection adsFeed={topFeed} content={content} />
      <TrustBar facts={[trustFacts[0] ?? LANDING_DEFAULTS.trustFacts[0], trustFacts[1] ?? LANDING_DEFAULTS.trustFacts[1], trustFacts[2] ?? LANDING_DEFAULTS.trustFacts[2]]} />

      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 mt-10 pb-12">
        {/* 1c. Join the platform: the two registration paths and sign-in (visitors only) */}
        {isVisitor && (
          <Reveal>
          <section aria-labelledby="join-title" className="jahez-card p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <h2 id="join-title" className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight">{pick(content?.join_title, LANDING_DEFAULTS.joinTitle)}</h2>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                  {pick(content?.join_description, LANDING_DEFAULTS.joinDescription)}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:min-w-[520px]">
                <button
                  type="button"
                  onClick={() => navigate('/register/factory')}
                  className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-[#DDEBFD] bg-[#DDEBFD]/40 hover:bg-[#DDEBFD] text-right transition-colors cursor-pointer"
                >
                  <Factory className="w-5 h-5 text-[#003a75]" />
                  <span className="text-sm font-bold text-[#172033]">تسجيل منشأة صناعية</span>
                  <span className="text-[11px] text-[#667085]">ثم تقييم الجاهزية الرقمية</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register/provider')}
                  className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-[#FFEDD5] bg-[#FFEDD5]/40 hover:bg-[#FFEDD5] text-right transition-colors cursor-pointer"
                >
                  <Briefcase className="w-5 h-5 text-[#002E4A]" />
                  <span className="text-sm font-bold text-[#172033]">تسجيل مقدّم خدمة</span>
                  <span className="text-[11px] text-[#667085]">يراجعه مركز تحديث الصناعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-[#E6EAF0] bg-white hover:bg-[#F7F9FC] text-right transition-colors cursor-pointer"
                >
                  <LogIn className="w-5 h-5 text-[#172033]" />
                  <span className="text-sm font-bold text-[#172033]">لديك حساب؟</span>
                  <span className="text-[11px] text-[#667085]">تسجيل الدخول</span>
                </button>
              </div>
            </div>
          </section>
          </Reveal>
        )}

        {/* 2. Platform Value Proposition */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            {pick(content?.value_title, LANDING_DEFAULTS.valueTitle)}
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
            {pick(content?.value_subtitle, LANDING_DEFAULTS.valueSubtitle)}
          </p>
        </div>

        {/* 3. The 7 Service Categories - Interactive Cards with upward lift and color shift */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => (
            <PlatformCard
              key={idx}
              num={idx + 1}
              icon={cat.icon}
              title={cat.title}
              desc={cat.desc}
              meta="تصنيف في الكتالوج"
              onClick={() => navigate('/factory/catalog')}
            />
          ))}

          <PlatformCard
            id="assessment"
            num={8}
            icon={Gauge}
            title="تقييم الجاهزية الرقمية"
            desc="أجب عن استبيان الجاهزية الرقمية واحصل على فئة جاهزية مصنعك وخارطة طريق بخدمات مقترحة."
            meta="يحسبه الخادم فور الإرسال"
            onClick={() => navigate('/factory/assessment')}
          />
        </div>

        {/* 5. Platform Overview — About, Services & How to Use */}
        <div className="space-y-10">
          {/* 5a. About the platform */}
          <div id="about" className="jahez-card p-6 sm:p-8 scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-1 rounded-full bg-[#002E4A]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight">عن المنصة</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3 text-xs sm:text-sm text-[#667085] leading-relaxed">
                <p>{pick(content?.about_paragraph_1, LANDING_DEFAULTS.aboutParagraph1)}</p>
                <p>{pick(content?.about_paragraph_2, LANDING_DEFAULTS.aboutParagraph2)}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aboutChips.map((chip, i) => {
                    const ChipIcon = chipIcons[i % chipIcons.length];
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFEDD5] text-[#002E4A] text-[11px] font-bold"
                      >
                        <ChipIcon className="w-3.5 h-3.5" />
                        {chip}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Quick facts sidebar */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {quickFacts.map((fact, i) => (
                  <div key={i} className="rounded-xl bg-[#F7F9FC] border border-[#E6EAF0] p-4 text-center">
                    <span className="text-2xl font-black text-[#002E4A] block">{fact.value}</span>
                    <p className="text-[11px] text-[#667085] font-semibold mt-1 leading-snug">{fact.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5b. Services offered by the platform */}
          <div id="services" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-1 rounded-full bg-[#004A93]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight">{pick(content?.services_title, LANDING_DEFAULTS.servicesTitle)}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {serviceCards.slice(0, 4).map((svc, idx) => (
                <Reveal key={idx} delay={Math.min(idx * 0.06, 0.24)}>
                <PlatformCard
                  num={idx + 1}
                  icon={SERVICE_CARD_ICONS[idx % SERVICE_CARD_ICONS.length]}
                  title={svc.title}
                  desc={svc.description}
                  meta={svc.meta ?? undefined}
                  onClick={() => navigate(SERVICE_CARD_ROUTES[idx % SERVICE_CARD_ROUTES.length])}
                />
                </Reveal>
              ))}
            </div>
          </div>

          {/* Ad strip — admin-managed ads slider */}
          <AdStrip feed={bottomFeed} />

          {/* Home video — footer-placement announcement with video, when the ministry publishes one */}
          <HomeVideos />

          {/* 5c. How to use — 4 steps */}
          <Reveal>
          <div id="how" className="jahez-card p-6 sm:p-8 scroll-mt-24">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-1 rounded-full bg-[#35B779]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight">{pick(content?.how_title, LANDING_DEFAULTS.howTitle)}</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#667085] mb-6">
              {pick(content?.how_description, LANDING_DEFAULTS.howDescription)}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {howSteps.slice(0, 4).map((step, idx) => (
                <Reveal key={idx} delay={Math.min(idx * 0.06, 0.24)}>
                <PlatformCard
                  num={idx + 1}
                  icon={STEP_ICONS[idx % STEP_ICONS.length]}
                  title={step.title}
                  desc={step.description}
                  meta={step.cta ?? undefined}
                  onClick={() => navigate(STEP_ROUTES[idx % STEP_ROUTES.length])}
                />
                </Reveal>
              ))}
            </div>
          </div>
          </Reveal>
        </div>

        {/* 6. FAQ — native details/summary accordion */}
        <FaqSection items={content?.faq_items} title={content?.faq_title} />
      </div>

      {/* 7. Final conversion banner — full-width closer */}
      <FinalCTA content={content} />
    </div>
  );
};

