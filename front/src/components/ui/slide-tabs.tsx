import React, { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface SlideTabItem {
  id: string;
  label: string;
}

export interface SlideTabsProps {
  tabs: SlideTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

const INDICATOR_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SlideTabs: React.FC<SlideTabsProps> = ({ tabs, activeId, onChange, ariaLabel }) => {
  const reduced = useReducedMotion() === true;
  const indicatorId = useId();
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeIndex = tabs.findIndex((tab) => tab.id === activeId);
  const rovingId = activeIndex === -1 ? tabs[0]?.id : activeId;

  const focusTabAt = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    const element = tabRefs.current.get(tab.id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // Whatever selects a tab (click, arrows, or the parent), bring it into view —
  // on narrow screens the active tab otherwise hides off-strip.
  useEffect(() => {
    const element = tabRefs.current.get(activeId);
    element?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    });
    // oxlint-disable-next-line react/exhaustive-deps
  }, [activeId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    // In RTL the visual order is mirrored: ArrowLeft advances, ArrowRight goes back.
    const rtl = event.currentTarget.dir === 'rtl'
      || getComputedStyle(event.currentTarget).direction === 'rtl';
    let nextIndex: number;
    const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    const backward = event.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    if (forward) nextIndex = (index + 1) % tabs.length;
    else if (backward) nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    onChange(nextTab.id);
    focusTabAt(nextIndex);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? 'أقسام الواجهة الرئيسية'}
      className="flex w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-full border border-[#E6EAF0] bg-[#F7F9FC] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={tab.id === rovingId ? 0 : -1}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.id, element);
              else tabRefs.current.delete(tab.id);
            }}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'relative isolate flex shrink-0 cursor-pointer select-none items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold outline-none transition-colors duration-200',
              'focus-visible:ring-2 focus-visible:ring-[#004A93] focus-visible:ring-offset-2',
              isActive ? 'text-[#002E4A]' : 'text-[#667085] hover:text-[#172033]',
            ].join(' ')}
          >
            <AnimatePresence initial={false}>
              {isActive && (
                <motion.span
                  layoutId={`slide-tabs-${indicatorId}`}
                  initial={false}
                  exit={{ opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.22, ease: INDICATOR_EASE }}
                  className="absolute inset-0 rounded-full bg-white shadow-sm shadow-[#002E4A]/15"
                  aria-hidden="true"
                >
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#E67E00]" />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

