import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Megaphone, RotateCcw, Tag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api, publicApiUrl, type PublicAnnouncement } from '../../api';
import { useApiQuery, type ApiQuery } from '../../hooks/useApiQuery';
import { getAdPalette } from '../admin/colorOptions';
import { readRotationSeconds } from '../../lib/rotation';

const SLIDE_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Where the CTA of a hero ad goes: the admin-set hyperlink (link_path) or the ad details page. */
function targetOf(ad: PublicAnnouncement): string {
  return ad.link_path ?? `/ads/${ad.id}`;
}

/**
 * Full-width hero advertisement banner (ADR-022). It reads the same live announcements
 * IMC publishes (GET /public/announcements — no session, so visitors see it too) and shows
 * them as one edge-to-edge card inside the dark hero: cover (or palette fallback), title,
 * description, badge, countdown, and a CTA that follows the admin-set hyperlink (link_path)
 * or falls back to the ad details page. Rotation re-uses the admin-set period from
 * AdsManagement; with no live announcement nothing renders.
 */
export const HeroAdsBanner: React.FC<{ feed?: ApiQuery<PublicAnnouncement[]> }> = ({ feed }) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion() === true;
  // The landing page fetches the announcements once and shares the feed with the
  // strip below; standalone usage keeps its own query (disabled when a feed is passed).
  const fallback = useApiQuery((signal) => api.announcements.publicList('top', signal), [], { enabled: !feed });
  const ads = feed ?? fallback;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const items = ads.data ?? [];
  const count = items.length;

  // clamp the index when the ads list shrinks — render-phase adjustment (no effect)
  const [prevCount, setPrevCount] = useState(count);
  if (prevCount !== count) {
    setPrevCount(count);
    setIndex((i) => (i >= count ? 0 : i));
  }

  // autoplay — off while paused (hover/focus), with a single ad, or under reduced motion.
  // The period is re-read on every tick, so an admin change applies without a page reload.
  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const t = window.setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % count);
    }, readRotationSeconds() * 1000);
    return () => window.clearTimeout(t);
  }, [index, count, paused, reduced]);

  if (ads.status === 'success' && count === 0) return null;

  const go = (step: 1 | -1) => {
    setDirection(step);
    setIndex((i) => (i + step + count) % count);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(-1);
    }
  };

  const openTarget = (ad: PublicAnnouncement) => {
    const target = targetOf(ad);
    if (/^https?:\/\//i.test(target)) window.open(target, '_blank', 'noopener,noreferrer');
    else navigate(target);
  };

  return (
    <section
      dir="rtl"
      role="group"
      aria-roledescription="carousel"
      aria-label="إعلانات المنصة"
      data-ads-state={ads.status}
      className="mt-6 w-full"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-white">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E67E00] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E67E00]" />
          </span>
          إعلانات وحملات المنصة
        </span>
        {ads.status === 'success' && count > 1 && (
          <span className="text-[11px] font-semibold text-white/50" aria-live="polite">
            {index + 1} / {count}
          </span>
        )}
      </div>

      {ads.status === 'loading' && (
        <div
          className="w-full min-h-[220px] rounded-3xl border border-white/10 bg-white/[0.05] animate-pulse sm:min-h-[240px]"
          aria-busy="true"
          aria-label="جارٍ تحميل الإعلانات"
        />
      )}

      {ads.status === 'error' && (
        <div
          role="status"
          className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] py-10 text-xs text-white/60 sm:flex-row"
        >
          تعذّر تحميل الإعلانات حاليًا.
          <button
            type="button"
            onClick={ads.refetch}
            className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#E67E00] hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" /> إعادة المحاولة
          </button>
        </div>
      )}

      {ads.status === 'success' && count > 0 && (
        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <AnimatePresence mode="wait" initial={false}>
              {items.map((ad, i) => {
                if (i !== index) return null;
                const palette = getAdPalette(ad.color);
                const cover = ad.cover_path && !failed[ad.id] ? publicApiUrl(ad.cover_path) : null;
                const target = targetOf(ad);
                const external = /^https?:\/\//i.test(target);
                return (
                  <motion.article
                    key={ad.id}
                    initial={reduced ? false : { opacity: 0, x: direction === 1 ? -48 : 48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction === 1 ? 48 : -48 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.4, ease: SLIDE_EASE }}
                    aria-roledescription="slide"
                    aria-label={`${i + 1} من ${count}: ${ad.title}`}
                    className="grid w-full grid-cols-1 sm:grid-cols-2"
                  >
                    {/* Text side */}
                    <div className="flex min-w-0 flex-col items-start justify-center gap-3 p-5 text-start sm:p-7 lg:p-9">
                      <div className="flex flex-wrap items-center gap-2">
                        {ad.badge_text && (
                          <span
                            dir="auto"
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#E67E00] px-3 py-1 text-[11px] font-black text-white shadow-[0_6px_16px_rgba(255,138,0,0.4)]"
                          >
                            <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                            <span className="truncate">{ad.badge_text}</span>
                          </span>
                        )}
                        {ad.countdown_text && (
                          <span
                            dir="auto"
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/85"
                          >
                            <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                            <span className="truncate">{ad.countdown_text}</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-black leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl">
                        {ad.title}
                      </h2>
                      <p dir="auto" className="line-clamp-2 max-w-2xl text-xs leading-relaxed text-white/70 sm:text-sm">
                        {ad.description}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        {external ? (
                          <a
                            href={target}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#E67E00] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-black/20 transition-colors duration-200 hover:bg-[#E85B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
                          >
                            اعرف المزيد
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                          </a>
                        ) : (
                          <Link
                            to={target}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#E67E00] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-black/20 transition-colors duration-200 hover:bg-[#E85B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
                          >
                            اعرف المزيد
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => openTarget(ad)}
                          className="cursor-pointer text-[11px] font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline sm:text-xs"
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    </div>

                    {/* Cover side */}
                    <button
                      type="button"
                      onClick={() => openTarget(ad)}
                      aria-label={`عرض إعلان: ${ad.title}`}
                      className="relative block min-h-[180px] w-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E67E00] sm:min-h-[240px] lg:min-h-[280px]"
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={ad.cover_alt || ad.title}
                          loading={i === 0 ? 'eager' : 'lazy'}
                          draggable={false}
                          onError={() => setFailed((f) => ({ ...f, [ad.id]: true }))}
                          className="absolute inset-0 h-full w-full select-none object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${palette.soft} 0%, #020817 130%)` }}
                        >
                          <Megaphone aria-hidden="true" className="h-16 w-16 text-white/80" />
                        </div>
                      )}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#020817]/70 via-transparent to-transparent sm:bg-gradient-to-l sm:from-[#020817]/60 sm:via-transparent sm:to-transparent"
                      />
                    </button>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="الإعلان السابق"
                className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-[#020817]/60 text-white backdrop-blur transition-colors duration-200 hover:bg-[#E67E00] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] sm:inline-flex"
              >
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="الإعلان التالي"
                className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-[#020817]/60 text-white backdrop-blur transition-colors duration-200 hover:bg-[#E67E00] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] sm:inline-flex"
              >
                <ChevronLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              {count <= 5 && (
                <div role="group" aria-label="اختيار الإعلان" className="mt-3 flex items-center justify-center gap-1.5">
                  {items.map((ad, i) => {
                    const current = i === index;
                    return (
                      <button
                        key={ad.id}
                        type="button"
                        aria-current={current}
                        aria-label={`الإعلان ${i + 1}`}
                        onClick={() => {
                          setDirection(i > index ? 1 : -1);
                          setIndex(i);
                        }}
                        className="group/dot flex h-11 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
                      >
                        <span
                          className={`h-2 rounded-full transition-all duration-200 ${
                            current ? 'w-6 bg-[#E67E00]' : 'w-2 bg-white/30 group-hover/dot:bg-white/70'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};

