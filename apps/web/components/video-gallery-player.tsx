'use client';

import type { GalleryAsset } from '@nazr-emam/shared';
import { useState } from 'react';

const VIDEO_MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function videoMimeType(url: string): string | undefined {
  const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  return ext ? VIDEO_MIME_BY_EXT[ext] : undefined;
}

export function VideoGalleryPlayer({
  videos,
  className = '',
  emptyTitle = null,
}: {
  videos: GalleryAsset[];
  className?: string;
  emptyTitle?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const availableVideos = videos ?? [];
  const selectedVideo =
    availableVideos.find((video) => video.id === selectedId) ??
    availableVideos[0] ??
    null;

  if (!selectedVideo) {
    return emptyTitle ? (
      <div className={`media-video-empty ${className}`}>{emptyTitle}</div>
    ) : null;
  }

  return (
    <div className={`media-video-gallery ${className}`.trim()}>
      <figure className="media-video-main">
        <video
          className="media-video-player"
          controls
          key={selectedVideo.id}
          playsInline
          poster={selectedVideo.thumbnailUrl ?? undefined}
          preload="metadata"
        >
          <source
            src={selectedVideo.fileUrl}
            type={videoMimeType(selectedVideo.fileUrl)}
          />
          مرورگر شما امکان پخش این ویدئو را ندارد.
        </video>
      </figure>

      {availableVideos.length > 1 ? (
        <div className="media-video-thumbnails" aria-label="انتخاب ویدئو">
          {availableVideos.map((video) => {
            const isActive = video.id === selectedVideo.id;

            return (
              <button
                aria-label={`نمایش ویدئوی ${video.title}`}
                aria-pressed={isActive}
                className={`media-video-thumbnail${isActive ? ' is-active' : ''}`}
                key={video.id}
                onClick={() => setSelectedId(video.id)}
                title={video.title}
                type="button"
              >
                {video.thumbnailUrl ? (
                  <img alt="" loading="lazy" src={video.thumbnailUrl} />
                ) : (
                  <span className="media-video-thumbnail-fallback" />
                )}
                <span className="media-video-thumbnail-play" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
