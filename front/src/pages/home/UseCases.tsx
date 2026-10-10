import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Play } from 'lucide-react';
import { api, publicApiUrl } from '../../api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getAdPalette } from '../../components/admin/colorOptions';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/LoadingState';
import { Reveal } from '../../components/ui/Reveal';

/**
 * Success stories (Use Cases): live announcements that carry a video.
 * Public page — no session needed. Each card plays the announcement's video
 * (public endpoint, no token) with its cover as poster.
 */
export const UseCases: React.FC = () => {
  const navigate = useNavigate();
  const top = useApiQuery((signal) => api.announcements.publicList('top', signal), []);
  const bottom = useApiQuery((signal) => api.announcements.publicList('bottom', signal), []);
  const footer = useApiQuery((signal) => api.announcements.publicList('footer', signal), []);
  const loading = top.status === 'loading' || bottom.status === 'loading' || footer.status === 'loading';
  const failed = top.status === 'error' || bottom.status === 'error' || footer.status === 'error';
  const all = [...(top.data ?? []), ...(bottom.data ?? []), ...(footer.data ?? [])];
  const videos = all.filter((a) => a.video_path);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F8EE] text-[#1D7E4C] text-xs font-bold">
          <Clapperboard className="w-3.5 h-3.5" /> قصص النجاح
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">استخدامات ناجحة من المنظومة</h1>
        <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
          فيديوهات وقصص نجاح لمصانع ومقدّمن الخدمات طبّقوا التحول الرقمي عبر المنصة — تُدار من لوحة الوزارة (الإعلانات) وتظهر هنا تلقائيًا.
        </p>
      </div>

      {loading && <CardSkeleton />}
      {failed && (
        <Card className="p-6 text-center text-xs text-[#B82B3B]">
          تعذر تحميل قصص النجاح. حاول مرة أخرى لاحقًا.
        </Card>
      )}
      {!loading && !failed && videos.length === 0 && (
        <EmptyState
          title="لا توجد قصص نجاح بالفيديو بعد"
          description="تنشر الوزارة قصص النجاح من لوحة الإعلانات (مع فيديو)، وستظهر هنا فور نشرها."
          actionText="العودة للصفحة الرئيسية"
          onAction={() => navigate('/')}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {videos.map((ad, i) => (
          <Reveal key={ad.id} delay={Math.min(i * 0.06, 0.24)}>
            <VideoCard
              title={ad.title}
              description={ad.description}
              videoSrc={publicApiUrl(ad.video_path as string)}
              poster={ad.cover_path ? publicApiUrl(ad.cover_path) : undefined}
              badge={ad.badge_text}
            />
          </Reveal>
        ))}
      </div>

      {all.length > videos.length && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-[#172033]">قصص مكتوبة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {all
              .filter((a) => !a.video_path)
              .slice(0, 6)
              .map((ad) => {
                const palette = getAdPalette(ad.color);
                return (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => navigate(`/ads/${ad.id}`)}
                    className="jahez-card p-5 text-right cursor-pointer hover:border-[#E67E00] transition-colors"
                  >
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg mb-2"
                      style={{ backgroundColor: palette.soft, color: palette.ink }}
                    >
                      <Play className="w-3 h-3" /> قصة نجاح
                    </span>
                    <span className="block font-bold text-sm text-[#172033] leading-snug">{ad.title}</span>
                    <span className="block text-xs text-[#667085] mt-1 line-clamp-2 leading-relaxed">{ad.description}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

const VideoCard: React.FC<{ title: string; description: string; videoSrc: string; poster?: string; badge: string | null }> = ({
  title,
  description,
  videoSrc,
  poster,
  badge,
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <article className="jahez-card overflow-hidden">
      {failed ? (
        <div className="w-full aspect-video flex items-center justify-center bg-[#F7F9FC] text-[#667085] text-xs">تعذر تشغيل الفيديو.</div>
      ) : (
        <video
          className="w-full aspect-video bg-black"
          controls
          preload="metadata"
          poster={poster}
          src={videoSrc}
          onError={() => setFailed(true)}
        />
      )}
      <div className="p-5 space-y-1.5">
        {badge && <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#FFEDD5] text-[#002E4A]">{badge}</span>}
        <h3 className="font-bold text-sm text-[#172033] leading-snug">{title}</h3>
        <p className="text-xs text-[#667085] leading-relaxed line-clamp-3">{description}</p>
      </div>
    </article>
  );
};

