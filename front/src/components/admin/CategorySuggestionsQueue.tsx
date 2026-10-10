import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, fieldMessages } from '../../api';
import type { CategorySuggestion } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { formatDateTime } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { CardSkeleton } from '../ui/LoadingState';
import { Pagination } from '../ui/Pagination';
import { QueryBoundary } from '../ui/QueryBoundary';
import { ReasonModal } from '../ui/ReasonModal';

/**
 * IMC queue of provider-suggested categories. Approval marks the suggestion as a
 * workbook candidate (it never writes a catalog row); rejection needs a reason.
 */
export const CategorySuggestionsQueue: React.FC = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CategorySuggestion['status'] | 'all'>('pending');
  const [rejecting, setRejecting] = useState<CategorySuggestion | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useApiQuery(
    (signal) =>
      api.categorySuggestions.list({
        page,
        per_page: 12,
        filter: status === 'all' ? undefined : { status },
        signal,
      }),
    [page, status],
  );
  const approve = useApiMutation((id: number) => api.categorySuggestions.approve(id));

  const approveSuggestion = async (s: CategorySuggestion) => {
    const result = await approve.run(s.id);
    if (result.ok) {
      setNotice(`اعتُمد «${s.name_ar}» كمرشح لتحديث الكتالوج القادم.`);
      query.refetch();
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div role="status" className="p-3.5 rounded-xl bg-[#E7F8EE] border border-[#C5F0D5] text-xs font-semibold text-[#1D7E4C] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {notice}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl font-semibold cursor-pointer ${status === s ? 'bg-[#002E4A] text-white' : 'bg-white text-[#667085] border border-[#E6EAF0]'}`}
          >
            {s === 'pending' ? 'بانتظار المراجعة' : s === 'approved' ? 'معتمدة' : s === 'rejected' ? 'مرفوضة' : 'الكل'}
          </button>
        ))}
      </div>
      <QueryBoundary
        query={query}
        loading={<CardSkeleton />}
        isEmpty={(p) => p.data.length === 0}
        empty={<EmptyState title="لا توجد اقتراحات" description="لم يقترح أي مقدّم الخدمة تصنيفًا جديدًا بعد." />}
      >
        {(p) => (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {p.data.map((s) => (
                <Card key={s.id} title={s.name_ar} subtitle={`${s.service_provider_name ?? `مقدّم الخدمة ${s.service_provider_id}`} · اقتُرح ${formatDateTime(s.created_at)}`} accent="purple">
                  <div className="space-y-2 text-xs">
                    {s.name_en && (
                      <p className="text-[#667085]" dir="ltr">
                        {s.name_en}
                      </p>
                    )}
                    {s.description && (
                      <p className="text-[#344054]" dir="auto">
                        {s.description}
                      </p>
                    )}
                    {s.reason && (
                      <p className="text-[#667085]" dir="auto">
                        الحاجة: {s.reason}
                      </p>
                    )}
                    {s.review_reason && (
                      <p className="text-[#667085]" dir="auto">
                        رد الوزارة: {s.review_reason}
                      </p>
                    )}
                    {s.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="success"
                          size="sm"
                          icon={CheckCircle2}
                          isLoading={approve.pending}
                          onClick={() => void approveSuggestion(s)}
                        >
                          اعتماد (مرشح للكتالوج)
                        </Button>
                        <Button variant="danger" size="sm" icon={XCircle} onClick={() => setRejecting(s)}>
                          رفض بسبب
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <Pagination meta={p.meta} onPage={setPage} />
          </div>
        )}
      </QueryBoundary>
      {rejecting && (
        <ReasonModal
          title="رفض اقتراح التصنيف"
          subtitle={rejecting.name_ar}
          description="اكتب سبب الرفض ليقرأه مقدّم الخدمة ويصحح اقتراحه."
          label="سبب الرفض"
          required
          confirmLabel="رفض الاقتراح"
          onConfirm={(reason) => api.categorySuggestions.reject(rejecting.id, reason.trim())}
          onDone={() => {
            setRejecting(null);
            setNotice(`رُفض «${rejecting.name_ar}» مع توضيح السبب للمقدّم الخدمة.`);
            query.refetch();
          }}
          onClose={() => setRejecting(null)}
        />
      )}
      {approve.error !== null && (
        <p className="text-xs text-[#B82B3B]">{fieldMessages(approve.error, 'status').join(' ') || 'تعذر تنفيذ القرار.'}</p>
      )}
    </div>
  );
};

