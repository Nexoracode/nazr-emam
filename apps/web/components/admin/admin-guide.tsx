import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  GalleryHorizontalEnd,
  HandHeart,
  Headphones,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  steps: string[];
  notes?: string[];
  warning?: string;
}

const guideSections: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'داشبورد و اولویت‌بندی کارها',
    summary: 'نقطه شروع هر شیفت برای دیدن وضعیت کلی سامانه و موارد نیازمند اقدام.',
    href: '/admin',
    icon: LayoutDashboard,
    steps: [
      'ابتدا تعداد درخواست‌های در انتظار اقدام، پرداخت‌های معلق، تیکت‌های باز و تماس‌های سررسیدشده را بررسی کنید.',
      'با انتخاب هر کارت آماری، مستقیماً وارد فهرست مرتبط شوید.',
      'جدول آخرین فعالیت‌ها را مرور کنید تا درخواست‌های تازه ثبت‌شده از قلم نیفتند.',
      'دکمه تازه‌سازی بالای صفحه را فقط زمانی بزنید که منتظر تغییر جدیدی از سمت کاربر یا درگاه هستید.',
    ],
    notes: ['عدد مجموع واریزی فقط از پرداخت‌های تأییدشده محاسبه می‌شود.'],
  },
  {
    id: 'requests',
    title: 'درخواست‌های نذر',
    summary: 'پیگیری چرخه هر نذر از ثبت اولیه تا انجام کامل.',
    href: '/admin/nazr-requests',
    icon: ClipboardList,
    steps: [
      'با جستجوی نام، شماره همراه یا اطلاعات درخواست، مورد موردنظر را پیدا کنید.',
      'طرح، مبلغ، کد رهگیری و تاریخ ثبت را با اطلاعات مخاطب تطبیق دهید.',
      'پس از اطمینان از وضعیت پرداخت، وضعیت اجرایی درخواست را از ستون آخر تغییر دهید.',
      'درخواست تأییدشده را هنگام شروع اجرا روی «در حال انجام» و پس از پایان واقعی روی «تکمیل‌شده» قرار دهید.',
      'برای موارد منصرف‌شده از «لغوشده» و برای درخواست نامعتبر از «ردشده» استفاده کنید.',
    ],
    warning: 'وضعیت درخواست را «تأییدشده» نکنید مگر پرداخت آن در بخش پرداخت‌ها قطعی باشد یا رسید ایتا از مسیر مخصوص ثبت شده باشد.',
  },
  {
    id: 'plans',
    title: 'طرح‌ها و انواع نذر',
    summary: 'ساخت، ویرایش، فعال‌سازی و توقف نمایش طرح‌ها در سایت.',
    href: '/admin/nazr-types',
    icon: HandHeart,
    steps: [
      'برای طرح جدید، عنوان فارسی، شناسه انگلیسی، توضیح روشن و در صورت نیاز مبلغ پیشنهادی را وارد کنید.',
      'شناسه انگلیسی باید کوتاه، یکتا و با خط تیره نوشته شود؛ نمونه: circulating-waqf.',
      'برای اصلاح محتوا از «ویرایش» استفاده کنید و پس از ذخیره، صفحه عمومی طرح را بررسی کنید.',
      'اگر جذب مشارکت برای یک طرح موقتاً متوقف شده، آن را غیرفعال کنید تا سابقه‌اش باقی بماند.',
      'حذف را فقط برای طرح اشتباهی و بدون سابقه نذر انجام دهید.',
    ],
    warning: 'تغییر شناسه انگلیسی می‌تواند نشانی صفحه عمومی طرح را تغییر دهد. حذف طرح دارای سابقه درخواست نیز مجاز نیست.',
  },
  {
    id: 'payments',
    title: 'پرداخت‌ها',
    summary: 'گزارش فقط‌خواندنی تمام تراکنش‌های آنلاین، کارت‌به‌کارت و نقدی.',
    href: '/admin/payments',
    icon: CircleDollarSign,
    steps: [
      'با جستجو تراکنش موردنظر را پیدا و روش پرداخت، مبلغ، مرجع تراکنش و تاریخ را کنترل کنید.',
      'پرداخت آنلاین موفق با وضعیت «پرداخت‌شده» و شماره مرجع درگاه نمایش داده می‌شود.',
      'پرداخت لغوشده یا ناموفق باید «ردشده» باشد؛ «در انتظار» یعنی نتیجه نهایی هنوز ثبت نشده است.',
      'برای پرداخت‌های ارسالی در ایتا از بخش «رسیدهای ایتا» استفاده کنید، نه جدول پرداخت‌ها.',
    ],
    warning: 'پرداخت آنلاین از نتیجه زرین‌پال به‌روزرسانی می‌شود و مدیر نباید آن را دستی تأیید یا رد کند.',
  },
  {
    id: 'eitaa',
    title: 'رسیدهای ایتا',
    summary: 'ثبت قطعی پرداختی که مخاطب رسید آن را خارج از سایت ارسال کرده است.',
    href: '/admin/eitaa-receipts',
    icon: CheckCircle2,
    steps: [
      'پیش از ثبت، نام، شماره همراه، مبلغ، طرح و تصویر یا پیام رسید را با مخاطب تطبیق دهید.',
      '«ثبت رسید جدید» را بزنید و شماره همراه را دقیقاً با قالب ۱۱ رقمی وارد کنید.',
      'مبلغ را به تومان وارد و تاریخ دریافت را به شکل شمسی، مانند ۱۴۰۵/۰۲/۰۳، ثبت کنید.',
      'شماره مرجع و لینک پیام ایتا را هر زمان در دسترس است وارد کنید تا پیگیری بعدی مستند باشد.',
      'پس از ثبت موفق، کد رهگیری ساخته می‌شود و مخاطب از جدول رسیدها به پرونده CRM قابل دسترسی است.',
    ],
    warning: 'این فرم به معنی تأیید قطعی رسید است. رسید مشکوک یا ناقص را تا زمان تطبیق بانکی ثبت نکنید.',
  },
  {
    id: 'users',
    title: 'مخاطبان و CRM',
    summary: 'پرونده ارتباطی، سابقه مشارکت و برنامه پیگیری هر مخاطب.',
    href: '/admin/users',
    icon: Users,
    steps: [
      'مخاطب را با نام یا شماره همراه جستجو و گزینه «پرونده» را باز کنید.',
      'مرحله ارتباط را متناسب با وضعیت واقعی روی جدید، در ارتباط، همراه مستمر، نیازمند پیگیری یا غیرفعال بگذارید.',
      'برچسب‌ها، مسئول پیگیری، تاریخ اقدام بعدی و یادداشت کاربردی را ثبت کنید.',
      'بعد از هر تماس یا اقدام مهم، نوع فعالیت و خلاصه نتیجه را در تاریخچه CRM بنویسید.',
      'قبل از تماس دوباره، تاریخچه را بخوانید تا مخاطب مجبور به تکرار اطلاعات قبلی نشود.',
    ],
    notes: ['یادداشت CRM باید کوتاه، محترمانه و مرتبط با ادامه همکاری باشد؛ اطلاعات حساس غیرضروری ثبت نکنید.'],
  },
  {
    id: 'calls',
    title: 'کال‌سنتر و پیگیری ماهانه',
    summary: 'تقسیم تماس‌های ماهانه میان اپراتورها و ثبت نتیجه هر پیگیری.',
    href: '/admin/calls',
    icon: Headphones,
    steps: [
      'در ابتدای دوره، «ساخت صف ماه» را بزنید و دوره و تاریخ سررسید شمسی را تعیین کنید.',
      'سامانه برای مخاطبان دارای برداشت ماهانه فعال، فقط یک وظیفه در همان دوره می‌سازد.',
      'مدیر شیفت باید از ستون «مسئول»، هر تماس را به یکی از اپراتورها تخصیص دهد.',
      'هر اپراتور با فیلتر «صف من» فقط تماس‌های خودش را می‌بیند؛ «بدون مسئول» برای تقسیم کارهای باقی‌مانده است.',
      'پس از تماس، نتیجه را فوراً روی تماس گرفته شد، قول پرداخت، پرداخت کرد، پاسخ نداد یا لغو پیگیری قرار دهید.',
      'برای جلوگیری از تماس تکراری، پیش از اقدام دوباره نتیجه قبلی و پرونده CRM مخاطب را بررسی کنید.',
    ],
    warning: 'صف ماه را برای یک دوره چند بار نسازید. سامانه مورد تکراری ایجاد نمی‌کند، اما تاریخ و دوره باید از ابتدا درست انتخاب شوند.',
  },
  {
    id: 'tickets',
    title: 'تیکت‌های پشتیبانی',
    summary: 'رسیدگی متمرکز به پیام‌های کاربران و نگهداری تاریخچه گفت‌وگو.',
    href: '/admin/tickets',
    icon: MessageSquareText,
    steps: [
      'فهرست را بر اساس وضعیت مرور و ابتدا تیکت‌های باز را پاسخ دهید.',
      'موضوع و همه پیام‌های قبلی را بخوانید و سپس پاسخ روشن و مستقیم بنویسید.',
      'با ارسال پاسخ، وضعیت گفت‌وگو به «پاسخ داده‌شده» تغییر می‌کند.',
      'فقط وقتی موضوع کاملاً حل شده است تیکت را ببندید؛ تیکت بسته امکان پاسخ جدید ندارد.',
      'برای مسائل پرداخت، قبل از پاسخ جدول پرداخت‌ها یا رسیدهای ایتا را بررسی کنید.',
    ],
    notes: ['در پاسخ‌ها از درخواست رمز عبور، کد پیامک یا اطلاعات کامل کارت بانکی خودداری کنید.'],
  },
  {
    id: 'notifications',
    title: 'اعلان‌ها',
    summary: 'ارسال پیام عمومی برای همه یا پیام اختصاصی برای یک مخاطب.',
    href: '/admin/notifications',
    icon: Bell,
    steps: [
      'برای مشاهده سابقه، فهرست اعلان‌ها و نام گیرنده را بررسی کنید.',
      'در فرم ارسال، خالی گذاشتن مخاطب به معنی ارسال عمومی برای همه کاربران است.',
      'عنوان کوتاه، متن واضح و در صورت نیاز یک لینک داخلی مانند /profile وارد کنید.',
      'پیش از ارسال عمومی، متن و مقصد لینک را دوباره بررسی کنید؛ ارسال انجام‌شده قابل ویرایش نیست.',
    ],
    warning: 'اعلان عمومی را فقط برای پیام‌های ضروری و مرتبط ارسال کنید تا کاربران پیام‌های سامانه را نادیده نگیرند.',
  },
  {
    id: 'gallery',
    title: 'گالری و رسانه',
    summary: 'مدیریت ویدیوی معرفی صفحه اصلی و گزارش تصویری اجرای طرح‌ها.',
    href: '/admin/gallery',
    icon: GalleryHorizontalEnd,
    steps: [
      'برای کلیپ معرفی کلی نذر امام، محل نمایش «معرفی صفحه اصلی» را انتخاب کنید؛ این بخش فقط ویدیو می‌پذیرد.',
      'برای تصاویر و ویدیوهای اجرای طرح‌ها، محل نمایش «گالری» و طرح مرتبط را انتخاب کنید.',
      'فایل اصلی را بارگذاری و برای هر ویدیو تصویر بندانگشتی واضح انتخاب کنید.',
      'پس از ثبت، نمایش رسانه را در صفحه اصلی یا لندینگ طرح مرتبط کنترل کنید.',
      'رسانه اشتباه را فقط پس از اطمینان از عدم نیاز به فایل و لینک آن حذف کنید.',
    ],
    warning: 'ویدیوی معرفی و گزارش‌های گالری دو محتوای جدا هستند. محل نمایش را اشتباه انتخاب نکنید.',
  },
];

const requestStatuses = [
  ['پیش‌نویس', 'فرآیند ثبت هنوز کامل نشده است.'],
  ['ثبت‌شده', 'درخواست دریافت شده و منتظر بررسی اولیه است.'],
  ['در انتظار پرداخت', 'مخاطب هنوز پرداخت را کامل نکرده است.'],
  ['بررسی پرداخت', 'نتیجه پرداخت نیازمند تعیین تکلیف است.'],
  ['تأییدشده', 'پرداخت قطعی است و درخواست آماده اجراست.'],
  ['در حال انجام', 'اجرای نذر شروع شده است.'],
  ['تکمیل‌شده', 'اجرای تعهد واقعاً پایان یافته است.'],
  ['لغوشده', 'فرآیند با انصراف یا لغو متوقف شده است.'],
  ['ردشده', 'درخواست یا اطلاعات آن معتبر تشخیص داده نشده است.'],
];

export function AdminGuidePrompt({ dontShow, onClose, onDontShowChange, onOpenGuide }: { dontShow: boolean; onClose: () => void; onDontShowChange: (value: boolean) => void; onOpenGuide: () => void }) {
  return (
    <div className="admin-guide-prompt-backdrop" role="presentation">
      <section aria-describedby="admin-guide-prompt-description" aria-labelledby="admin-guide-prompt-title" aria-modal="true" className="admin-guide-prompt" role="dialog">
        <header>
          <div className="admin-guide-prompt-icon"><BookOpen aria-hidden="true" /></div>
          <button aria-label="بستن پیام آموزش" onClick={onClose} title="بستن" type="button"><X aria-hidden="true" /></button>
        </header>
        <div>
          <span>اولین ورود به پنل</span>
          <h2 id="admin-guide-prompt-title">با پنل مدیریت آشنا هستید؟</h2>
          <p id="admin-guide-prompt-description">اگر هنوز با بخش‌های پنل و ترتیب انجام کارها آشنا نیستید، راهنمای کامل را ببینید. آموزش هر بخش، وضعیت‌ها و چک‌لیست‌های کاری آنجا آماده است.</p>
        </div>
        <label className="admin-guide-prompt-check"><input checked={dontShow} onChange={(event) => onDontShowChange(event.target.checked)} type="checkbox" /><span>دیگر این پیام را نشان نده</span></label>
        <footer><button className="admin-secondary" onClick={onClose} type="button">بعداً</button><button autoFocus className="admin-primary" onClick={onOpenGuide} type="button"><BookOpen aria-hidden="true" />مشاهده آموزش پنل</button></footer>
      </section>
    </div>
  );
}

export function AdminGuide() {
  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="admin-guide-hero-icon"><BookOpen aria-hidden="true" /></div>
        <div>
          <span>راهنمای عملیاتی</span>
          <h2>آموزش کامل پنل مدیریت نذر امام</h2>
          <p>این راهنما ترتیب کار، مسئولیت هر بخش و نکات حساس را قدم‌به‌قدم توضیح می‌دهد. برای شروع یک شیفت یا آموزش مدیر جدید، مطالب را از بالا به پایین بخوانید.</p>
        </div>
        <Link href="/admin">بازگشت به داشبورد</Link>
      </header>

      <div className="admin-guide-layout">
        <aside className="admin-guide-index" aria-label="فهرست راهنمای پنل">
          <strong>فهرست مطالب</strong>
          <a href="#start">شروع کار</a>
          {guideSections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}
          <a href="#statuses">معنی وضعیت‌ها</a>
          <a href="#checklists">چک‌لیست کاری</a>
          <a href="#security">امنیت و محرمانگی</a>
        </aside>

        <article className="admin-guide-document">
          <section className="admin-guide-section" id="start">
            <div className="admin-guide-section-title"><BookOpen aria-hidden="true" /><div><span>پیش از شروع</span><h3>روال استاندارد یک مدیر پنل</h3></div></div>
            <ol>
              <li>با حساب شخصی خود وارد شوید و از استفاده مشترک از یک حساب میان چند اپراتور خودداری کنید.</li>
              <li>داشبورد را مرور و کارهای فوری را به ترتیب تیکت باز، تماس سررسیدشده، درخواست جدید و پرداخت معلق مرتب کنید.</li>
              <li>هر تغییری را فقط پس از مشاهده پیام موفقیت سبز قطعی بدانید. پیام قرمز یعنی عملیات ذخیره نشده است.</li>
              <li>در پایان شیفت، تماس‌ها و تیکت‌های نیمه‌تمام را مستند کنید تا اپراتور بعدی ادامه کار را بداند.</li>
            </ol>
            <div className="admin-guide-note"><CheckCircle2 aria-hidden="true" /><p>اصل مهم: هر اقدام باید در همان بخش ثبت شود؛ اطلاعات پرداخت در پرداخت‌ها، ارتباط با مخاطب در CRM و نتیجه تماس در کال‌سنتر.</p></div>
          </section>

          {guideSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section className="admin-guide-section" id={section.id} key={section.id}>
                <div className="admin-guide-section-title"><Icon aria-hidden="true" /><div><span>بخش {(index + 1).toLocaleString('fa-IR')}</span><h3>{section.title}</h3><p>{section.summary}</p></div><Link href={section.href}>ورود به بخش</Link></div>
                <ol>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                {section.notes?.map((note) => <div className="admin-guide-note" key={note}><CheckCircle2 aria-hidden="true" /><p>{note}</p></div>)}
                {section.warning ? <div className="admin-guide-warning"><AlertTriangle aria-hidden="true" /><p>{section.warning}</p></div> : null}
              </section>
            );
          })}

          <section className="admin-guide-section" id="statuses">
            <div className="admin-guide-section-title"><ClipboardList aria-hidden="true" /><div><span>مرجع سریع</span><h3>معنی وضعیت درخواست نذر</h3></div></div>
            <div className="admin-guide-status-list">{requestStatuses.map(([title, description]) => <div key={title}><strong>{title}</strong><p>{description}</p></div>)}</div>
          </section>

          <section className="admin-guide-section" id="checklists">
            <div className="admin-guide-section-title"><CheckCircle2 aria-hidden="true" /><div><span>کنترل عملیات</span><h3>چک‌لیست روزانه و ماهانه</h3></div></div>
            <div className="admin-guide-checklists">
              <div><h4>هر روز</h4><ul><li>بررسی تیکت‌های باز</li><li>رسیدگی به تماس‌های سررسیدشده</li><li>مرور درخواست‌های تازه</li><li>کنترل پرداخت‌های معلق و ناموفق</li><li>ثبت نتیجه ارتباط‌ها در CRM</li></ul></div>
              <div><h4>ابتدای هر ماه</h4><ul><li>ساخت صف ماه جدید فقط یک بار</li><li>تخصیص همه ردیف‌های بدون مسئول</li><li>کنترل مخاطبان نیازمند پیگیری</li><li>بررسی طرح‌های فعال و تکمیل‌شده</li><li>مرور رسانه‌ها و اعلان‌های برنامه‌ریزی‌شده</li></ul></div>
              <div><h4>پایان هر شیفت</h4><ul><li>ثبت آخرین نتیجه تماس‌ها</li><li>بستن تیکت‌های واقعاً حل‌شده</li><li>تحویل موارد نیمه‌تمام به شیفت بعدی</li><li>خروج از حساب در دستگاه مشترک</li></ul></div>
            </div>
          </section>

          <section className="admin-guide-section" id="security">
            <div className="admin-guide-section-title"><ShieldCheck aria-hidden="true" /><div><span>الزام مدیریتی</span><h3>امنیت و محرمانگی اطلاعات</h3></div></div>
            <ul className="admin-guide-security-list">
              <li>رمز عبور و کد ورود را با هیچ اپراتور دیگری به اشتراک نگذارید.</li>
              <li>شماره همراه، رسید بانکی و اطلاعات پرونده مخاطب را خارج از مسیرهای کاری منتشر نکنید.</li>
              <li>هرگز رمز، کد پیامک، CVV2 یا شماره کامل کارت را از مخاطب درخواست نکنید.</li>
              <li>در دستگاه عمومی یا مشترک، بعد از پایان کار از حساب خارج شوید.</li>
              <li>در صورت مشاهده پرداخت یا دسترسی مشکوک، عملیات را متوقف و موضوع را به مدیر ارشد گزارش کنید.</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
