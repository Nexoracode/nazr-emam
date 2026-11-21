'use client';

import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import type { GalleryAsset, GalleryAssetPlacement, GalleryAssetType, NazrType } from '@nazr-emam/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ApiRequestError, createAdminGallery, deleteAdminGallery, updateAdminGallery, uploadAdminGalleryFile,
} from '../../lib/api';

interface GalleryProps {
  items: GalleryAsset[];
  nazrTypes: NazrType[];
  mode: 'list' | 'form';
  editId?: string | null;
  working: boolean;
  run: (action: () => Promise<unknown>, message: string, reload?: boolean) => Promise<boolean>;
}

const images = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
const videos = 'video/mp4,video/webm,video/quicktime';

export function GalleryManager({ items, nazrTypes, editId, mode, run, working }: GalleryProps) {
  const router = useRouter();
  const edited = items.find(item => item.id === editId);
  const [placement, setPlacement] = useState<GalleryAssetPlacement>(edited?.placement ?? 'gallery');
  const [kind, setKind] = useState<GalleryAssetType>(edited?.type ?? 'image');
  const [planId, setPlanId] = useState(edited?.nazrTypeId ?? '');
  const [album, setAlbum] = useState(edited?.collectionTitle ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState('');
  const uploaded = useRef(new WeakMap<File, string>());
  const isPhoto = placement === 'gallery' && kind === 'image';
  const planTitle = (item: GalleryAsset) => nazrTypes.find(plan => plan.id === item.nazrTypeId)?.title ?? 'گزارش‌های عمومی';

  if (mode === 'list') {
    const groups = new Map<string, { title: string; assets: GalleryAsset[] }>();
    for (const item of items) {
      const key = JSON.stringify([item.placement, item.nazrTypeId, item.collectionTitle]);
      const title = item.placement === 'intro' ? 'معرفی صفحه اصلی'
        : [planTitle(item), item.collectionTitle].filter(Boolean).join(' / ');
      const group = groups.get(key) ?? { title, assets: [] };
      group.assets.push(item);
      groups.set(key, group);
    }
    return <div className="admin-stack">
      <div className="admin-panel-head"><h2>گالری و مجموعه‌ها</h2><Link className="admin-primary" href="/admin/gallery/new">افزودن رسانه</Link></div>
      {!items.length && <p>هنوز رسانه‌ای ثبت نشده است.</p>}
      {Array.from(groups, ([key, group]) => <section key={key} className="admin-panel">
        <h3>{group.title}</h3>
        <div className="admin-gallery-grid">{group.assets.map(item => <article key={item.id}>
          <div className="admin-gallery-preview">
            {item.fileAvailable === false ? <div className="admin-media-placeholder">فایل نیاز به جایگزینی دارد</div>
              : <img alt={item.title} loading="lazy" src={item.thumbnailUrl || (item.type === 'image' ? item.fileUrl : undefined)} />}
          </div>
          <div className="admin-gallery-info">
            <h3>{item.title}</h3>
            <Link href={`/admin/gallery/${item.id}/edit`}>ویرایش و جایگزینی فایل</Link>
            {item.fileAvailable !== false && <a href={item.fileUrl} target="_blank" rel="noreferrer">مشاهده فایل</a>}
            <button type="button" disabled={working} className="is-danger-text" onClick={() => {
              if (window.confirm('این رسانه از گالری حذف شود؟')) void run(() => deleteAdminGallery(item.id), 'رسانه حذف شد');
            }}>حذف</button>
          </div>
        </article>)}</div>
      </section>)}
    </div>;
  }

  if (editId && !edited) return <p>رسانه پیدا نشد.</p>;
  const albumNames = new Set(items.filter(item => (item.nazrTypeId ?? '') === planId && item.collectionTitle)
    .map(item => item.collectionTitle!));

  async function upload(file: File, type: GalleryAssetType) {
    const cached = uploaded.current.get(file);
    if (cached) return cached;
    const result = await uploadAdminGalleryFile(file, type);
    uploaded.current.set(file, result.url);
    return result.url;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    const thumb = data.get('thumbnail');
    const ok = await run(async () => {
      try {
        if (!edited && !files.length) throw new Error('فایل را انتخاب کنید.');
        const batch = files.length ? files : [null];
        const thumbnailUrl = thumb instanceof File && thumb.size ? await upload(thumb, 'image') : edited?.thumbnailUrl;
        for (const [index, file] of batch.entries()) {
          setProgress(`ثبت ${(index + 1).toLocaleString('fa-IR')} از ${batch.length.toLocaleString('fa-IR')}`);
          const fileUrl = file ? await upload(file, kind) : edited!.fileUrl;
          const payload = {
            placement, type: kind, nazrTypeId: placement === 'gallery' ? planId || null : null,
            collectionTitle: isPhoto ? album.trim() || null : null,
            selectAsCover: data.get('cover') === 'on' ? true : undefined,
            fileUrl, thumbnailUrl: file && kind === 'image' ? null : thumbnailUrl,
            title: title || file?.name.replace(/\.[^.]+$/, '').slice(0, 180) || 'تصویر',
          };
          if (edited) await updateAdminGallery(edited.id, payload);
          else await createAdminGallery(payload);
          if (file) setFiles(pending => pending.filter(f => f !== file));
        }
      } catch (error) {
        if (error instanceof ApiRequestError && error.fields) throw new Error(Object.values(error.fields).join('، '));
        throw error;
      } finally { setProgress(''); }
    }, 'رسانه ذخیره شد', false);
    if (ok) router.push('/admin/gallery');
  }

  return <section className="admin-panel admin-form-page">
    <div className="admin-panel-head"><h2>{edited ? 'ویرایش رسانه' : 'افزودن رسانه'}</h2><Link href="/admin/gallery">بازگشت به گالری</Link></div>
    <form className="admin-form-grid admin-gallery-form" onSubmit={submit}>
      <label>محل نمایش<select value={placement} disabled={working || !!edited} onChange={e => {
        const value = e.target.value as GalleryAssetPlacement;
        setPlacement(value); setKind(value === 'intro' ? 'video' : 'image'); setFiles([]);
      }}><option value="gallery">گالری طرح‌ها</option><option value="intro">معرفی صفحه اصلی</option></select></label>
      <label>نوع رسانه<select value={kind} disabled={working || placement === 'intro' || !!edited} onChange={e => {
        setKind(e.target.value as GalleryAssetType); setFiles([]);
      }}><option value="image">عکس</option><option value="video">ویدئو</option></select></label>
      {placement === 'gallery' && <label>طرح<select disabled={working} value={planId} onChange={e => { setPlanId(e.target.value); setAlbum(''); }}>
        <option value="">گزارش‌های عمومی</option>{nazrTypes.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
      </select></label>}
      {isPhoto && <label>مجموعه<input disabled={working} list="album-names" maxLength={80} placeholder="پیش‌فرض طرح یا نام مجموعهٔ جدید" value={album} onChange={e => setAlbum(e.target.value)} />
        <datalist id="album-names">{Array.from(albumNames, name => <option key={name} value={name} />)}</datalist></label>}
      <label>عنوان رسانه<input disabled={working} name="title" maxLength={180} defaultValue={edited?.title} placeholder="پیش‌فرض عکس تازه، نام فایل است" required={!!edited || kind === 'video'} /></label>
      <label>{edited ? 'جایگزینی فایل' : isPhoto ? 'انتخاب یک یا چند عکس' : 'فایل ویدئو'}
        <input key={placement + kind} disabled={working} type="file" accept={isPhoto ? images : videos} multiple={isPhoto && !edited}
          required={(!edited || edited.fileAvailable === false) && !files.length}
          onChange={e => setFiles(Array.from(e.target.files ?? []))} />
        <small>{isPhoto ? 'JPEG، PNG، WebP، GIF یا AVIF تا ۱۰ مگابایت برای هر عکس' : 'MP4، WebM یا MOV تا ۱۵۰ مگابایت'}</small>
        {files.length > 0 && <small>{files.map(f => f.name).join('، ')}</small>}
      </label>
      {kind === 'video' && <label>تصویر پیش‌نمایش<input disabled={working} name="thumbnail" type="file" accept={images} required={!edited?.thumbnailUrl} /></label>}
      {isPhoto && (edited || files.length === 1) && <label>
        <input type="checkbox" name="cover" disabled={working} />انتخاب به‌عنوان جلد مجموعه
      </label>}
      <div className="admin-plan-form-actions">
        <button className="admin-primary" disabled={working}>{progress || (working ? 'در حال ذخیره…' : 'ذخیره')}</button>

      </div>
    </form>
  </section>;
}
