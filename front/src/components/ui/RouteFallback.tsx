import React from 'react';

/** Suspense fallback for the code-split portal routes (kept tiny: it ships in the entry chunk). */
export const RouteFallback: React.FC = () => (
  <div
    className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
    role="status"
    aria-label="جارٍ تحميل الصفحة"
  >
    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#002E4A] border-t-transparent" />
    <span className="text-xs font-semibold text-[#667085]">جارٍ تحميل الصفحة…</span>
  </div>
);

