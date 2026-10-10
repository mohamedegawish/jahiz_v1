import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import type { AdminAnnouncement } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { formatDateTime } from '../../lib/format';
import { AnnouncementFormModal } from '../../components/admin/AnnouncementFormModal';
import { PromotionsPanel } from '../../components/admin/PromotionsPanel';
import { AdCard } from '../../components/hero/AdCard';
import { MAX_ROTATION_SECONDS, MIN_ROTATION_SECONDS, readRotationSeconds, saveRotationSeconds } from '../../lib/rotation';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/LoadingState';
import { Pagination } from '../../components/ui/Pagination';
import { QueryBoundary } from '../../components/ui/QueryBoundary';

const STATE: Record<AdminAnnouncement['state'], { label: string; variant: 'success' | 'warning' | 'neutral' | 'blue' }> = {
  live: { label: 'ظاهر للزوار', variant: 'success' },
  scheduled: { label: 'منشور — لم يبدأ بعد', variant: 'blue' },
  ended: { label: 'انتهت مدته', variant: 'neutral' },
  draft: { label: 'مسودة', variant: 'warning' },
};

const PLACEMENT: Record<AdminAnnouncement['placement'], string> = {
  top: 'بانر الواجهة (فوق)',
  hero: 'فيديو الواجهة الرئيسية',
  bottom: 'الشريط أسفل الواجهة (تحت)',
  footer: 'فيديو الفوتر',
};

/**
 * IMC advertising: promoted provider listings in the factory portal (ADR-020) and the announcements
 * of the public landing page (ADR-022), both stored by the API. The slide rotation period
 * (RotationControl below) is the one exception: the API has no field for it, so it is kept
 * in this browser's localStorage and re-read by AdSlider on every tick.
 */
export const AdsManagement: React.FC = () => {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ announcement: AdminAnnouncement | null } | null>(null);
  const [deleting, setDeleting] = useState<AdminAnnouncement | null>(null);
  const list = useApiQuery((signal) => api.announcements.list({ page, per_page: 12, signal }), [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">الإعلانات والحملات الترويجية</h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5">ترويج خدمات مقدّمي الخدمات داخل بوابة المصانع، وإعلانات الصفحة الرئيسية العامة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/hero-video" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-bold text-[#002E4A] hover:bg-[#F7F9FC]">
            إعداد فيديو الواجهة الرئيسية
          </Link>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setEditing({ announcement: null })}>
            إعلان جديد للصفحة الرئيسية
          </Button>
        </div>
      </div>

      <PromotionsPanel />

      <RotationControl />

      <div className="pt-2">
        <h3 className="text-base font-bold text-[#172033]">إعلانات الصفحة الرئيسية العامة</h3>
        <p className="text-xs text-[#667085]">
          تظهر للزوار حسب الموضع المحدد: بانر الواجهة (فوق)، فيديو الواجهة الرئيسية (مكان الصورة — ارفع mp4/webm ثم انشر)، الشريط المتحرك أسفلها (تحت)، أو فيديو الفوتر — بعد النشر وخلال مدة الظهور، مرتبة حسب «ترتيب العرض». زر «اعرف المزيد» يفتح الرابط المحدد في الحقل، أو صفحة الإعلان عند تركه فارغًا. المسودة لا يراها أحد غير المركز.
        </p>
      </div>

      <QueryBoundary
        query={list}
        loading={<CardSkeleton />}
        isEmpty={(result) => result.data.length === 0}
        empty={
          <EmptyState
            title="لا توجد إعلانات بعد"
            description="أنشئ إعلانًا ثم انشره ليظهر في الصفحة الرئيسية."
            actionText="إعلان جديد"
            onAction={() => setEditing({ announcement: null })}
          />
        }
      >
        {(result) => (
          <>
            <div className="grid gap-4 justify-items-center [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
              {result.data.map((announcement) => (
                <AnnouncementTile
                  key={announcement.id}
                  announcement={announcement}
                  onEdit={() => setEditing({ announcement })}
                  onDelete={() => setDeleting(announcement)}
                  onChanged={list.refetch}
                />
              ))}
            </div>
            <Pagination meta={result.meta} onPage={setPage} />
          </>
        )}
      </QueryBoundary>

      {editing && (
        <AnnouncementFormModal
          announcement={editing.announcement}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.refetch();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="حذف المسودة"
          description={`حذف مسودة «${deleting.title}» نهائيًا؟ لا يمكن التراجع.`}
          confirmLabel="حذف"
          variant="danger"
          onConfirm={() => api.announcements.remove(deleting.id)}
          onDone={() => {
            setDeleting(null);
            list.refetch();
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
};

/**
 * Slide period of the public home-page strip. The API has no field for it (backend
 * frozen), so the value lives in this browser's localStorage; AdSlider re-reads it
 * on every tick, so a change applies without a reload. Out-of-range input reverts
 * to the last saved value on blur/Enter.
 */
const RotationControl: React.FC = () => {
  const [saved, setSaved] = useState(() => readRotationSeconds());
  const [value, setValue] = useState(() => String(saved));

  const commit = () => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_ROTATION_SECONDS && parsed <= MAX_ROTATION_SECONDS) {
      saveRotationSeconds(parsed);
      setSaved(parsed);
      setValue(String(parsed));
    } else {
      setValue(String(saved));
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6EAF0] bg-white px-4 py-3">
      <div>
        <p className="text-sm font-bold text-[#172033]">مدة تدوير الشريط المتحرك</p>
        <p className="text-xs text-[#667085]">
          الفاصل الزمني بين الشريحة والتالية، من {MIN_ROTATION_SECONDS} إلى {MAX_ROTATION_SECONDS} ثانية — يُحفظ على هذا المتصفح.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={MIN_ROTATION_SECONDS}
          max={MAX_ROTATION_SECONDS}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          aria-label="مدة تدوير الشريط بالثواني"
          className="w-20 rounded-lg border border-[#E6EAF0] px-2 py-1.5 text-center text-sm font-bold text-[#172033] outline-none focus:border-[#004A93]"
        />
        <span className="text-xs text-[#667085]">ثانية</span>
      </div>
    </div>
  );
};

const AnnouncementTile: React.FC<{ announcement: AdminAnnouncement; onEdit: () => void; onDelete: () => void; onChanged: () => void }> = ({
  announcement,
  onEdit,
  onDelete,
  onChanged,
}) => {
  const coverUrl = useAdminCover(announcement.cover_path);
  const toggle = useApiMutation(() => (announcement.published_at ? api.announcements.unpublish(announcement.id) : api.announcements.publish(announcement.id)));
  const state = STATE[announcement.state];

  return (
    <div className="w-full max-w-[340px] space-y-2" data-announcement-id={announcement.id} data-announcement-state={announcement.state}>
      <div className="jahez-ad-preview flex justify-center pointer-events-none select-none">
        <AdCard ad={announcement} coverSrc={coverUrl} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
        <Badge size="sm" variant={state.variant}>
          {state.label}
        </Badge>
        <span className="text-[#98A2B3]">{PLACEMENT[announcement.placement]}</span>
        <span className="text-[#98A2B3]">ترتيب {announcement.sort_order}</span>
        {announcement.ends_at && <span className="text-[#98A2B3]">حتى {formatDateTime(announcement.ends_at)}</span>}
      </div>
      <div className="text-center">
        <h4 className="font-bold text-sm text-[#172033] truncate" title={announcement.title}>{announcement.title}</h4>
        {announcement.description && (
          <p className="mt-1 line-clamp-2 text-[11px] text-[#667085] leading-relaxed">{announcement.description}</p>
        )}
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant={announcement.published_at ? 'outline' : 'success'}
          icon={announcement.published_at ? EyeOff : Eye}
          isLoading={toggle.pending}
          onClick={async () => {
            const result = await toggle.run();
            if (result.ok) onChanged();
          }}
        >
          {announcement.published_at ? 'إلغاء النشر' : 'نشر'}
        </Button>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={onEdit}>
          تعديل
        </Button>
        {!announcement.published_at && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={onDelete}>
            حذف
          </Button>
        )}
      </div>
      {toggle.error !== null && <ApiErrorState compact error={toggle.error} />}
    </div>
  );
};

/** A draft's cover is not public: read it with the session token into an object URL. */
function useAdminCover(path: string | null): string | null {
  const [loaded, setLoaded] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    api.announcements
      .cover(path, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ path, url: objectUrl });
      })
      .catch(() => setLoaded({ path, url: null }));
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  // The URL of a previous path is never shown for a new one.
  return path && loaded?.path === path ? loaded.url : null;
}

