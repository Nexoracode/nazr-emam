'use client';

import { useRef, useState } from 'react';
import type { CollectionPhoto } from '../lib/gallery-collections';

export default function CollectionViewer({ photos }: { photos: CollectionPhoto[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const photo = photos[index];
  const step = (offset: number) => setIndex(current => (current + photos.length + offset) % photos.length);

  return (
    <>
      <div className="album-photos">
        {photos.map((item, i) => (
          <button key={i} type="button" onClick={() => { setIndex(i); dialog.current?.showModal(); }}>
            <img loading="lazy" src={item.preview} alt="" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      <dialog ref={dialog} className="photo-dialog" aria-label="نمایش عکس" onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); step(1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); step(-1); }
      }}>
        <header><button autoFocus onClick={() => dialog.current?.close()}>بستن</button>
          <span>{(index + 1).toLocaleString('fa-IR')} از {photos.length.toLocaleString('fa-IR')}</span></header>
        <img src={photo.src} alt={photo.title} loading="lazy" />
        <footer>
          {photos.length > 1 && <button onClick={() => step(-1)}>قبلی</button>}
          <strong aria-live="polite">{photo.title}</strong>
          {photos.length > 1 && <button onClick={() => step(1)}>بعدی</button>}
        </footer>
      </dialog>
    </>
  );
}
