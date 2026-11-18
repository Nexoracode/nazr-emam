import Link from 'next/link';
import { HandHeart, House, SearchX } from 'lucide-react';

export function NotFoundView() {
  return (
    <main className="not-found-page" dir="rtl">
      <section className="not-found-content">
        <div className="not-found-code" aria-hidden="true">
          <span>۴۰۴</span>
          <div><SearchX /></div>
        </div>
        <p className="not-found-eyebrow">صفحه در دسترس نیست</p>
        <h1>این مسیر به مقصد نرسید</h1>
        <p className="not-found-description">
          ممکن است طرح موردنظر غیرفعال شده باشد، نشانی صفحه تغییر کرده باشد یا این محتوا دیگر در سایت موجود نباشد.
        </p>
        <div className="not-found-actions">
          <Link className="not-found-primary" href="/"><House aria-hidden="true" />بازگشت به صفحه اصلی</Link>
          <Link className="not-found-secondary" href="/#plans"><HandHeart aria-hidden="true" />مشاهده طرح‌های فعال</Link>
        </div>
        <p className="not-found-help">برای ادامه، یکی از مسیرهای بالا را انتخاب کنید.</p>
      </section>
    </main>
  );
}
