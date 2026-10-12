import React, { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { PublicHeader } from '../components/layout/PublicHeader';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { RouteFallback } from '../components/ui/RouteFallback';
import { api, publicApiUrl } from '../api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LANDING_DEFAULTS, logoSrc, pick } from '../lib/landingDefaults';

/** Footer placement: the second (bigger) admin-uploaded video announcement above the footer columns (hidden when none). */
const FooterAdVideo: React.FC = () => {
  const feed = useApiQuery((signal) => api.announcements.publicList('footer', signal), []);
  const ad = feed.data?.[1] ?? feed.data?.[0];
  if (!ad?.video_path) return null;
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-[#E6EAF0] bg-[#0B1220] shadow-[0_18px_50px_rgba(1,6,20,0.25)]">
      <video
        src={publicApiUrl(ad.video_path)}
        poster={ad.cover_path ? publicApiUrl(ad.cover_path) : undefined}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label={ad.title}
        className="aspect-video w-full bg-[#0B1220]"
      />
      <Link
        to={`/ads/${ad.id}`}
        className="flex w-full items-center justify-between gap-2 bg-[#0B1220] px-4 py-3 text-right transition-colors hover:bg-[#141f36]"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-white">{ad.title}</span>
          {ad.badge_text && <span className="block truncate text-xs font-semibold text-[#E67E00]">{ad.badge_text}</span>}
        </span>
        <span aria-hidden className="shrink-0 text-xs font-bold text-white/50">التفاصيل ←</span>
      </Link>
    </div>
  );
};

/**
 * Layout of the public marketing pages (the landing page and advertisements). It has no
 * sidebar and needs no session; the portals use AppLayout behind RequireAuth.
 *
 * The logo and footer copy are admin-managed (GET /public/landing); anything unset
 * falls back to the bundled copy, so the layout never depends on the API.
 */
export const PublicLayout: React.FC = () => {
  const content = useApiQuery((signal) => api.landing.publicContent(signal), []);
  const settings = content.data ?? null;
  return (
  <div className="min-h-screen bg-[#F7F9FC] flex flex-col text-right" dir="rtl">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-[#002E4A] focus:shadow-lg"
    >
      تخطَّ إلى المحتوى
    </a>
    <PublicHeader logoUrl={logoSrc(settings, publicApiUrl)} />
    <main id="main-content" className="flex-1 w-full">
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </main>
    <footer className="border-t border-[#E6EAF0] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        <FooterAdVideo />
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
          <div className="col-span-2">
            <img src={logoSrc(settings, publicApiUrl)} alt="جَاهِز" className="h-10 w-auto object-contain" />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#667085]">
              {pick(settings?.footer_about, LANDING_DEFAULTS.footerAbout)}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FFEDD5] px-3 py-1 text-[11px] font-black text-[#002E4A]">
              {pick(settings?.footer_tagline, LANDING_DEFAULTS.footerTagline)}
            </p>
          </div>
          <nav aria-label="البوابات">
            <h3 className="text-xs font-black text-[#172033]">البوابات</h3>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/register/factory" className="text-xs text-[#667085] transition-colors hover:text-[#003a75]">تسجيل منشأة صناعية</Link></li>
              <li><Link to="/register/provider" className="text-xs text-[#667085] transition-colors hover:text-[#003a75]">تسجيل مقدّم خدمة</Link></li>
              <li><Link to="/login" className="text-xs text-[#667085] transition-colors hover:text-[#003a75]">تسجيل الدخول</Link></li>
            </ul>
          </nav>
          <nav aria-label="المنصة">
            <h3 className="text-xs font-black text-[#172033]">المنصة</h3>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/factory/assessment" className="text-xs text-[#667085] transition-colors hover:text-[#003a75]">تقييم الجاهزية الرقمية</Link></li>
              <li><Link to="/factory/catalog" className="text-xs text-[#667085] transition-colors hover:text-[#003a75]">كتالوج الخدمات</Link></li>
              <li><Link to="/forgot-password" className="text-xs text-[#667085] transition-colors hover:text-[#003a75]">استعادة كلمة المرور</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#E6EAF0] pt-5 sm:flex-row">
          <p className="text-[11px] text-[#98A2B3]">{pick(settings?.footer_copyright, LANDING_DEFAULTS.footerCopyright)}</p>
          <p className="text-[11px] text-[#98A2B3]">{pick(settings?.footer_supervision, LANDING_DEFAULTS.footerSupervision)}</p>
        </div>
      </div>
    </footer>
  </div>
  );
};

