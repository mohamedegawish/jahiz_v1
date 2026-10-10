import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Layers, Megaphone, Sparkles } from 'lucide-react';
import { api } from '../../api';
import type { ServiceListing } from '../../api';
import { approvalLabel } from '../../lib/labels';
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

/** The provider's logo in a circular avatar, read with the session token; initials when there is none. */
export const ProviderAvatar: React.FC<{ provider: ServiceListing['provider']; size?: 'sm' | 'lg' }> = ({ provider, size = 'sm' }) => {
  const box = size === 'lg' ? 'w-20 h-20' : 'w-9 h-9';
  const fallback = (
    <div className={`${box} rounded-full bg-white border border-[#E6EAF0] text-[#002E4A] flex items-center justify-center shadow-xs`}>
      <Building2 className={size === 'lg' ? 'w-8 h-8' : 'w-4 h-4'} />
    </div>
  );
  if (!provider?.logo_path) return fallback;
  const path = provider.logo_path;
  return (
    <PrivateImage
      load={(signal) => api.serviceListings.logo(path, signal)}
      version={path}
      alt={provider.name}
      className={`${box} rounded-full object-contain bg-white border border-[#E6EAF0] shadow-xs`}
      fallback={fallback}
    />
  );
};

interface ServiceListingCardProps {
  listing: ServiceListing;
  /** Where the card and its "details" action lead. */
  detailsPath: string;
  /** Extra actions under the card (request, manage). */
  footer?: React.ReactNode;
  /** Show the provider's approval status (the provider's own portal). */
  showApproval?: boolean;
}

/**
 * One provider's listing of a catalog service, in the Jahez PlatformCard style: an orange image slot
 * carrying the provider's logo, the service name, brand chips and the provider row, closed by the
 * arrow disc. The catalog part (service name, category) is IMC's fixed catalog; the provider part is
 * its own profile; a promotion is IMC's paid placement and is always labelled «إعلان».
 */
export const ServiceListingCard: React.FC<ServiceListingCardProps> = ({ listing, detailsPath, footer, showApproval = false }) => {
  const navigate = useNavigate();
  const provider = listing.provider;
  const logoPath = provider?.logo_path ?? null;
  const desc = listing.promotion?.headline ?? provider?.description ?? undefined;
  const tags = [
    { label: listing.service?.category?.name_ar, className: 'bg-[#DDEBFD] text-[#003a75]' },
    { label: listing.recommended ? 'موصى بها لمنشأتك' : undefined, className: 'bg-[#FFEDD5] text-[#002E4A]' },
    { label: provider?.governorate ?? undefined, className: 'bg-[#F1F4F9] text-[#667085]' },
  ].filter((tag): tag is { label: string; className: string } => Boolean(tag.label));
  const meta = provider?.governorate ?? listing.service?.category?.name_ar ?? undefined;

  return (
    <div className="relative" data-listing-id={listing.id} data-promoted={listing.promotion ? 'true' : 'false'}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(detailsPath)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(detailsPath);
          }
        }}
        className={`${CARD_SHELL} cursor-pointer`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {listing.promotion && (
            <span
              className="inline-flex items-center gap-1 rounded-lg border border-[#FDE5BE] bg-[#FEF5E7] px-2 py-1 text-[10px] font-bold text-[#A66F0B] shadow-xs"
              title="إعلان ممول من مركز تحديث الصناعة"
            >
              <Megaphone className="h-3 w-3" /> {listing.promotion.label}
            </span>
          )}
          <div className={IMAGE_SLOT}>
            {logoPath ? (
              <PrivateImage
                load={(signal) => api.serviceListings.logo(logoPath, signal)}
                version={logoPath}
                alt={provider?.name ?? ''}
                className="h-8 w-8 object-contain"
                fallback={<Layers className="h-5 w-5" />}
              />
            ) : (
              <Layers className="h-5 w-5" />
            )}
          </div>
        </div>

        <h3 className="text-sm font-extrabold leading-snug text-[#172033] line-clamp-2">{listing.service?.name_ar ?? '—'}</h3>
        {desc && (
          <p className="mt-1.5 text-xs leading-relaxed text-[#667085] line-clamp-2" dir="auto">
            {desc}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag.label} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2.5">
          <ProviderAvatar provider={provider} />
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#172033] truncate">{provider?.name}</div>
            <div className="text-[10px] text-[#98A2B3]">
              {provider?.dx_experience_years != null ? `خبرة ${provider.dx_experience_years} سنة في التحول الرقمي` : 'مقدّم خدمة'}
            </div>
          </div>
          {showApproval && provider?.approval_status && (
            <span
              className={`mr-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                provider.approval_status === 'approved' ? 'bg-[#E7F8EE] text-[#1D7E4C]' : 'bg-[#FEF5E7] text-[#A66F0B]'
              }`}
            >
              {approvalLabel(provider.approval_status)}
            </span>
          )}
          {listing.recommended && !showApproval && <Sparkles className="w-4 h-4 text-[#002E4A] mr-auto" aria-label="موصى بها" />}
        </div>

        <div className="mt-auto flex items-end gap-3 border-t border-[#F1F4F9] pt-3">
          <div className="min-w-0 flex-1 space-y-3" onClick={(e) => e.stopPropagation()}>
            {footer ?? <span className="text-[11px] font-semibold text-[#98A2B3]">{meta}</span>}
          </div>
          <span aria-hidden className={ARROW_DISC}>
            <ArrowLeft className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
};

