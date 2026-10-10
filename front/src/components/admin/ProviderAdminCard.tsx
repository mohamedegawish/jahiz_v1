import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Building2, CalendarDays, Camera, CheckCircle2, FileSearch, Layers, Loader2, PauseCircle, RotateCcw, XCircle } from 'lucide-react';
import { api } from '../../api';
import type { ServiceProvider } from '../../api';
import { formatDate } from '../../lib/format';
import { allowedApprovalDecisions, type ApprovalDecision } from '../../lib/provider';
import { LOGO_ACCEPT, LOGO_MAX_KB, localFileProblem } from '../../lib/files';
import { useApiMutation } from '../../hooks/useApiMutation';
import { ApprovalBadge } from '../ui/ApprovalBadge';
import { ApiErrorState } from '../ui/ApiErrorState';
import { Button } from '../ui/Button';
import { PrivateImage } from '../ui/PrivateFile';

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

interface ProviderAdminCardProps {
  provider: ServiceProvider;
  /** The signed-in administrator may decide on providers (`service_providers.approve`); the API checks again. */
  canDecide: boolean;
  onDecide: (decision: ApprovalDecision) => void;
}

/**
 * A service provider in the IMC list, in the Jahez PlatformCard style: an orange image slot carrying
 * the provider's logo (replaceable from the card through the documents API), the name, place, sector
 * chips, experience, the account's approval status and how many of its listed services IMC approved.
 * Legal details, contact data and documents are not on the card; they are on the review page.
 */
export const ProviderAdminCard: React.FC<ProviderAdminCardProps> = ({ provider, canDecide, onDecide }) => {
  const navigate = useNavigate();
  const reviewPath = `/admin/approvals/providers/${provider.id}`;
  const listings = provider.service_listings ?? [];
  const approvedListings = listings.filter((listing) => listing.status === 'approved').length;
  const pendingListings = listings.filter((listing) => listing.status === 'pending').length;
  const place = [provider.governorate, provider.city].filter(Boolean).join('، ');
  const decisions = canDecide ? allowedApprovalDecisions(provider.approval.status) : [];

  const [logoOverride, setLogoOverride] = useState<number | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const upload = useApiMutation((file: File) => api.serviceProviders.uploadDocument(provider.id, 'logo', file));
  const logoId = logoOverride ?? provider.documents?.logo?.id ?? null;

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
    <div className="relative h-full" data-provider-id={provider.id} data-approval={provider.approval.status}>
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
          <span className="text-[10px] font-semibold text-[#98A2B3] self-center" title="الخدمات التي اعتمدها المركز من خدمات مقدّم الخدمة">
            {approvedListings} / {listings.length} خدمة معتمدة
          </span>
          <div className="relative">
            <div className={IMAGE_SLOT}>
              {logoId != null ? (
                <PrivateImage
                  load={(signal) => api.serviceProviders.documentFile(provider.id, logoId, signal)}
                  version={logoId}
                  alt={provider.name}
                  className="h-8 w-8 object-contain"
                  fallback={<Building2 className="h-5 w-5" />}
                />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <label className={UPLOAD_BADGE} title="تغيير الشعار">
              {upload.pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              <input type="file" accept={LOGO_ACCEPT} className="sr-only" onChange={pickLogo} disabled={upload.pending} aria-label="رفع شعار مقدّم الخدمة" />
            </label>
          </div>
        </div>

        <h3 className="text-sm font-extrabold leading-snug text-[#172033] line-clamp-2">{provider.name}</h3>
        {(provider.description ?? place) && (
          <p className="mt-1.5 text-xs leading-relaxed text-[#667085] line-clamp-2" dir="auto">
            {provider.description ?? place}
          </p>
        )}

        {(provider.sectors ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(provider.sectors ?? []).map((sector) => (
              <span key={sector.code} className="rounded-full bg-[#DDEBFD] px-2 py-0.5 text-[10px] font-semibold text-[#003a75]">
                {sector.name_ar}
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
            <ApprovalBadge status={provider.approval.status} size="sm" />
            {pendingListings > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FEF5E7] text-[#A66F0B] text-[10px] font-bold">{pendingListings} خدمة بانتظار الاعتماد</span>
            )}
            <span aria-hidden className={`ms-auto ${ARROW_DISC}`}>
              <ArrowLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-[#667085]">
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <dt className="sr-only">الخبرة</dt>
                <dd>{provider.dx_experience_years === null ? 'الخبرة غير محددة' : `خبرة ${provider.dx_experience_years} سنة`}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <dt className="sr-only">تاريخ التسجيل</dt>
                <dd>سُجّل {formatDate(provider.created_at)}</dd>
              </div>
              {place && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <dt className="sr-only">المقر</dt>
                  <dd>{place}</dd>
                </div>
              )}
            </dl>
            {provider.approval.reason && provider.approval.status !== 'approved' && (
              <p className="p-2 rounded-lg bg-[#FEF5E7] text-[#A66F0B] leading-relaxed line-clamp-2" title={provider.approval.reason}>
                {provider.approval.reason}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#F1F4F9]">
              <Link
                to={reviewPath}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFEDD5] text-[#002E4A] font-semibold hover:bg-[#FFEDD5]"
              >
                <FileSearch className="w-3.5 h-3.5" /> الملف الكامل والمراجعة
              </Link>
              <Link
                to={`/admin/services?listing_status=all&search=${encodeURIComponent(provider.name)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6EAF0] text-[#344054] font-semibold hover:bg-[#F7F9FC]"
              >
                <Layers className="w-3.5 h-3.5" /> خدماته
              </Link>
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

