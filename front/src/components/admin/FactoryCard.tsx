import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Camera, CheckCircle2, ClipboardCheck, Eye, Factory as FactoryIcon, FileSearch, Loader2, PauseCircle, RotateCcw, Send, XCircle } from 'lucide-react';
import { api } from '../../api';
import type { FactorySummary } from '../../api';
import { formatDate } from '../../lib/format';
import { allowedApprovalDecisions, type ApprovalDecision } from '../../lib/provider';
import { LOGO_ACCEPT, LOGO_MAX_KB, localFileProblem } from '../../lib/files';
import { useApiMutation } from '../../hooks/useApiMutation';
import { ApprovalBadge } from '../ui/ApprovalBadge';
import { ApiErrorState } from '../ui/ApiErrorState';
import { Button } from '../ui/Button';
import { PrivateImage } from '../ui/PrivateFile';
import { ReadinessBadge } from '../ui/ReadinessBadge';

/** The shared Jahez advertisement-card shell (the home page's PlatformCard), including its hover state. */
const CARD_SHELL =
  'group rounded-2xl border border-[#E6EAF0] bg-white p-5 flex flex-col text-right transition-all duration-200 hover:-translate-y-[3px] hover:border-[#E67E00] hover:bg-[linear-gradient(180deg,#FFFFFF_45%,#FFFBEC_100%)] hover:shadow-[0_12px_28px_-8px_rgba(0,62,130,0.18),0_6px_14px_-6px_rgba(8,119,232,0.20)] focus-visible:border-[#004A93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004A93]/25 active:border-[#004A93] active:shadow-[0_8px_20px_-4px_rgba(0,62,130,0.14)]';

/** The circular arrow disc that closes every Jahez card footer. */
const ARROW_DISC =
  'shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#E6EAF0] bg-white text-[#002E4A] transition-all duration-300 group-hover:border-[#E67E00] group-hover:bg-[#E67E00] group-hover:text-white group-active:border-[#004A93] group-active:bg-[#004A93]';

/** The orange square that holds a card's image (or its icon placeholder). */
const IMAGE_SLOT =
  'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#FFD9B3] bg-[#FFEDD5] text-[#E67E00] transition-colors duration-300 group-hover:border-[#E67E00]';

/** The small camera badge on the image slot: pick a logo to upload or replace the current one. */
const UPLOAD_BADGE =
  'absolute -bottom-1.5 -left-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[#FFD9B3] bg-white text-[#E67E00] shadow-xs transition-colors hover:border-[#E67E00] hover:bg-[#FFEDD5]';

const DECISIONS: Record<ApprovalDecision, { label: string; variant: 'success' | 'danger' | 'outline'; icon: typeof CheckCircle2 }> = {
  approved: { label: 'اعتماد', variant: 'success', icon: CheckCircle2 },
  changes_requested: { label: 'طلب استكمال', variant: 'outline', icon: RotateCcw },
  rejected: { label: 'رفض', variant: 'danger', icon: XCircle },
  suspended: { label: 'إيقاف', variant: 'danger', icon: PauseCircle },
};

interface FactoryCardProps {
  factory: FactorySummary;
  sizeName: string | null;
  /** The decisions the signed-in administrator may take (`factories.approve`); the API checks again. */
  canDecide: boolean;
  onDetails: () => void;
  onDecide: (decision: ApprovalDecision) => void;
}

/**
 * A factory in the IMC list, in the Jahez PlatformCard style: an orange image slot carrying the
 * factory's logo (replaceable from the card through the documents API), the name, place, sector chips,
 * the account's approval status and, separately, its readiness level and score as the server computed
 * them. Legal details and documents are not on the card; they are on the review page.
 */
export const FactoryCard: React.FC<FactoryCardProps> = ({ factory, sizeName, canDecide, onDetails, onDecide }) => {
  const navigate = useNavigate();
  const reviewPath = `/admin/approvals/factories/${factory.id}`;
  const readiness = factory.current_readiness ?? null;
  const place = [factory.governorate, factory.city].filter(Boolean).join('، ');
  const tags = [...(factory.sectors ?? []).map((sector) => sector.name_ar), sizeName].filter((tag): tag is string => Boolean(tag));
  const decisions = canDecide ? allowedApprovalDecisions(factory.approval.status) : [];

  const [logoOverride, setLogoOverride] = useState<number | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const upload = useApiMutation((file: File) => api.factories.uploadDocument(factory.id, 'logo', file));
  const logoId = logoOverride ?? factory.logo?.id ?? null;

  const pickLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = localFileProblem(file, LOGO_ACCEPT, LOGO_MAX_KB);
    setFileProblem(problem);
    if (problem) return;
    const result = await upload.run(file);
    if (result.ok) setLogoOverride(result.data.id);
  };

  return (
    <div className="relative h-full" data-factory-id={factory.id} data-approval={factory.approval.status}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(reviewPath)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(reviewPath);
          }
        }}
        className={`${CARD_SHELL} h-full cursor-pointer`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="text-[10px] font-semibold text-[#98A2B3] self-center" title="مستوى الجاهزية الرقمية الحالي كما حسبه الخادم">
            {readiness ? `${readiness.total_score} / 40` : 'لم يُقيَّم بعد'}
          </span>
          <div className="relative">
            <div className={IMAGE_SLOT}>
              {logoId != null ? (
                <PrivateImage
                  load={(signal) => api.factories.documentFile(factory.id, logoId, signal)}
                  version={logoId}
                  alt={factory.name}
                  className="h-8 w-8 object-contain"
                  fallback={<FactoryIcon className="h-5 w-5" />}
                />
              ) : (
                <FactoryIcon className="h-5 w-5" />
              )}
            </div>
            <label className={UPLOAD_BADGE} title="تغيير الشعار">
              {upload.pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              <input type="file" accept={LOGO_ACCEPT} className="sr-only" onChange={pickLogo} disabled={upload.pending} aria-label="رفع شعار المنشأة" />
            </label>
          </div>
        </div>

        <h3 className="text-sm font-extrabold leading-snug text-[#172033] line-clamp-2">{factory.name}</h3>
        {place && <p className="mt-1.5 text-xs leading-relaxed text-[#667085] line-clamp-2">{place}</p>}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#DDEBFD] px-2 py-0.5 text-[10px] font-semibold text-[#003a75]">
                {tag}
              </span>
            ))}
          </div>
        )}

        {(Boolean(fileProblem) || Boolean(upload.error)) && (
          <div className="mt-2 space-y-1">
            {fileProblem && <p className="text-[10px] font-semibold text-[#B82B3B]">{fileProblem}</p>}
            {upload.error ? <ApiErrorState compact error={upload.error} /> : null}
          </div>
        )}

        <div className="mt-auto border-t border-[#F1F4F9] pt-3">
          <div className="mb-2 flex items-center gap-2">
            <ApprovalBadge status={factory.approval.status} size="sm" />
            <ReadinessBadge category={readiness?.category ?? null} size="sm" />
            <span aria-hidden className={`ms-auto ${ARROW_DISC}`}>
              <ArrowLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-[#667085]">
              <div className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 shrink-0" />
                <dt className="sr-only">طلبات الخدمة</dt>
                <dd>{factory.service_requests_count ?? 0} طلب خدمة</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <dt className="sr-only">تاريخ التسجيل</dt>
                <dd>سُجّلت {formatDate(factory.created_at)}</dd>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                <dt className="sr-only">آخر تقييم</dt>
                <dd>{readiness ? `آخر تقييم ${formatDate(readiness.completed_at)} (الإصدار ${readiness.questionnaire_version ?? '—'})` : 'لم تُكمل تقييم الجاهزية'}</dd>
              </div>
            </dl>
            {factory.approval.reason && factory.approval.status !== 'approved' && (
              <p className="p-2 rounded-lg bg-[#FEF5E7] text-[#A66F0B] leading-relaxed line-clamp-2" title={factory.approval.reason}>
                {factory.approval.reason}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#F1F4F9]">
              <Button size="sm" variant="secondary" icon={Eye} onClick={onDetails}>
                الملف الكامل
              </Button>
              <Link
                to={reviewPath}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6EAF0] text-[#344054] font-semibold hover:bg-[#F7F9FC]"
              >
                <FileSearch className="w-3.5 h-3.5" /> المراجعة والوثائق
              </Link>
              {readiness && (
                <Link
                  to={`/admin/readiness?tab=results&factory=${factory.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6EAF0] text-[#344054] font-semibold hover:bg-[#F7F9FC]"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> نتائج التقييم
                </Link>
              )}
            </div>
            {decisions.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="قرارات الاعتماد">
                {decisions.map((decision) => {
                  const button = DECISIONS[decision];
                  return (
                    <Button key={decision} size="sm" variant={button.variant} icon={button.icon} onClick={() => onDecide(decision)} data-decision={decision}>
                      {button.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

