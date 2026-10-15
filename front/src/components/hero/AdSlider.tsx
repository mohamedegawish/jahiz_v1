import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Megaphone, Tag } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { publicApiUrl, type PublicAnnouncement } from '../../api';
import { getAdPalette } from '../admin/colorOptions';
import { rotationSeconds } from '../../lib/rotation';
import { useLandingSettings } from '../../hooks/useLandingSettings';

const SWIPE_COMMIT_PX = 48;
const SLIDE_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Simple one-at-a-time image slider of live announcements. Each slide is the
 * ad cover (or its palette fallback), the ad title over a scrim, and a looping
 * down-arrow — the whole slide links to /ads/:id. RTL-aware: the next slide
 * enters from the left. Autoplay pauses on hover/focus and is disabled under
 * prefers-reduced-motion (where transitions snap instead of animating).
 */
export const AdSlider: React.FC<{ ads: PublicAnnouncement[] }> = ({ ads }) => {
  const count = ads.length;
  const reduced = useReducedMotion() === true;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const pointer = useRef({ x: 0, y: 0, tracking: false, swiped: false });
  const swipedClick = useRef(false);

  // clamp the index when the ads list shrinks — render-phase adjustment (no effect)
  const [prevCount, setPrevCount] = useState(count);
  if (prevCount !== count) {
    setPrevCount(count);
    setIndex((i) => (i >= count ? 0 : i));
  }

  // autoplay — off while paused (hover/focus) or under reduced motion. The period is the
  // admin's setting from the landing settings (the same for every visitor).
  const periodMs = rotationSeconds(useLandingSettings()) * 1000;
  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const t = window.setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % count);
    }, periodMs);
    return () => window.clearTimeout(t);
  }, [index, count, paused, reduced, periodMs]);

  if (count === 0) return null;

  const single = count === 1;

  const go = (step: 1 | -1) => {
    setDirection(step);
    setIndex((i) => (i + step + count) % count);
  };

  const pick = (target: number) => {
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    setIndex(target);
  };

  // cyclic offset of slide i from the active one; RTL: next lives on the LEFT (-100%),
  // previous on the RIGHT (+100%) so advancing mirrors the reading direction
  const offsetOf = (i: number) => {
    const cyc = (((i - index) % count) + count) % count;
    if (cyc === 0) return 0;
    if (direction === 1) return cyc === 1 ? -100 : 100;
    return cyc === count - 1 ? 100 : -100;
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

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipedClick.current = false;
    pointer.current = { x: e.clientX, y: e.clientY, tracking: true, swiped: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p.tracking) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.swiped && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) p.swiped = true;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p.tracking) return;
    p.tracking = false;
    if (!p.swiped) return;
    const dx = e.clientX - p.x;
    if (Math.abs(dx) < SWIPE_COMMIT_PX) return;
    swipedClick.current = true; // the synthetic click after the drag must not navigate
    go(dx > 0 ? 1 : -1);
  };

  const cancelPointer = () => {
    pointer.current.tracking = false;
  };

  const onSlideClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!swipedClick.current) return;
    swipedClick.current = false;
    e.preventDefault();
  };

  return (
    <div
      dir="rtl"
      role="group"
      aria-roledescription="carousel"
      aria-label="إعلانات المنصة"
          className="relative mx-auto w-full max-w-[560px] px-4 pb-2 md:max-w-[860px] lg:max-w-[1080px]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative">
        <div
          className="grid overflow-hidden rounded-2xl"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelPointer}
          onPointerLeave={cancelPointer}
        >
          {ads.map((ad, i) => {
            const active = i === index;
            const palette = getAdPalette(ad.color);
            const cover = ad.cover_path ? publicApiUrl(ad.cover_path) : null;
            return (
              <motion.div
                key={ad.id}
                aria-hidden={!active}
                inert={!active}
                className={`[grid-area:1/1] min-w-0 ${active ? 'z-10' : 'z-0'}`}
                initial={false}
                animate={{ x: `${offsetOf(i)}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.55, ease: SLIDE_EASE }}
              >
                <Link
                  to={`/ads/${ad.id}`}
                  aria-label={`عرض إعلان: ${ad.title}`}
                  onClick={onSlideClick}
                  className="group relative block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.08)] transition-shadow duration-200 group-hover:shadow-[0_16px_36px_rgba(23,32,51,0.14)] sm:aspect-[16/9]">
                    {cover && !failed[ad.id] ? (
                      <img
                        src={cover}
                        alt={ad.cover_alt || ad.title}
                        loading={active ? 'eager' : 'lazy'}
                        draggable={false}
                        onError={() => setFailed((f) => ({ ...f, [ad.id]: true }))}
                        className="absolute inset-0 h-full w-full select-none object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${palette.soft} 0%, #FFFFFF 100%)` }}
                      >
                        <Megaphone aria-hidden="true" className="h-14 w-14" style={{ color: palette.ink }} />
                      </div>
                    )}

                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
                    />

                    {ad.badge_text && (
                      <span
                        dir="auto"
                        className="absolute right-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-[#002E4A] shadow-[0_6px_16px_rgba(23,32,51,0.2)] sm:text-xs"
                      >
                        <Tag aria-hidden="true" className="size-3.5 shrink-0 text-[#E67E00]" />
                        <span className="truncate">{ad.badge_text}</span>
                      </span>
                    )}

                    <span className="absolute inset-x-0 bottom-0 block px-4 pb-6 text-sm font-bold leading-snug text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:px-5 sm:pb-7 sm:text-lg lg:text-xl">
                      {ad.title}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {!single && (
          <>
            {/* RTL mirror: the right chevron steps back, the left one steps forward */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="الإعلان السابق"
              className="absolute right-3 top-[calc(50%-18px)] z-20 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#E6EAF0] bg-white/95 text-[#002E4A] shadow-[0_6px_16px_rgba(23,32,51,0.16)] backdrop-blur transition-colors duration-200 hover:border-[#002E4A] hover:bg-[#002E4A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="الإعلان التالي"
              className="absolute left-3 top-[calc(50%-18px)] z-20 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#E6EAF0] bg-white/95 text-[#002E4A] shadow-[0_6px_16px_rgba(23,32,51,0.16)] backdrop-blur transition-colors duration-200 hover:border-[#002E4A] hover:bg-[#002E4A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {!single && count <= 5 && (
        <div role="group" aria-label="اختيار الإعلان" className="mt-3 flex items-center justify-center gap-1.5">
          {ads.map((ad, i) => {
            const current = i === index;
            return (
              <button
                key={ad.id}
                type="button"
                aria-current={current}
                aria-label={`الإعلان ${i + 1}`}
                onClick={() => pick(i)}
                className="group/dot flex h-11 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E67E00] focus-visible:ring-offset-2"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-200 ${
                    current ? 'w-6 bg-[#E67E00]' : 'w-2 bg-[#CCD5E2] group-hover/dot:bg-[#002E4A]/60'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

