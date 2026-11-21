import Link from 'next/link';
import { notFound } from 'next/navigation';
import CollectionViewer from '../../../../components/collection-viewer';
import { buildCollections } from '../../../../lib/gallery-collections';
import { getPublicGalleryAssets } from '../../../../lib/public-gallery';
import { getPublicNazrTypes } from '../../../../lib/public-nazr-types';

export default async function GalleryPage({ params }: { params: Promise<{ album: string[] }> }) {
  const { album } = await params;
  const [plans, assets] = await Promise.all([getPublicNazrTypes(), getPublicGalleryAssets('gallery')]);
  let path: string;
  try {
    path = '/gallery/' + album.map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/');
  } catch {
    notFound();
  }
  const collection = buildCollections(plans, assets).find(item => item.href === path);
  if (!collection) notFound();

  return (
    <main className="home-page home-section">
      <div className="home-container">
        <Link className="home-inline-link" href="/#gallery">بازگشت به مجموعه‌ها</Link>
        <header className="album-heading">
          {collection.title !== collection.planTitle && <span className="home-eyebrow">{collection.planTitle}</span>}
          <h1>{collection.title}</h1>
          <p>{collection.photos.length.toLocaleString('fa-IR')} عکس</p>
        </header>
        <CollectionViewer photos={collection.photos} />
      </div>
    </main>
  );
}
