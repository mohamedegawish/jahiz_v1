import React from 'react';
import { api, publicApiUrl } from '../../api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { CardSkeleton } from '../../components/ui/LoadingState';
import { QueryBoundary } from '../../components/ui/QueryBoundary';

/** Home-page video strip: footer-placement announcements that carry a video. */
export const HomeVideos: React.FC = () => {
  const feed = useApiQuery((signal) => api.announcements.publicList('footer', signal), []);
  return (
    <QueryBoundary query={feed} loading={<CardSkeleton />}>
      {(videos) => {
        const withVideo = videos.filter((a) => a.video_path);
        if (withVideo.length === 0) return <></>;
        const featured = withVideo[0];
        return (
          <section aria-labelledby="home-video-title" className="jahez-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-1 rounded-full bg-[#E67E00]" />
              <h2 id="home-video-title" className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight">
                شاهد المنصة على أرض الواقع
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <video
                className="w-full aspect-video rounded-2xl bg-black"
                controls
                preload="metadata"
                poster={featured.cover_path ? publicApiUrl(featured.cover_path) : undefined}
                src={publicApiUrl(featured.video_path as string)}
              />
              <div className="space-y-2">
                <h3 className="font-bold text-base text-[#172033] leading-snug">{featured.title}</h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed line-clamp-4">{featured.description}</p>
              </div>
            </div>
          </section>
        );
      }}
    </QueryBoundary>
  );
};

