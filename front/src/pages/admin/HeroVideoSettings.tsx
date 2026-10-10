import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Upload, Video as VideoIcon } from 'lucide-react';
import { api, fieldMessages } from '../../api';
import type { AdminAnnouncement } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { VIDEO_ACCEPT, VIDEO_MAX_KB, formatBytes, localFileProblem } from '../../lib/files';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { FieldError } from '../../components/ui/FieldError';
import { CardSkeleton } from '../../components/ui/LoadingState';
import { QueryBoundary } from '../../components/ui/QueryBoundary';

const STATE: Record<AdminAnnouncement['state'], { label: string; variant: 'success' | 'warning' | 'neutral' | 'blue' }> = {
  live: { label: 'ظاهر للزوار الآن', variant: 'success' },
  scheduled: { label: 'منشور — لم يبدأ بعد', variant: 'blue' },
  ended: { label: 'انتهت مدته', variant: 'neutral' },
  draft: { label: 'مسودة — الزوار يشاهدون الفيديو التجريبي', variant: 'warning' },
};

/**
 * Dedicated hero-video settings (a simplified front for the `hero` announcement):
 * the admin uploads one video, previews it and publishes it — visitors see it in
 * the landing hero frame instead of the bundled demo file.
 */
export const HeroVideoSettings: React.FC = () => {
  const list = useApiQuery((signal) => api.announcements.list({ page: 1, per_page: 30, signal }), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">فيديو الواجهة الرئيسية</h2>
        <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
          الفيديو الذي يظهر في إطار الواجهة الرئيسية للمنصة. ارفع فيديو (mp4 / webm) وانشره ليحل محل الفيديو التجريبي فورًا.
        </p>
      </div>

      <QueryBoundary query={list} loading={<CardSkeleton />}>
        {(result) => {
          const heroes = result.data.filter((a) => a.placement === 'hero');
          const active =
            heroes.find((a) => a.state === 'live' && a.video_path) ??
            heroes.find((a) => a.video_path) ??
            heroes[0] ??
            null;
          return <HeroVideoCard key={active?.id ?? 'new'} record={active} onChanged={list.refetch} />;
        }}
      </QueryBoundary>
    </div>
  );
};

const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());
const LINK_HINT = 'مسار داخل المنصة يبدأ بـ / مثل /register/factory — اتركه فارغًا لفتح صفحة الإعلان.';

const HeroVideoCard: React.FC<{ record: AdminAnnouncement | null; onChanged: () => void }> = ({ record, onChanged }) => {
  const [title, setTitle] = useState(record?.title ?? 'فيديو الواجهة الرئيسية');
  const [link, setLink] = useState(record?.link_path ?? '');
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const previewUrl = useAdminVideo(record?.video_path ?? null);
  const toggle = useApiMutation(() =>
    record && record.published_at ? api.announcements.unpublish(record.id) : record ? api.announcements.publish(record.id) : Promise.reject(new Error('no record')),
  );
  const saveMeta = useApiMutation(() => {
    if (!record) return Promise.reject(new Error('no record'));
    if (link.trim() !== '' && !link.trim().startsWith('/')) return Promise.reject(new Error('link must start with /'));
    return api.announcements.update(record.id, { title: title.trim(), link_path: orNull(link) });
  });
  const removeVideo = useApiMutation(() => {
    if (!record) return Promise.reject(new Error('no record'));
    return api.announcements.removeVideo(record.id);
  });

  // Upload (or create-then-upload on first use) and publish at once, so the new
  // video goes live immediately without extra steps.
  const upload = useApiMutation(async (file: File) => {
    let id = record?.id ?? null;
    if (id === null) {
      const created = await api.announcements.create({
        title: title.trim() === '' ? 'فيديو الواجهة الرئيسية' : title.trim(),
        description: 'فيديو الواجهة الرئيسية للمنصة.',
        color: 'orange',
        placement: 'hero',
        link_path: orNull(link),
        sort_order: 0,
      });
      id = created.id;
    }
    await api.announcements.uploadVideo(id, file);
    const current = await api.announcements.list({ page: 1, per_page: 30 });
    const saved = current.data.find((a) => a.id === id);
    if (saved && !saved.published_at) await api.announcements.publish(id);
  });

  const busy = toggle.pending || saveMeta.pending || upload.pending || removeVideo.pending;
  const state = record ? STATE[record.state] : null;
  const metaDirty = !record || title.trim() !== record.title || (link.trim() === '' ? null : link.trim()) !== record.link_path;

  const pickFile = (file: File | null) => {
    setFileError(null);
    setPendingFile(null);
    if (!file) return;
    const problem = localFileProblem(file, VIDEO_ACCEPT, VIDEO_MAX_KB);
    if (problem) {
      setFileError(problem);
      return;
    }
    setPendingFile(file);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    const result = await upload.run(pendingFile);
    if (result.ok) {
      setPendingFile(null);
      onChanged();
    }
  };

  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {state ? (
          <Badge size="sm" variant={state.variant}>
            {state.label}
          </Badge>
        ) : (
          <Badge size="sm" variant="warning">
            لا يوجد فيديو — الزوار يشاهدون الفيديو التجريبي
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {record?.video_path ? (
            previewUrl ? (
              <video key={previewUrl} className="w-full aspect-video rounded-xl bg-black object-cover" src={previewUrl} controls preload="metadata" playsInline />
            ) : (
              <div className="w-full aspect-video rounded-xl bg-black/5 animate-pulse" />
            )
          ) : (
            <div className="w-full aspect-video rounded-xl border border-dashed border-[#CCD5E2] flex flex-col items-center justify-center gap-2 text-[#667085]">
              <VideoIcon className="w-8 h-8" />
              <span className="text-xs font-bold">لم يُرفع فيديو بعد</span>
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span className="font-bold text-[#172033] block">عنوان الفيديو (يظهر أسفله في الواجهة)</span>
            <input
              className="w-full p-2.5 rounded-xl border border-[#E6EAF0] text-xs focus:outline-none focus:border-[#004A93] bg-white"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
            <FieldError messages={fieldMessages(saveMeta.error, 'title')} />
          </label>

          <label className="block space-y-1">
            <span className="font-bold text-[#172033] block">رابط الفيديو (اختياري — يفتح عند الضغط على شريط الفيديو)</span>
            <input
              className="w-full p-2.5 rounded-xl border border-[#E6EAF0] text-xs focus:outline-none focus:border-[#004A93] bg-white"
              value={link}
              dir="ltr"
              maxLength={255}
              placeholder="/register/factory"
              onChange={(e) => {
                setLink(e.target.value);
                setLinkProblem(null);
              }}
            />
            <span className="block text-[11px] text-[#98A2B3]">{LINK_HINT}</span>
            <FieldError messages={linkProblem ? [linkProblem, ...fieldMessages(saveMeta.error, 'link_path')] : fieldMessages(saveMeta.error, 'link_path')} />
          </label>

          <div className="block">
            <span className="font-bold text-[#172033] block mb-1">ملف الفيديو (mp4 / webm — حتى {formatBytes(VIDEO_MAX_KB * 1024)})</span>
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-[#CCD5E2] cursor-pointer hover:bg-[#F7F9FC]">
              <Upload className="w-4 h-4 text-[#002E4A]" />
              <span className="truncate">{record?.video_path ? 'استبدال الفيديو الحالي' : 'اختيار فيديو'}</span>
              <input
                type="file"
                accept={VIDEO_ACCEPT}
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  pickFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            <FieldError messages={fileError ? [fileError] : fieldMessages(upload.error, 'file')} />
            {pendingFile && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[#F7F9FC] border border-[#E6EAF0] px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-bold text-[#172033]">{pendingFile.name}</span>
                <span className="shrink-0 text-[11px] text-[#667085]">{formatBytes(pendingFile.size)}</span>
                <Button size="sm" variant="primary" icon={Upload} isLoading={upload.pending} disabled={busy} onClick={confirmUpload}>
                  رفع ونشر
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPendingFile(null)}>
                  إلغاء
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {record && (
              <Button size="sm" variant="primary" disabled={busy || title.trim() === '' || !metaDirty} isLoading={saveMeta.pending} onClick={async () => {
                if (link.trim() !== '' && !link.trim().startsWith('/')) {
                  setLinkProblem('الرابط لازم يبدأ بـ / مثل /register/factory.');
                  return;
                }
                const result = await saveMeta.run();
                if (result.ok) onChanged();
              }}>
                حفظ العنوان والرابط
              </Button>
            )}
            <Button size="sm" variant={record?.published_at ? 'outline' : 'success'} icon={record?.published_at ? EyeOff : Eye} isLoading={toggle.pending} disabled={busy || !record?.video_path} onClick={async () => {
              const result = await toggle.run();
              if (result.ok) onChanged();
            }}>
              {record?.published_at ? 'إلغاء النشر' : 'نشر'}
            </Button>
            {record?.video_path && (
              <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={() => setConfirmRemove(true)}>
                حذف الفيديو
              </Button>
            )}
          </div>

          {toggle.error !== null && <ApiErrorState compact error={toggle.error} />}
          {saveMeta.error !== null && <ApiErrorState compact error={saveMeta.error} />}
          {upload.error !== null && <ApiErrorState compact error={upload.error} />}
          {removeVideo.error !== null && <ApiErrorState compact error={removeVideo.error} />}

          <p className="text-[11px] text-[#98A2B3] leading-relaxed">
            الرفع ينشر الفيديو تلقائيًا في الواجهة. «إلغاء النشر» أو «حذف الفيديو» يعيد الفيديو التجريبي للزوار. الضغط على شريط الفيديو يفتح الرابط المحدد، أو صفحة الإعلان عند تركه فارغًا.
          </p>
        </div>
      </div>

      {confirmRemove && record && (
        <ConfirmModal
          title="حذف فيديو الواجهة"
          description="حذف الفيديو المرفوع نهائيًا؟ سيشاهد الزوار الفيديو التجريبي بدلًا منه."
          confirmLabel="حذف"
          variant="danger"
          onConfirm={() => api.announcements.removeVideo(record.id)}
          onDone={() => {
            setConfirmRemove(false);
            onChanged();
          }}
          onClose={() => setConfirmRemove(false)}
        />
      )}
    </div>
  );
};

/** The hero video file read with the session token into an object URL. */
function useAdminVideo(path: string | null): string | null {
  const [loaded, setLoaded] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    api.announcements
      .video(path, controller.signal)
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
  return path && loaded?.path === path ? loaded.url : null;
}

