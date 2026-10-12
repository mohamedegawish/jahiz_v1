import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LandingFaqItem } from '../../api/types';
import { LANDING_DEFAULTS, pick, pickList } from '../../lib/landingDefaults';

/**
 * The FAQ accordion. Items and title are admin-managed; anything unset falls
 * back to the bundled copy.
 */
export const FaqSection: React.FC<{ items?: LandingFaqItem[] | null; title?: string | null }> = ({ items, title }) => {
  const faqItems = pickList(items, LANDING_DEFAULTS.faqItems);
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="jahez-card p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-1 rounded-full bg-[#E67E00]" />
          <h2
            id="faq-title"
            className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight"
          >
            {pick(title, LANDING_DEFAULTS.faqTitle)}
          </h2>
      </div>

      <div className="space-y-3">
        {faqItems.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-[#E6EAF0] bg-white overflow-hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker:hidden] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004A93]">
              <span className="text-sm font-bold text-[#172033]">
                {item.question}
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 text-[#002E4A] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-4 text-xs sm:text-sm text-[#667085] leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
};

