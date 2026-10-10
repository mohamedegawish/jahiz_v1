import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Compass, GraduationCap } from 'lucide-react';
import { api } from '../../api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { formatMoneyOf } from '../../lib/format';
import { PERIOD_LABEL, packagePrice } from '../../lib/packages';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/LoadingState';
import { QueryBoundary } from '../../components/ui/QueryBoundary';

const TRAINING_CATEGORY = 'dx_consulting_enablement';
const TRAINING_HINT = /(تدريب|تأهيل|تمكين|كورس|دورة|تعليم|توعية)/;

/**
 * A provider's training page: courses and enablement services with clear prices.
 * Training-first: the enablement category and training-named services come first,
 * every package shows its monthly/annual price, and unpriced ones say the price
 * comes in the provider's offer.
 */
export const ProviderTraining: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const providerId = Number(id);
  const navigate = useNavigate();
  const profile = useApiQuery((signal) => api.directory.get(providerId, signal), [providerId]);
  const listings = useApiQuery(
    (signal) => api.serviceListings.list({ per_page: 100, filter: { provider: providerId }, signal }),
    [providerId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFEDD5] text-[#002E4A] text-xs font-bold mb-2">
            <GraduationCap className="w-3.5 h-3.5" /> الكورسات والخدمات التدريبية
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">
            {profile.data?.name ?? 'ملف مقدّم الخدمة'} — التدريب
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
            الكورسات وخدمات التأهيل والتمكين لدى هذا مقدّم الخدمة، بأسعار واضحة لكل كورس. الأسعار استرشادية؛ السعر النهائي في عرض مقدّم الخدمة.
          </p>
        </div>
        <Button variant="outline" size="sm" icon={Compass} onClick={() => navigate('/factory/providers')}>
          عودة لدليل مقدّمي الخدمات
        </Button>
      </div>

      <QueryBoundary query={listings} loading={<CardSkeleton />}>
        {(page) => {
          const sorted = [...page.data].sort((a, b) => score(b) - score(a));
          if (sorted.length === 0) {
            return (
              <EmptyState
                title="لا توجد خدمات تدريبية لدى هذا مقدّم الخدمة حاليًا"
                description="لم يدرج مقدّم الخدمة بعد خدمات تدريب أو تمكين معتمدة تظهر لمنشأتكم."
                actionText="عودة لدليل مقدّمي الخدمات"
                onAction={() => navigate('/factory/providers')}
              />
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {sorted.map((listing) => (
                <Card
                  key={listing.id}
                  title={listing.service?.name_ar ?? ''}
                  subtitle={listing.service?.category?.name_ar ?? ''}
                  accent={isTraining(listing.service?.category?.code, listing.service?.name_ar) ? 'purple' : 'blue'}
                >
                  <div className="space-y-2 text-xs">
                    {isTraining(listing.service?.category?.code, listing.service?.name_ar) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEEAFE] text-[#5146A5] text-[10px] font-bold">
                        <GraduationCap className="w-3 h-3" /> تدريبية
                      </span>
                    )}
                    {(listing.packages ?? []).length === 0 && (
                      <p className="text-[#667085]">يحدد مقدّم الخدمة السعر في عرضه.</p>
                    )}
                    {(listing.packages ?? []).map((pkg) => {
                      const monthly = packagePrice(pkg, 'monthly');
                      const annual = packagePrice(pkg, 'annual');
                      return (
                        <div key={pkg.id} className="p-3 rounded-xl border border-[#E6EAF0] bg-[#F7F9FC] space-y-1" data-course={pkg.id}>
                          <div className="font-bold text-[#172033]">{pkg.name_ar}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 font-bold text-[#002E4A]">
                            {monthly !== null && (
                              <span>
                                {formatMoneyOf(monthly)} / {PERIOD_LABEL.monthly}
                              </span>
                            )}
                            {annual !== null && (
                              <span>
                                {formatMoneyOf(annual)} / {PERIOD_LABEL.annual}
                              </span>
                            )}
                            {monthly === null && annual === null && <span className="text-[#667085] font-normal">السعر في العرض</span>}
                          </div>
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/factory/services/${listing.service?.id}`)}>
                      التفاصيل وطلب الخدمة
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
};

function isTraining(code?: string | null, name?: string | null): boolean {
  if (code === TRAINING_CATEGORY) return true;
  return Boolean(name && TRAINING_HINT.test(name));
}

function score(listing: { service?: { category?: { code?: string | null } | null; name_ar?: string | null } | null }): number {
  return isTraining(listing.service?.category?.code, listing.service?.name_ar ?? undefined) ? 1 : 0;
}

