import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  Building2,
  Briefcase,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import { SlideTabs } from '../ui/slide-tabs';
import type { SlideTabItem } from '../ui/slide-tabs';
import { HeroAdsBanner } from './HeroAdsBanner';
import { useApiQuery, type ApiQuery } from '../../hooks/useApiQuery';
import { api, publicApiUrl, type LandingHeroTab, type LandingSettings, type PublicAnnouncement, type Role } from '../../api';
import { LANDING_DEFAULTS, pick } from '../../lib/landingDefaults';
import { useAuth } from '../../auth/authContext';
import heroCardSvg from '../../assets/jahiz-hero-card.svg';

const DEFAULT_HEADLINE = 'جاهز لمستقبلك الرقمي';

const HEADLINE_BY_TAB: Record<string, string> = {
  home: DEFAULT_HEADLINE,
  assessment: 'اعرف مستوى جاهزية مصنعك',
  digital: 'اكتشف أولويات التحول الرقمي',
  smart: 'خطوتك نحو مصنع أكثر ذكاءً',
  results: 'حوّل البيانات إلى قرارات',
};

const TABS: (SlideTabItem & { target: string })[] = [
  { id: 'home', label: 'الرئيسية', target: '' },
  { id: 'assessment', label: 'التقييم', target: 'assessment' },
  { id: 'digital', label: 'التحول الرقمي', target: 'services' },
  { id: 'smart', label: 'المصانع الذكية', target: 'about' },
  { id: 'results', label: 'النتائج', target: 'how' },
];

export const HeroSection: React.FC<{ adsFeed?: ApiQuery<PublicAnnouncement[]>; content?: LandingSettings | null }> = ({ adsFeed, content }) => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const reduced = useReducedMotion() === true;
  const [activeTab, setActiveTab] = useState('home');

  const resolving = status === 'loading';
  const isVisitor = !user && !resolving;
  const showPortal = (role: Role) => !resolving && (!user || user.role === role);

  const tabHeadlines = content?.hero_tab_headlines ?? {};
  const rawTabHeadline = tabHeadlines[activeTab as LandingHeroTab];
  const tabHeadline = rawTabHeadline != null && rawTabHeadline.trim() !== '' ? rawTabHeadline : null;
  // A tab shows its own headline; the "home" tab falls back to the main headline.
  const headline =
    tabHeadline ??
    (activeTab === 'home'
      ? pick(content?.hero_headline, DEFAULT_HEADLINE)
      : (HEADLINE_BY_TAB[activeTab] ?? DEFAULT_HEADLINE));

  // Admin-managed hero video (announcement placement `hero`): the first live one
  // carrying a video. Always a <video> frame: the admin video when published,
  // otherwise the bundled demo file (front/public/hero-demo.mp4 — replace it
  // with the real intro video, or publish a `hero` announcement to override).
  const heroFeed = useApiQuery((signal) => api.announcements.publicList('hero', signal), []);
  const heroVideo = heroFeed.data?.find((a) => a.video_path) ?? null;
  const adminVideoSrc = heroVideo?.video_path ? publicApiUrl(heroVideo.video_path) : null;
  const heroSrc = adminVideoSrc ?? '/hero-demo.mp4';
  const heroPoster = heroVideo?.cover_path ? publicApiUrl(heroVideo.cover_path) : heroCardSvg;

  // A tab both swaps the headline and takes the visitor to its section:
  // top of the page for home, otherwise the matching landing section.
  const selectTab = (id: string) => {
    setActiveTab(id);
    const target = TABS.find((tab) => tab.id === id)?.target ?? '';
    if (!target) {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    document.getElementById(target)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const scrollToHow = () => {
    const target = document.getElementById('how');
    if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    else navigate('/');
  };

  return (
    <section
      aria-labelledby="hero-headline"
      className="relative -mt-20 flex min-h-[100dvh] w-full items-center overflow-hidden bg-[#0E3A75]"
    >
      {/* Premium futuristic backdrop: lighter blue base + atmospheric glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_30%,rgba(8,119,232,0.36),rgba(4,32,74,0.18)_45%,transparent_78%)]"
        animate={reduced ? undefined : { opacity: [0.78, 1, 0.78] }}
        transition={reduced ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_34%,rgba(8,119,232,0.24),transparent_72%)]"
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-[radial-gradient(ellipse_90%_75%_at_50%_-15%,rgba(0,82,169,0.38),transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[26%] h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,240,255,0.13),transparent_65%)] blur-2xl"
      />
      {/* Balanced warm orange core, centered in the hero */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_56%_46%_at_50%_55%,rgba(230,126,0,0.30),rgba(214,109,0,0.11)_50%,transparent_76%)]"
        animate={reduced ? undefined : { opacity: [0.82, 1, 0.82] }}
        transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Contrast vignette: softer edges so the lighter blue base stays bright */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_78%_at_50%_45%,transparent_36%,rgba(1,3,10,0.32)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#0E3A75] to-transparent"
      />
      {/* Very subtle orange edge accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[rgba(230,126,0,0.42)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/3 h-64 w-56 rounded-full bg-[radial-gradient(circle,rgba(230,126,0,0.14),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 bottom-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(230,126,0,0.12),transparent_70%)] blur-3xl"
      />
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-28 sm:px-6 sm:pb-10 sm:pt-32 lg:px-8 lg:pb-12 lg:pt-36">
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-2 lg:gap-5">
          <motion.div
            className="flex flex-col items-start text-start"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut' }}
          >
            <p className="mt-5 text-sm font-extrabold tracking-tight text-white sm:text-base">
              {pick(content?.hero_kicker, LANDING_DEFAULTS.heroKicker)}
            </p>

            <div className="mt-4 w-full max-w-xl">
              <SlideTabs tabs={TABS} activeId={activeTab} onChange={selectTab} ariaLabel="محاور الواجهة الرئيسية" />
            </div>

            <div className="mt-4 w-full min-h-[4.25rem] sm:min-h-[4.75rem] lg:min-h-[5.75rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={activeTab}
                  id="hero-headline"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.26, ease: 'easeOut' }}
                  className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
                >
                  {headline}
                </motion.h1>
              </AnimatePresence>
            </div>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/70 sm:text-base lg:text-lg">
              {pick(content?.hero_subtitle, LANDING_DEFAULTS.heroSubtitle)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/factory/assessment')}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#E67E00] px-6 py-3 text-sm font-bold text-white shadow-md shadow-black/10 transition-colors duration-200 hover:bg-[#d16b00] focus-visible:ring-2 focus-visible:ring-[#d16b00] focus-visible:ring-offset-2 focus-visible:outline-none sm:text-base"
              >
                {pick(content?.hero_primary_cta, LANDING_DEFAULTS.heroPrimaryCta)}
              </button>
              <button
                type="button"
                onClick={scrollToHow}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/35 bg-transparent px-6 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E3A75] focus-visible:outline-none sm:text-base"
              >
                {pick(content?.hero_secondary_cta, LANDING_DEFAULTS.heroSecondaryCta)}
              </button>
            </div>
          </motion.div>

          <motion.div
            className="relative flex min-h-[240px] items-center justify-center lg:min-h-[340px]"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.12, ease: 'easeOut' }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_50%_55%,rgba(2,8,23,0.70),transparent_78%)]"
            />

            <motion.div
              className="relative flex w-full max-w-xl flex-col items-center justify-center px-2 py-2 text-center"
              animate={reduced ? undefined : { y: [0, -7, 0] }}
              transition={reduced ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Hero media frame: always a video — the admin `hero` announcement when live, else the demo file */}
              <motion.div
                className="w-full overflow-hidden rounded-2xl border border-[rgba(230,126,0,0.34)] shadow-[0_18px_50px_rgba(1,6,20,0.65),0_0_30px_rgba(230,126,0,0.18)]"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.35, ease: 'easeOut' }}
              >
                <div>
                  <div className="relative isolate aspect-video w-full overflow-hidden bg-black">
                    <video
                      key={heroSrc}
                      className="h-full w-full object-cover"
                      src={heroSrc}
                      poster={heroPoster}
                      controls
                      autoPlay={!reduced}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={heroVideo?.title ?? 'فيديو تعريفي تجريبي'}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,23,0.10)_0%,rgba(2,8,23,0.05)_55%,rgba(2,8,23,0.35)_100%)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,126,0,0.62),rgba(8,119,232,0.48),transparent)]" />
                  </div>
                  {heroVideo && (
                    <button
                      type="button"
                      onClick={() => navigate(heroVideo.link_path ?? `/ads/${heroVideo.id}`)}
                      className="flex w-full items-center justify-between gap-2 bg-[#020817] px-4 py-2.5 text-right cursor-pointer hover:bg-[#0A1628] transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-white">{heroVideo.title}</span>
                        {heroVideo.badge_text && <span className="block truncate text-[10px] font-semibold text-[#E67E00]">{heroVideo.badge_text}</span>}
                      </span>
                      <span aria-hidden className="shrink-0 text-[10px] font-bold text-white/50">التفاصيل ←</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 text-right sm:grid-cols-2 lg:grid-cols-4">
          {showPortal('factory_member') && (
            <div
              onClick={() => navigate('/factory/dashboard')}
              className="jahez-card jahez-hero-card p-4.5 cursor-pointer text-right group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#DDEBFD] text-[#003a75] flex items-center justify-center group-hover:bg-[#004A93] group-hover:text-white transition-colors">
                  <Building2 className="w-5 h-5" />
                </div>
                <ArrowLeft className="w-4 h-4 text-[#98A2B3] group-hover:text-white group-hover:-translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-[#172033] group-hover:text-white transition-colors">بوابة المنشآت والمصانع</h4>
              <p className="text-[11px] text-[#667085] group-hover:text-white/70 mt-1 leading-relaxed transition-colors">
                تقييم الجدارة الرقمية، اكتشاف الحلول، وطلب خدمات التحول الذكي.
              </p>
            </div>
          )}

          {showPortal('provider_member') && (
            <div
              onClick={() => navigate('/provider/dashboard')}
              className="jahez-card jahez-hero-card p-4.5 cursor-pointer text-right group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#FFEDD5] text-[#002E4A] flex items-center justify-center group-hover:bg-[#E67E00] group-hover:text-white transition-colors">
                  <Briefcase className="w-5 h-5" />
                </div>
                <ArrowLeft className="w-4 h-4 text-[#98A2B3] group-hover:text-white group-hover:-translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-[#172033] group-hover:text-white transition-colors">بوابة مقدّمي الخدمات</h4>
              <p className="text-[11px] text-[#667085] group-hover:text-white/70 mt-1 leading-relaxed transition-colors">
                طرح الحلول الصناعية، استقبال طلبات المصانع، ومساحة التفاوض.
              </p>
            </div>
          )}

          {showPortal('imc_admin') && (
            <div
              onClick={() => navigate('/admin/dashboard')}
              className="jahez-card jahez-hero-card p-4.5 cursor-pointer text-right group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#E7F8EE] text-[#1D7E4C] flex items-center justify-center group-hover:bg-[#35B779] group-hover:text-white transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <ArrowLeft className="w-4 h-4 text-[#98A2B3] group-hover:text-white group-hover:-translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-[#172033] group-hover:text-white transition-colors">إدارة وحوكمة المنظومة (IMC)</h4>
              <p className="text-[11px] text-[#667085] group-hover:text-white/70 mt-1 leading-relaxed transition-colors">
                اعتماد مقدّمي الخدمات بالمعايير الخمسة، توثيق العقود، والرقابة المالية.
              </p>
            </div>
          )}

          {isVisitor && (
            <div className="jahez-card jahez-hero-card p-4.5 text-right group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#FEDCC2] text-[#A66F0B] flex items-center justify-center group-hover:bg-[#F2B84B] group-hover:text-white transition-colors">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <h4 className="font-bold text-sm text-[#172033] group-hover:text-white transition-colors">التسجيل والانضمام</h4>
              <p className="text-[11px] text-[#667085] group-hover:text-white/70 mt-1 leading-relaxed transition-colors">
                اشترك في المنصة كمنشأة صناعية أو كمقدّم خدمة معتمد.
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/register/factory')}
                  className="flex-1 py-1.5 rounded-lg bg-[#DDEBFD] text-[#003a75] text-[11px] font-bold hover:bg-[#004A93] hover:text-white transition-colors cursor-pointer"
                >
                  تسجيل منشأة
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register/provider')}
                  className="flex-1 py-1.5 rounded-lg bg-[#FFEDD5] text-[#002E4A] text-[11px] font-bold hover:bg-[#E67E00] hover:text-white transition-colors cursor-pointer"
                >
                  تسجيل مقدّم الخدمة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hero ads banner: admin-managed live announcements (public endpoint — visitors see it too),
            full content width, with the admin-set hyperlink (link_path) or the ad details page. */}
        <HeroAdsBanner feed={adsFeed} />
      </div>
    </section>
  );
};


