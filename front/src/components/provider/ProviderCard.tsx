import React from 'react';
import { ArrowLeft, Building2, ExternalLink } from 'lucide-react';
import { api } from '../../api';
import type { ProviderDirectoryEntry } from '../../api';
import { PrivateImage } from '../ui/PrivateFile';

interface ProviderCardProps {
  provider: ProviderDirectoryEntry;
  onOpen: (provider: ProviderDirectoryEntry) => void;
  /** Position on the current page, rendered as the blue card number. */
  num?: number;
  /** Highlight a catalog service code the viewer is browsing. */
  highlightService?: string;
}

/** A provider as the directory exposes it: only public profile fields; contact details only if the API sends them (OQ-37). */
export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onOpen, num, highlightService }) => {
  const services = provider.services ?? [];
  const shown = services.slice(0, 4);

  return (
    <div
      data-provider-id={provider.id}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(provider)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(provider);
        }
      }}
      className="group rounded-2xl border border-[#E6EAF0] bg-white p-5 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:border-[#E67E00] hover:bg-[linear-gradient(180deg,#FFFFFF_45%,#FFFBEC_100%)] hover:shadow-[0_12px_28px_-8px_rgba(0,62,130,0.18),0_6px_14px_-6px_rgba(8,119,232,0.20)] focus-visible:border-[#004A93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004A93]/25 active:border-[#004A93] active:shadow-[0_8px_20px_-4px_rgba(0,62,130,0.14)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        {num != null && (
          <span className="mt-0.5 text-[13px] font-black tracking-[0.16em] text-[#004A93]">
            {String(num).padStart(2, '0')}
          </span>
        )}
        <div className="ms-auto flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#FFD9B3] bg-[#FFEDD5] text-[#E67E00] transition-colors duration-300 group-hover:border-[#E67E00]">
          {provider.has_logo ? (
            <PrivateImage
              load={(signal) => api.directory.logo(provider.id, signal)}
              version={provider.id}
              alt=""
              className="h-7 w-7 object-contain"
            />
          ) : (
            <Building2 className="h-5 w-5" />
          )}
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-extrabold text-sm text-[#172033] group-hover:text-[#002E4A] transition-colors leading-snug min-w-0">{provider.name}</h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E7F8EE] text-[#1D7E4C] shrink-0">معتمد</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(provider.sectors ?? []).map((sector) => (
          <span key={sector.code} className="px-2 py-0.5 rounded-full bg-[#DDEBFD] text-[#003a75] text-[10px] font-semibold">
            {sector.name_ar}
          </span>
        ))}
      </div>

      <div className="mb-4">
        {provider.description && <p className="text-[11px] text-[#667085] leading-relaxed line-clamp-2 mb-2" dir="auto">{provider.description}</p>}

        <div className="text-[11px] text-[#667085] space-y-1">
          <div className="flex items-center justify-between">
            <span>الخبرة في التحول الرقمي:</span>
            <span className="font-semibold text-[#172033]">{provider.dx_experience_years === null ? '—' : `${provider.dx_experience_years} سنة`}</span>
          </div>
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[#003a75] hover:underline font-semibold"
              dir="ltr"
            >
              {provider.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-[#F1F4F9]">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-[#98A2B3] block mb-1.5">الخدمات المقدمة ({services.length})</span>
            <div className="flex flex-wrap gap-1">
              {shown.map((service) => (
                <span
                  key={service.code}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    service.code === highlightService ? 'bg-[#002E4A] text-white' : 'bg-[#FFEDD5] text-[#002E4A]'
                  }`}
                >
                  {service.name_ar}
                </span>
              ))}
              {services.length > shown.length && <span className="text-[10px] text-[#98A2B3] self-center">+{services.length - shown.length}</span>}
            </div>
          </div>
          <span
            aria-hidden
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#E6EAF0] bg-white text-[#002E4A] transition-all duration-300 group-hover:border-[#E67E00] group-hover:bg-[#E67E00] group-hover:text-white group-active:border-[#004A93] group-active:bg-[#004A93]"
          >
            <ArrowLeft className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
};

