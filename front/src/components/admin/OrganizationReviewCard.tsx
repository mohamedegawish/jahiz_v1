import React, { useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, Camera, ChevronLeft, Factory as FactoryIcon, Loader2 } from 'lucide-react';
import { api } from '../../api';
import type { ProviderApprovalStatus } from '../../api';
import { formatDate } from '../../lib/format';
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

interface OrganizationReviewCardProps {
  kind: 'provider' | 'factory';
  id: number;
  name: string;
  /** Reads the private logo, when there is one. */
  loadLogo?: (signal: AbortSignal) => Promise<Blob>;
  logoVersion?: number;
  status: ProviderApprovalStatus;
  submittedAt: string | null;
  /** Short facts under the name: location, sector, experience. */
  facts: string[];
  /** Chips: services or sectors. */
  chips: { label: string; tone: 'blue' | 'purple' | 'warning' }[];
  /** Profile completeness guide (0–100) and what is missing. */
  completion: { percent: number; missing: string[] };
  /** An extra line under the chips (readiness, pending listings). */
  footnote?: React.ReactNode;
  onDetails: () => void;
}

const CHIP_TONES = {
  blue: 'bg-[#DDEBFD] text-[#003a75]',
  purple: 'bg-[#FFEDD5] text-[#002E4A]',
  warning: 'bg-[#FEF5E7] text-[#A66F0B]',
} as const;

/**
 * A provider or factory in an IMC approval queue, in the Jahez PlatformCard style: an orange image
 * slot carrying the organization's logo (replaceable from the card through the documents API), the
 * name, soft brand chips and the status badge used across the portals. The card summarises; every
 * decision is taken on the details page.
 */
export const OrganizationReviewCard: React.FC<OrganizationReviewCardProps> = ({
  kind,
  id,
  name,
  loadLogo,
  logoVersion,
  status,
  submittedAt,
  facts,
  chips,
  completion,
  footnote,
  onDetails,
}) => {
  const Fallback = kind === 'provider' ? Building2 : FactoryIcon;

  const [uploadedDocId, setUploadedDocId] = useState<number | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const upload = useApiMutation((file: File) =>
    kind === 'factory' ? api.factories.uploadDocument(id, 'logo', file) : api.serviceProviders.uploadDocument(id, 'logo', file),
  );
  const version = uploadedDocId ?? logoVersion;
  const load =
    uploadedDocId != null
      ? (signal: AbortSignal) =>
          kind === 'factory' ? api.factories.documentFile(id, uploadedDocId, signal) : api.serviceProviders.documentFile(id, uploadedDocId, signal)
      : loadLogo;

  const pickLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = localFileProblem(file, LOGO_ACCEPT, LOGO_MAX_KB);
    setFileProblem(problem);
    if (problem) return;
    const result = await upload.run(file);
    if (result.ok) setUploadedDocId(result.data.id);
  };

  const barColor = completion.percent >= 80 ? 'bg-[#35B779]' : completion.percent >= 50 ? 'bg-[#F2B84B]' : 'bg-[#E45B6A]';
  const visibleChips = chips.slice(0, 4);

  return (
    <article className={CARD_SHELL} data-organization-kind={kind} data-organization-id={id}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <ApprovalBadge status={status} size="sm" />
        <div className="relative">
          <div className={IMAGE_SLOT}>
            {load && version !== undefined ? (
              <PrivateImage load={load} version={version} alt={name} className="h-8 w-8 object-contain" fallback={<Fallback className="h-5 w-5" />} />
            ) : (
              <Fallback className="h-5 w-5" />
            )}
          </div>
          <label className={UPLOAD_BADGE} title="تغيير الشعار">
            {upload.pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            <input type="file" accept={LOGO_ACCEPT} className="sr-only" onChange={pickLogo} disabled={upload.pending} aria-label="رفع الشعار" />
          </label>
        </div>
      </div>

      <h3 className="text-sm font-extrabold leading-snug text-[#172033] line-clamp-2">{name}</h3>
      {facts.length > 0 && <p className="mt-1.5 text-xs leading-relaxed text-[#667085] line-clamp-1">{facts.join(' · ')}</p>}
      <p className="mt-1 text-[10px] text-[#98A2B3] flex items-center gap-1">
        <CalendarDays className="w-3 h-3" /> تاريخ التسجيل: {formatDate(submittedAt)}
      </p>

      {(Boolean(fileProblem) || Boolean(upload.error)) && (
        <div className="mt-2 space-y-1">
          {fileProblem && <p className="text-[10px] font-semibold text-[#B82B3B]">{fileProblem}</p>}
          {upload.error ? <ApiErrorState compact error={upload.error} /> : null}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1 min-h-[22px]">
        {visibleChips.length === 0 ? (
          <span className="text-[11px] text-[#98A2B3]">{kind === 'provider' ? 'لم تُحدَّد خدمات' : 'لم تُحدَّد قطاعات'}</span>
        ) : (
          visibleChips.map((chip) => (
            <span key={chip.label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_TONES[chip.tone]}`}>
              {chip.label}
            </span>
          ))
        )}
        {chips.length > visibleChips.length && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1F4F9] text-[#667085]">+{chips.length - visibleChips.length}</span>}
      </div>

      {footnote && <div className="mt-2 text-[11px]">{footnote}</div>}

      <div className="mt-auto border-t border-[#F1F4F9] pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#667085]">اكتمال الملف</span>
          <span className="text-[11px] font-bold text-[#172033]">{completion.percent}%</span>
          <span aria-hidden className={`ms-auto ${ARROW_DISC}`}>
            <ArrowLeft className="h-4 w-4" />
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#F1F4F9] overflow-hidden" title={completion.missing.length ? `ناقص: ${completion.missing.join('، ')}` : 'مكتمل'}>
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${completion.percent}%` }} />
        </div>
        <Button variant="secondary" size="sm" className="w-full" icon={ChevronLeft} onClick={onDetails} data-details-id={id}>
          تفاصيل
        </Button>
      </div>
    </article>
  );
};

