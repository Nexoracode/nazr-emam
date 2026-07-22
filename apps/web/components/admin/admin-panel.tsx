'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pencil, Power, Trash2 } from 'lucide-react';
import type {
  AdminDashboardSummary,
  AdminEitaaReceipt,
  AdminNotificationItem,
  AdminUserDetails,
  AdminUserListItem,
  CallTask,
  CallTaskStatus,
  CrmActivityType,
  CrmStage,
  GalleryAsset,
  GalleryAssetPlacement,
  NazrRequest,
  NazrRequestStatus,
  NazrType,
  Paginated,
  Payment,
  Ticket,
} from '@nazr-emam/shared';
import {
  addAdminCrmActivity,
  closeTicket,
  createAdminEitaaReceipt,
  createAdminGallery,
  createAdminNazrType,
  createAdminNotification,
  deleteAdminGallery,
  deleteAdminNazrType,
  generateAdminCallTasks,
  getAdminCallTasks,
  getAdminDashboard,
  getAdminEitaaReceipts,
  getAdminGallery,
  getAdminNazrRequests,
  getAdminNazrTypes,
  getAdminNotifications,
  getAdminPayments,
  getAdminTickets,
  getAdminUser,
  getAdminUsers,
  getMe,
  logout,
  replyTicket,
  setAdminPaymentStatus,
  updateAdminCallTask,
  updateAdminCrm,
  updateAdminNazrStatus,
  updateAdminNazrType,
  uploadAdminGalleryFile,
} from '../../lib/api';
import {
  amountToPersianWords,
  formatAmountInput,
  parseAmountInput,
} from '../../lib/amount';

type AdminSection = 'dashboard' | 'nazr' | 'users' | 'payments' | 'eitaa' | 'tickets' | 'notifications' | 'gallery' | 'calls';
type PaginatedAdminSection = 'nazr' | 'users' | 'payments' | 'eitaa' | 'tickets' | 'notifications' | 'calls';

const ADMIN_PAGE_SIZE = 10;

function emptyPage<T>(): Paginated<T> {
  return { items: [], page: 1, pageSize: ADMIN_PAGE_SIZE, total: 0, totalPages: 0 };
}

const navItems: { id: AdminSection; label: string; short: string; group: string }[] = [
  { id: 'dashboard', label: 'داشبورد', short: 'د', group: 'نمای کلی' },
  { id: 'nazr', label: 'نذرها و طرح‌ها', short: 'ن', group: 'عملیات' },
  { id: 'payments', label: 'پرداخت‌ها', short: 'و', group: 'عملیات' },
  { id: 'eitaa', label: 'رسیدهای ایتا', short: 'ا', group: 'عملیات' },
  { id: 'users', label: 'مخاطبان و CRM', short: 'م', group: 'ارتباط' },
  { id: 'calls', label: 'کال‌سنتر', short: 'ک', group: 'ارتباط' },
  { id: 'tickets', label: 'تیکت‌ها', short: 'ت', group: 'ارتباط' },
  { id: 'notifications', label: 'اعلان‌ها', short: 'ا', group: 'محتوا' },
  { id: 'gallery', label: 'گالری', short: 'گ', group: 'محتوا' },
];

const requestLabels: Record<NazrRequestStatus, string> = {
  draft: 'پیش‌نویس', submitted: 'ثبت‌شده', awaiting_payment: 'در انتظار پرداخت', payment_pending_review: 'بررسی پرداخت', confirmed: 'تأییدشده', in_progress: 'در حال انجام', completed: 'تکمیل‌شده', cancelled: 'لغوشده', rejected: 'ردشده',
};
const requestStatuses = Object.keys(requestLabels) as NazrRequestStatus[];
const paymentLabels = { pending: 'در انتظار', paid: 'پرداخت‌شده', rejected: 'ردشده', refunded: 'برگشت‌خورده' } as const;
const ticketLabels = { open: 'باز', answered: 'پاسخ داده‌شده', closed: 'بسته' } as const;
const crmLabels: Record<CrmStage, string> = { new: 'جدید', engaged: 'در ارتباط', recurring: 'همراه مستمر', at_risk: 'نیازمند پیگیری', inactive: 'غیرفعال' };
const callLabels: Record<CallTaskStatus, string> = { pending: 'در انتظار تماس', contacted: 'تماس گرفته شد', promised: 'قول پرداخت', paid: 'پرداخت کرد', unreachable: 'پاسخ نداد', cancelled: 'لغو پیگیری' };

function money(value?: { amount: number; currency: string } | null) {
  if (!value) return '—';
  return `${Math.round(value.currency === 'IRR' ? value.amount / 10 : value.amount).toLocaleString('fa-IR')} تومان`;
}

function date(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value));
}

const persianCalendarFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function jalaliParts(value: Date) {
  const parts = persianCalendarFormatter.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return { year: read('year'), month: read('month'), day: read('day') };
}

function jalaliDateInput(value: string | Date = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = jalaliParts(parsed);
  return `${parts.year}/${parts.month}/${parts.day}`;
}

function jalaliMonthInput(value = new Date()) {
  const parts = jalaliParts(value);
  return `${parts.year}/${parts.month}`;
}

function jalaliDateToIso(value: string, hour = 9) {
  const normalized = value.trim().replace(/[-.]/g, '/');
  const match = /^(\d{4})\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/.exec(normalized);
  if (!match) throw new Error('تاریخ را با قالب ۱۴۰۵/۰۲/۰۳ وارد کنید');
  const [, year, month, day] = match;
  const target = `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
  const cursor = new Date(Date.UTC(Number(year) + 621, 2, 1, hour));
  for (let offset = 0; offset < 390; offset += 1) {
    const candidate = new Date(cursor.getTime() + offset * 86_400_000);
    if (jalaliDateInput(candidate) === target) return candidate.toISOString();
  }
  throw new Error('تاریخ شمسی واردشده معتبر نیست');
}

function jalaliDateToStartOfDayIso(value: string) {
  const date = new Date(jalaliDateToIso(value, 12));
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function statusClass(value: string) {
  if (['paid', 'confirmed', 'completed', 'answered'].includes(value)) return 'is-success';
  if (['pending', 'awaiting_payment', 'payment_pending_review', 'open', 'promised'].includes(value)) return 'is-warning';
  if (['rejected', 'cancelled', 'unreachable'].includes(value)) return 'is-danger';
  return 'is-neutral';
}

export function AdminPanel() {
  const router = useRouter();
  const [active, setActive] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminName, setAdminName] = useState('مدیر سامانه');
  const [dashboard, setDashboard] = useState<AdminDashboardSummary | null>(null);
  const [users, setUsers] = useState<Paginated<AdminUserListItem>>(() => emptyPage());
  const [requests, setRequests] = useState<Paginated<NazrRequest>>(() => emptyPage());
  const [nazrTypes, setNazrTypes] = useState<NazrType[]>([]);
  const [payments, setPayments] = useState<Paginated<Payment>>(() => emptyPage());
  const [eitaaReceipts, setEitaaReceipts] = useState<Paginated<AdminEitaaReceipt>>(() => emptyPage());
  const [tickets, setTickets] = useState<Paginated<Ticket>>(() => emptyPage());
  const [notifications, setNotifications] = useState<Paginated<AdminNotificationItem>>(() => emptyPage());
  const [notificationUsers, setNotificationUsers] = useState<AdminUserListItem[]>([]);
  const [gallery, setGallery] = useState<GalleryAsset[]>([]);
  const [callTasks, setCallTasks] = useState<Paginated<CallTask>>(() => emptyPage());
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const me = await getMe();
      if (me.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAdminName(me.fullName);
      const [dashboardData, usersData, requestsData, typesData, paymentsData, eitaaData, ticketsData, notificationsData, galleryData, callsData, notificationUsersData] = await Promise.all([
        getAdminDashboard(), getAdminUsers(1, ADMIN_PAGE_SIZE), getAdminNazrRequests(1, ADMIN_PAGE_SIZE), getAdminNazrTypes(), getAdminPayments(1, ADMIN_PAGE_SIZE), getAdminEitaaReceipts(1, ADMIN_PAGE_SIZE), getAdminTickets(1, ADMIN_PAGE_SIZE), getAdminNotifications(1, ADMIN_PAGE_SIZE), getAdminGallery(), getAdminCallTasks(1, ADMIN_PAGE_SIZE), getAdminUsers(1, 100),
      ]);
      setDashboard(dashboardData);
      setUsers(usersData);
      setRequests(requestsData);
      setNazrTypes(typesData);
      setPayments(paymentsData);
      setEitaaReceipts(eitaaData);
      setTickets(ticketsData);
      setNotifications(notificationsData);
      setNotificationUsers(notificationUsersData.items);
      setGallery(galleryData);
      setCallTasks(callsData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دریافت اطلاعات پنل انجام نشد');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadPage = useCallback(async (section: PaginatedAdminSection, page: number, query = '') => {
    setWorking(true);
    setError('');
    try {
      if (section === 'users') setUsers(await getAdminUsers(page, ADMIN_PAGE_SIZE, query));
      if (section === 'nazr') setRequests(await getAdminNazrRequests(page, ADMIN_PAGE_SIZE, query));
      if (section === 'payments') setPayments(await getAdminPayments(page, ADMIN_PAGE_SIZE, query));
      if (section === 'eitaa') setEitaaReceipts(await getAdminEitaaReceipts(page, ADMIN_PAGE_SIZE, query));
      if (section === 'tickets') setTickets(await getAdminTickets(page, ADMIN_PAGE_SIZE));
      if (section === 'notifications') setNotifications(await getAdminNotifications(page, ADMIN_PAGE_SIZE));
      if (section === 'calls') setCallTasks(await getAdminCallTasks(page, ADMIN_PAGE_SIZE));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دریافت صفحه جدید انجام نشد');
    } finally {
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    if (!['users', 'nazr', 'payments', 'eitaa'].includes(active)) return;
    const timeout = window.setTimeout(() => {
      void loadPage(active as PaginatedAdminSection, 1, search.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [active, loadPage, search]);

  const run = async (action: () => Promise<unknown>, message: string, reload = true) => {
    setWorking(true); setError(''); setSuccess('');
    try {
      await action();
      setSuccess(message);
      if (reload) await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'عملیات انجام نشد');
      return false;
    } finally { setWorking(false); }
  };

  const changeSection = (section: AdminSection) => {
    setActive(section);
    setSearch('');
    setError('');
    setSuccess('');
  };

  const selectUser = async (id: string) => setSelectedUser(await getAdminUser(id));

  if (loading) return <main className="admin-loading">در حال آماده‌سازی پنل مدیریت...</main>;

  return (
    <main className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span>ن</span><div><strong>نذر امام</strong><small>مرکز مدیریت</small></div></div>
        <nav className="admin-nav">
          {[...new Set(navItems.map((item) => item.group))].map((group) => (
            <div className="admin-nav-group" key={group}>
              <p>{group}</p>
              {navItems.filter((item) => item.group === group).map((item) => (
                <button className={active === item.id ? 'is-active' : ''} key={item.id} onClick={() => changeSection(item.id)} type="button">
                  <span>{item.short}</span>{item.label}
                  {item.id === 'tickets' && dashboard?.openTickets ? <b>{dashboard.openTickets}</b> : null}
                  {item.id === 'calls' && dashboard?.dueCallTasks ? <b>{dashboard.dueCallTasks}</b> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="admin-exit" onClick={() => void run(async () => { await logout(); router.replace('/auth/login'); }, '', false)} type="button">خروج از حساب</button>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><h1>{navItems.find((item) => item.id === active)?.label}</h1><p>{adminName}، خوش آمدید</p></div>
          <div className="admin-top-actions"><button aria-label="تازه‌سازی اطلاعات" disabled={working} onClick={() => void refresh()} title="تازه‌سازی" type="button">↻</button><a href="/" title="مشاهده سایت">مشاهده سایت</a></div>
        </header>
        {error ? <p className="admin-alert is-error">{error}</p> : null}
        {success ? <p className="admin-alert is-success">{success}</p> : null}
        {active !== 'dashboard' && !['notifications', 'gallery', 'calls', 'tickets'].includes(active) ? <input className="admin-search" onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در این بخش..." value={search} /> : null}

        {active === 'dashboard' && dashboard ? <Dashboard dashboard={dashboard} requests={dashboard.recentRequests} setActive={changeSection} /> : null}
        {active === 'nazr' ? <NazrSection nazrTypes={nazrTypes} onPageChange={(page) => loadPage('nazr', page, search.trim())} requests={requests} run={run} working={working} /> : null}
        {active === 'users' ? <UsersSection users={users} onPageChange={(page) => loadPage('users', page, search.trim())} selected={selectedUser} select={selectUser} close={() => setSelectedUser(null)} run={run} working={working} /> : null}
        {active === 'payments' ? <PaymentsSection payments={payments} onPageChange={(page) => loadPage('payments', page, search.trim())} run={run} working={working} /> : null}
        {active === 'eitaa' ? <EitaaReceiptsSection items={eitaaReceipts} nazrTypes={nazrTypes} onPageChange={(page) => loadPage('eitaa', page, search.trim())} onSelectUser={selectUser} selectedUser={selectedUser} closeUser={() => setSelectedUser(null)} run={run} working={working} /> : null}
        {active === 'tickets' ? <TicketsSection tickets={tickets} onPageChange={(page) => loadPage('tickets', page)} run={run} working={working} /> : null}
        {active === 'notifications' ? <NotificationsSection items={notifications} onPageChange={(page) => loadPage('notifications', page)} users={notificationUsers} run={run} working={working} /> : null}
        {active === 'gallery' ? <GallerySection items={gallery} nazrTypes={nazrTypes} run={run} working={working} /> : null}
        {active === 'calls' ? <CallsSection items={callTasks} onPageChange={(page) => loadPage('calls', page)} run={run} working={working} /> : null}
      </section>
    </main>
  );
}

function Dashboard({ dashboard, requests, setActive }: { dashboard: AdminDashboardSummary; requests: NazrRequest[]; setActive: (value: AdminSection) => void }) {
  const stats = [
    ['مخاطبان', dashboard.users.toLocaleString('fa-IR'), 'users'], ['کل نذرها', dashboard.totalRequests.toLocaleString('fa-IR'), 'nazr'], ['در انتظار اقدام', dashboard.pendingRequests.toLocaleString('fa-IR'), 'nazr'], ['پرداخت معلق', dashboard.pendingPayments.toLocaleString('fa-IR'), 'payments'], ['تیکت باز', dashboard.openTickets.toLocaleString('fa-IR'), 'tickets'], ['تماس سررسیدشده', dashboard.dueCallTasks.toLocaleString('fa-IR'), 'calls'],
  ] as const;
  return <div className="admin-stack">
    <section className="admin-overview"><div><p>مجموع واریزی تأییدشده</p><strong>{money(dashboard.paidAmount)}</strong><small>نمای کلی فعالیت سامانه تا امروز</small></div><span>گزارش زنده</span></section>
    <section className="admin-stat-grid">{stats.map(([label, value, target]) => <button key={label} onClick={() => setActive(target)} type="button"><span>{label}</span><strong>{value}</strong><small>مشاهده جزئیات</small></button>)}</section>
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>آخرین فعالیت‌ها</h2><p>نذرهای تازه ثبت‌شده در سامانه</p></div><button className="admin-text-action" onClick={() => setActive('nazr')} type="button">مشاهده همه</button></div><RequestTable items={requests} /></section>
  </div>;
}

function NazrSection({ nazrTypes, requests, onPageChange, run, working }: { nazrTypes: NazrType[]; requests: Paginated<NazrRequest>; onPageChange: (page: number) => Promise<void>; run: Runner; working: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    slug: '',
    description: '',
    suggestedAmount: '',
  });
  const suggestedAmountValue = useMemo(
    () => parseAmountInput(formState.suggestedAmount),
    [formState.suggestedAmount],
  );

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormState({ title: '', slug: '', description: '', suggestedAmount: '' });
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormState({ title: '', slug: '', description: '', suggestedAmount: '' });
    setShowForm(true);
  };

  const openEditForm = (item: NazrType) => {
    setEditingId(item.id);
    setFormState({
      title: item.title,
      slug: item.slug,
      description: item.description,
      suggestedAmount: item.suggestedAmount
        ? formatAmountInput(String(item.suggestedAmount.amount))
        : '',
    });
    setShowForm(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      slug: formState.slug.trim(),
      title: formState.title.trim(),
      description: formState.description.trim(),
      suggestedAmount:
        suggestedAmountValue > 0
          ? { amount: suggestedAmountValue, currency: 'IRT' as const }
          : null,
    };
    const succeeded = await run(
      () =>
        editingId
          ? updateAdminNazrType(editingId, payload)
          : createAdminNazrType({ ...payload, isActive: true }),
      editingId ? 'اطلاعات طرح به‌روزرسانی شد' : 'نوع نذر ساخته شد',
    );
    if (succeeded) closeForm();
  };

  return <div className="admin-stack">
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>طرح‌ها و انواع نذر</h2><p>{nazrTypes.length.toLocaleString('fa-IR')} طرح ثبت‌شده</p></div><button className="admin-primary" onClick={openCreateForm} type="button">افزودن طرح</button></div>
      {showForm ? (
        <form className="admin-plan-form" onSubmit={submit}>
          <div className="admin-plan-form-head">
            <div>
              <h3>{editingId ? 'ویرایش اطلاعات طرح' : 'افزودن طرح جدید'}</h3>
              <p>{editingId ? 'عنوان، آدرس، مبلغ و توضیحات طرح را اصلاح کنید.' : 'اطلاعات اصلی طرح را کامل و سپس آن را ثبت کنید.'}</p>
            </div>
            <button className="admin-text-action" onClick={closeForm} type="button">بستن</button>
          </div>
          <div className="admin-plan-form-grid">
            <label>
              <span>عنوان طرح</span>
              <input onChange={(event) => setFormState((value) => ({ ...value, title: event.target.value }))} placeholder="مثلاً وقف در گردش" required value={formState.title} />
            </label>
            <label>
              <span>آدرس انگلیسی طرح</span>
              <input dir="ltr" onChange={(event) => setFormState((value) => ({ ...value, slug: event.target.value }))} placeholder="circulating-waqf" required value={formState.slug} />
            </label>
            <label className="admin-plan-amount-field">
              <span>مبلغ پیشنهادی</span>
              <div><input dir="ltr" inputMode="numeric" onChange={(event) => setFormState((value) => ({ ...value, suggestedAmount: formatAmountInput(event.target.value) }))} placeholder="مثلاً 300,000" value={formState.suggestedAmount} /><b>تومان</b></div>
              <small>{amountToPersianWords(suggestedAmountValue)}</small>
            </label>
            <label className="admin-plan-description-field">
              <span>توضیحات طرح</span>
              <textarea onChange={(event) => setFormState((value) => ({ ...value, description: event.target.value }))} placeholder="شرح کوتاه و روشن درباره هدف این طرح" required value={formState.description} />
            </label>
          </div>
          <div className="admin-plan-form-actions">
            <button className="admin-secondary" onClick={closeForm} type="button">انصراف</button>
            <button className="admin-primary" disabled={working} type="submit">{working ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ثبت طرح'}</button>
          </div>
        </form>
      ) : null}
      <div className="admin-card-grid">
        {nazrTypes.map((item) => (
          <article className="admin-plan-card" key={item.id}>
            <div>
              <span className={`admin-status ${item.isActive ? 'is-success' : 'is-neutral'}`}>{item.isActive ? 'فعال' : 'غیرفعال'}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <footer>
              <strong>{money(item.suggestedAmount)}</strong>
              <div className="admin-plan-card-actions">
                <button disabled={working} onClick={() => openEditForm(item)} type="button">
                  <Pencil aria-hidden="true" />
                  <span>ویرایش</span>
                </button>
                <button disabled={working} onClick={() => void run(() => updateAdminNazrType(item.id, { isActive: !item.isActive }), item.isActive ? 'طرح غیرفعال شد' : 'طرح فعال شد')} type="button">
                  <Power aria-hidden="true" />
                  <span>{item.isActive ? 'غیرفعال' : 'فعال‌سازی'}</span>
                </button>
                {item.isActive ? (
                  <button aria-label={`حذف طرح ${item.title}`} className="admin-plan-delete-action" disabled={working} onClick={() => void run(() => deleteAdminNazrType(item.id), 'طرح حذف شد')} title="حذف طرح" type="button">
                    <Trash2 aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>درخواست‌های نذر</h2><p>بررسی و تغییر وضعیت فعالیت‌ها</p></div></div><RequestTable items={requests.items} editable run={run} startIndex={(requests.page - 1) * requests.pageSize} working={working} /><AdminPagination info={requests} onPageChange={onPageChange} working={working} /></section>
  </div>;
}

function RequestTable({ items, editable = false, run, startIndex = 0, working }: { items: NazrRequest[]; editable?: boolean; run?: Runner; startIndex?: number; working?: boolean }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>مخاطب</th><th>طرح</th><th>مبلغ</th><th>کد رهگیری</th><th>تاریخ</th><th>وضعیت</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><strong>{item.donorFullName}</strong><small>{item.donorMobile}</small></td><td>{item.nazrType.title}</td><td>{money(item.amount)}</td><td dir="ltr">{item.trackingCode}</td><td>{date(item.createdAt)}</td><td>{editable && run ? <select disabled={working} onChange={(event) => void run(() => updateAdminNazrStatus(item.id, event.target.value as NazrRequestStatus), 'وضعیت نذر به‌روزرسانی شد')} value={item.status}>{requestStatuses.map((status) => <option key={status} value={status}>{requestLabels[status]}</option>)}</select> : <span className={`admin-status ${statusClass(item.status)}`}>{requestLabels[item.status]}</span>}</td></tr>)}</tbody></table>{!items.length ? <Empty /> : null}</div>;
}

function UsersSection({ users, onPageChange, selected, select, close, run, working }: { users: Paginated<AdminUserListItem>; onPageChange: (page: number) => Promise<void>; selected: AdminUserDetails | null; select: (id: string) => Promise<void>; close: () => void; run: Runner; working: boolean }) {
  const startIndex = (users.page - 1) * users.pageSize;
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>مخاطبان</h2><p>پرونده ارتباطی و سوابق مشارکت</p></div><span className="admin-count">{users.total.toLocaleString('fa-IR')} نفر</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>نام و تماس</th><th>مرحله CRM</th><th>مشارکت</th><th>مجموع پرداخت</th><th>پیگیری بعدی</th><th></th></tr></thead><tbody>{users.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><strong>{item.fullName}</strong><small>{item.mobile}{item.eitaNumber ? ` · ایتا: ${item.eitaNumber}` : ''}</small></td><td><span className={`admin-status ${item.crmStage === 'at_risk' ? 'is-warning' : 'is-neutral'}`}>{crmLabels[item.crmStage]}</span></td><td>{item.requestCount.toLocaleString('fa-IR')} نذر</td><td>{money(item.paidAmount)}</td><td>{date(item.nextFollowUpAt)}</td><td><button className="admin-text-action" onClick={() => void select(item.id)} type="button">پرونده</button></td></tr>)}</tbody></table>{!users.items.length ? <Empty /> : null}</div><AdminPagination info={users} onPageChange={onPageChange} working={working} />{selected ? <UserDrawer details={selected} close={close} refresh={select} run={run} working={working} /> : null}</section>;
}

function UserDrawer({ details, close, refresh, run, working }: { details: AdminUserDetails; close: () => void; refresh: (id: string) => Promise<void>; run: Runner; working: boolean }) {
  const [activityType, setActivityType] = useState<CrmActivityType>('call'); const [activity, setActivity] = useState('');
  const saveCrm = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(async () => { await updateAdminCrm(details.user.id, { stage: String(data.get('stage')) as CrmStage, tags: String(data.get('tags')).split('،').map((item) => item.trim()).filter(Boolean), assignedTo: String(data.get('assignedTo')) || null, note: String(data.get('note')) || null, nextFollowUpAt: data.get('nextFollowUpAt') ? jalaliDateToIso(String(data.get('nextFollowUpAt'))) : null }); await refresh(details.user.id); }, 'پرونده CRM ذخیره شد'); };
  return <div className="admin-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><aside className="admin-drawer"><header><div><h2>{details.user.fullName}</h2><p>{details.user.mobile}</p></div><button aria-label="بستن" onClick={close} type="button">×</button></header><div className="admin-drawer-body"><div className="admin-mini-stats"><span><small>تعداد نذر</small><strong>{details.user.requestCount.toLocaleString('fa-IR')}</strong></span><span><small>مجموع پرداخت</small><strong>{money(details.user.paidAmount)}</strong></span></div><form className="admin-form-stack" onSubmit={saveCrm}><h3>وضعیت ارتباط</h3><label>مرحله<select defaultValue={details.crm.stage} name="stage">{Object.entries(crmLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>برچسب‌ها<input defaultValue={details.crm.tags.join('، ')} name="tags" placeholder="همراه قدیمی، تماس ماهانه" /></label><label>مسئول پیگیری<input defaultValue={details.crm.assignedTo ?? ''} name="assignedTo" /></label><label>اقدام بعدی<input defaultValue={details.crm.nextFollowUpAt ? jalaliDateInput(details.crm.nextFollowUpAt) : ''} dir="ltr" inputMode="numeric" maxLength={10} name="nextFollowUpAt" placeholder="1405/02/03" /></label><label>یادداشت<textarea defaultValue={details.crm.note ?? ''} name="note" /></label><button className="admin-primary" disabled={working}>ذخیره پرونده</button></form><div className="admin-form-stack"><h3>ثبت فعالیت</h3><select onChange={(event) => setActivityType(event.target.value as CrmActivityType)} value={activityType}><option value="call">تماس</option><option value="note">یادداشت</option><option value="payment">پرداخت</option><option value="ticket">تیکت</option><option value="status">تغییر وضعیت</option></select><textarea onChange={(event) => setActivity(event.target.value)} placeholder="خلاصه گفتگو یا اقدام انجام‌شده" value={activity} /><button className="admin-secondary" disabled={!activity.trim() || working} onClick={() => void run(async () => { await addAdminCrmActivity(details.user.id, { type: activityType, summary: activity }); setActivity(''); await refresh(details.user.id); }, 'فعالیت ثبت شد')} type="button">ثبت در تاریخچه</button></div><div className="admin-timeline"><h3>تاریخچه CRM</h3>{details.activities.map((item) => <article key={item.id}><span></span><div><strong>{item.summary}</strong><small>{item.createdBy} · {date(item.createdAt)}</small></div></article>)}{!details.activities.length ? <Empty /> : null}</div></div></aside></div>;
}

function PaymentsSection({ payments, onPageChange, run, working }: { payments: Paginated<Payment>; onPageChange: (page: number) => Promise<void>; run: Runner; working: boolean }) {
  const startIndex = (payments.page - 1) * payments.pageSize;
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>واریزها و پرداخت‌ها</h2><p>کنترل پرداخت‌های آنلاین و رسیدهای ثبت‌شده</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>شناسه درخواست</th><th>روش</th><th>مبلغ</th><th>مرجع تراکنش</th><th>تاریخ</th><th>وضعیت و اقدام</th></tr></thead><tbody>{payments.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td dir="ltr">{item.nazrRequestId.slice(0, 8)}</td><td>{item.method === 'online' ? 'آنلاین' : item.method === 'cash' ? 'نقدی' : 'کارت‌به‌کارت'}</td><td>{money(item.amount)}</td><td dir="ltr">{item.transactionReference ?? '—'}</td><td>{date(item.createdAt)}</td><td><div className="admin-inline-actions"><span className={`admin-status ${statusClass(item.status)}`}>{paymentLabels[item.status]}</span>{item.status === 'pending' ? <><button disabled={working} onClick={() => void run(() => setAdminPaymentStatus(item.id, 'paid'), 'پرداخت تأیید شد')} type="button">تأیید</button><button className="is-danger-text" disabled={working} onClick={() => void run(() => setAdminPaymentStatus(item.id, 'rejected', 'رد توسط مدیر'), 'پرداخت رد شد')} type="button">رد</button></> : null}</div></td></tr>)}</tbody></table>{!payments.items.length ? <Empty /> : null}</div><AdminPagination info={payments} onPageChange={onPageChange} working={working} /></section>;
}

function EitaaReceiptsSection({ items, nazrTypes, onPageChange, onSelectUser, selectedUser, closeUser, run, working }: { items: Paginated<AdminEitaaReceipt>; nazrTypes: NazrType[]; onPageChange: (page: number) => Promise<void>; onSelectUser: (id: string) => Promise<void>; selectedUser: AdminUserDetails | null; closeUser: () => void; run: Runner; working: boolean }) {
  const [amountInput, setAmountInput] = useState('');
  const [receivedAt, setReceivedAt] = useState(jalaliDateInput());
  const amountValue = useMemo(() => parseAmountInput(amountInput), [amountInput]);
  const startIndex = (items.page - 1) * items.pageSize;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const succeeded = await run(
      () => createAdminEitaaReceipt({
        fullName: String(data.get('fullName')),
        mobile: String(data.get('mobile')),
        eitaNumber: String(data.get('eitaNumber')).trim() || null,
        nazrTypeId: String(data.get('nazrTypeId')),
        amount: { amount: amountValue, currency: 'IRT' },
        transactionReference: String(data.get('transactionReference')).trim() || null,
        eitaaMessageUrl: String(data.get('eitaaMessageUrl')).trim() || null,
        receivedAt: jalaliDateToStartOfDayIso(receivedAt),
        note: String(data.get('note')).trim() || null,
      }),
      'رسید ایتا ثبت و نذر تأیید شد',
    );
    if (succeeded) {
      form.reset();
      setAmountInput('');
      setReceivedAt(jalaliDateInput());
    }
  };

  return (
    <div className="admin-stack">
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div><h2>ثبت رسید ایتا</h2><p>ثبت نذر و پرداخت تأییدشده بر اساس رسید دریافتی</p></div>
        </div>
        <form className="admin-plan-form admin-eitaa-form" onSubmit={submit}>
          <div className="admin-plan-form-grid admin-eitaa-form-grid">
            <label><span>نام و نام خانوادگی</span><input name="fullName" placeholder="نام کامل مخاطب" required /></label>
            <label><span>شماره همراه</span><input dir="ltr" inputMode="numeric" maxLength={11} name="mobile" placeholder="09123456789" required /></label>
            <label><span>شماره یا شناسه ایتا</span><input dir="ltr" name="eitaNumber" placeholder="اختیاری" /></label>
            <label><span>طرح نذر</span><select name="nazrTypeId" required><option value="">انتخاب طرح</option>{nazrTypes.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="admin-plan-amount-field">
              <span>مبلغ واریزی</span>
              <div><input dir="ltr" inputMode="numeric" onChange={(event) => setAmountInput(formatAmountInput(event.target.value))} placeholder="مثلاً 300,000" required value={amountInput} /><b>تومان</b></div>
              <small>{amountToPersianWords(amountValue)}</small>
            </label>
            <label><span>تاریخ دریافت رسید</span><input dir="ltr" inputMode="numeric" maxLength={10} onChange={(event) => setReceivedAt(event.target.value)} placeholder="1405/02/03" required value={receivedAt} /></label>
            <label><span>شماره مرجع تراکنش</span><input dir="ltr" name="transactionReference" placeholder="اختیاری" /></label>
            <label className="admin-eitaa-url-field"><span>لینک پیام ایتا</span><input dir="ltr" name="eitaaMessageUrl" placeholder="https://eitaa.com/..." type="url" /></label>
            <label className="admin-plan-description-field"><span>یادداشت مدیر</span><textarea maxLength={1000} name="note" placeholder="توضیح تکمیلی درباره رسید یا مخاطب" /></label>
          </div>
          <div className="admin-plan-form-actions">
            <button className="admin-primary" disabled={working || amountValue <= 0} type="submit">{working ? 'در حال ثبت...' : 'ثبت و تأیید نذر'}</button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>مخاطبان تأییدشده از ایتا</h2><p>رسیدهایی که توسط مدیر ثبت و قطعی شده‌اند</p></div><span className="admin-count">{items.total.toLocaleString('fa-IR')} رسید</span></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th className="admin-row-number">ردیف</th><th>مخاطب</th><th>طرح</th><th>مبلغ</th><th>تاریخ رسید</th><th>کد رهگیری</th><th>وضعیت</th><th>پیام ایتا</th></tr></thead>
            <tbody>{items.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><button className="admin-table-user-action" onClick={() => void onSelectUser(item.userId)} type="button"><strong>{item.userFullName}</strong><small>{item.userMobile}{item.eitaNumber ? ` · ${item.eitaNumber}` : ''}</small></button></td><td>{item.nazrTypeTitle}</td><td>{money(item.amount)}</td><td><strong>{date(item.receivedAt)}</strong><small>ثبت توسط {item.recordedBy}</small></td><td dir="ltr">{item.trackingCode}</td><td><span className={`admin-status ${statusClass(item.requestStatus)}`}>{requestLabels[item.requestStatus]}</span><small>{paymentLabels[item.paymentStatus]}</small></td><td>{item.eitaaMessageUrl ? <a className="admin-text-action" href={item.eitaaMessageUrl} rel="noreferrer" target="_blank">مشاهده پیام</a> : '—'}</td></tr>)}</tbody>
          </table>
          {!items.items.length ? <Empty text="هنوز رسیدی از ایتا ثبت نشده است." /> : null}
        </div>
        <AdminPagination info={items} onPageChange={onPageChange} working={working} />
      </section>
      {selectedUser ? <UserDrawer details={selectedUser} close={closeUser} refresh={onSelectUser} run={run} working={working} /> : null}
    </div>
  );
}

function TicketsSection({ tickets, onPageChange, run, working }: { tickets: Paginated<Ticket>; onPageChange: (page: number) => Promise<void>; run: Runner; working: boolean }) {
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(tickets.items[0]?.id ?? null);
  const [filter, setFilter] = useState<'all' | Ticket['status']>('all');
  const filteredTickets = filter === 'all' ? tickets.items : tickets.items.filter((ticket) => ticket.status === filter);
  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedId) ?? filteredTickets[0] ?? null;

  return (
    <section className="admin-ticket-center">
      <header className="admin-ticket-toolbar">
        <div>
          <h2>مرکز پشتیبانی</h2>
          <p>{tickets.total.toLocaleString('fa-IR')} تیکت ثبت‌شده</p>
        </div>
        <div className="admin-ticket-filters" role="group" aria-label="فیلتر وضعیت تیکت‌ها">
          {([['all', 'همه'], ['open', 'باز'], ['answered', 'پاسخ‌داده‌شده'], ['closed', 'بسته']] as const).map(([value, label]) => (
            <button className={filter === value ? 'is-active' : ''} key={value} onClick={() => setFilter(value)} type="button">{label}</button>
          ))}
        </div>
      </header>

      <div className="admin-ticket-layout">
        <aside className="admin-ticket-inbox" aria-label="فهرست تیکت‌ها">
          {filteredTickets.map((ticket) => {
            const lastMessage = ticket.messages[ticket.messages.length - 1];
            return (
              <button className={selectedTicket?.id === ticket.id ? 'is-active' : ''} key={ticket.id} onClick={() => setSelectedId(ticket.id)} type="button">
                <span className={`admin-ticket-state ${statusClass(ticket.status)}`}></span>
                <span className="admin-ticket-preview">
                  <strong>{ticket.subject}</strong>
                  <small>{ticket.guestMobile ?? (ticket.userId ? 'کاربر ثبت‌نام‌شده' : 'مخاطب')}</small>
                  <p>{lastMessage?.body ?? 'بدون پیام'}</p>
                </span>
                <time>{date(ticket.updatedAt)}</time>
              </button>
            );
          })}
          {!filteredTickets.length ? <Empty text="تیکتی با این وضعیت وجود ندارد." /> : null}
        </aside>

        {selectedTicket ? (
          <article className="admin-ticket-conversation">
            <header>
              <div>
                <h3>{selectedTicket.subject}</h3>
                <p>{selectedTicket.guestMobile ?? (selectedTicket.userId ? 'کاربر ثبت‌نام‌شده' : 'مخاطب')} · ایجاد در {date(selectedTicket.createdAt)}</p>
              </div>
              <span className={`admin-status ${statusClass(selectedTicket.status)}`}>{ticketLabels[selectedTicket.status]}</span>
            </header>

            <div className="admin-ticket-thread">
              {selectedTicket.messages.map((message) => (
                <div className={`admin-ticket-message ${message.authorType === 'support' ? 'is-own' : ''}`} key={message.id}>
                  <div>
                    <span className="admin-ticket-author">{message.authorType === 'support' ? 'پشتیبانی' : 'مخاطب'}</span>
                    <p>{message.body}</p>
                    <time>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.createdAt))}</time>
                  </div>
                </div>
              ))}
            </div>

            {selectedTicket.status !== 'closed' ? (
              <footer className="admin-ticket-composer">
                <textarea
                  onChange={(event) => setReplies((value) => ({ ...value, [selectedTicket.id]: event.target.value }))}
                  placeholder="پاسخ خود را برای مخاطب بنویسید..."
                  rows={3}
                  value={replies[selectedTicket.id] ?? ''}
                />
                <div>
                  <button className="admin-secondary" disabled={working} onClick={() => void run(() => closeTicket(selectedTicket.id), 'تیکت بسته شد')} type="button">بستن تیکت</button>
                  <button className="admin-primary" disabled={working || !replies[selectedTicket.id]?.trim()} onClick={() => void run(async () => { await replyTicket(selectedTicket.id, replies[selectedTicket.id]); setReplies((value) => ({ ...value, [selectedTicket.id]: '' })); }, 'پاسخ ارسال شد')} type="button">ارسال پاسخ</button>
                </div>
              </footer>
            ) : <p className="admin-ticket-closed">این گفتگو بسته شده است.</p>}
          </article>
        ) : (
          <div className="admin-ticket-no-selection"><Empty text="برای مشاهده گفتگو، یک تیکت را انتخاب کنید." /></div>
        )}
      </div>
      <AdminPagination info={tickets} onPageChange={onPageChange} working={working} />
    </section>
  );
}

function NotificationsSection({ items, onPageChange, users, run, working }: { items: Paginated<AdminNotificationItem>; onPageChange: (page: number) => Promise<void>; users: AdminUserListItem[]; run: Runner; working: boolean }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); if (await run(() => createAdminNotification({ userId: String(data.get('userId')) || null, title: String(data.get('title')), body: String(data.get('body')), link: String(data.get('link')) || null }), 'اعلان ارسال شد')) form.reset(); };
  return <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel-head"><div><h2>ارسال اعلان</h2><p>پیام عمومی یا اختصاصی برای مخاطب</p></div></div><form className="admin-form-stack" onSubmit={submit}><label>مخاطب<select name="userId"><option value="">همه مخاطبان</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.mobile}</option>)}</select></label><label>عنوان<input name="title" required /></label><label>متن<textarea name="body" required /></label><label>لینک مرتبط<input dir="ltr" name="link" placeholder="/profile" /></label><button className="admin-primary" disabled={working}>ارسال اعلان</button></form></section><section className="admin-panel"><div className="admin-panel-head"><div><h2>اعلان‌های اخیر</h2><p>سوابق پیام‌های ارسال‌شده</p></div></div><div className="admin-notification-list">{items.items.map((item) => <article key={item.id}><div><h3>{item.title}</h3><p>{item.body}</p></div><small>{item.userFullName ?? 'ارسال عمومی'} · {date(item.createdAt)}</small></article>)}</div><AdminPagination info={items} onPageChange={onPageChange} working={working} /></section></div>;
}

function GallerySection({ items, nazrTypes, run, working }: { items: GalleryAsset[]; nazrTypes: NazrType[]; run: Runner; working: boolean }) {
  const [placement, setPlacement] = useState<GalleryAssetPlacement>('gallery');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaFileName, setMediaFileName] = useState('');
  const [thumbnailFileName, setThumbnailFileName] = useState('');
  const introItems = items.filter((item) => item.placement === 'intro');
  const galleryItems = items.filter((item) => item.placement === 'gallery');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const mediaFile = data.get('mediaFile');
    const thumbnailFile = data.get('thumbnailFile');
    if (!(mediaFile instanceof File) || !mediaFile.size) return;

    const succeeded = await run(async () => {
      const uploadedMedia = await uploadAdminGalleryFile(mediaFile, mediaType);
      const uploadedThumbnail =
        thumbnailFile instanceof File && thumbnailFile.size
          ? await uploadAdminGalleryFile(thumbnailFile, 'image')
          : null;
      return createAdminGallery({
        title: String(data.get('title')),
        type: mediaType,
        placement,
        fileUrl: uploadedMedia.url,
        thumbnailUrl: uploadedThumbnail?.url ?? null,
        nazrTypeId: placement === 'gallery' ? String(data.get('nazrTypeId')) || null : null,
      });
    }, placement === 'intro' ? 'ویدیوی معرفی صفحه اصلی ثبت شد' : 'گزارش اجرا به گالری اضافه شد');

    if (succeeded) {
      form.reset();
      setPlacement('gallery');
      setMediaType('image');
      setMediaFileName('');
      setThumbnailFileName('');
    }
  };

  const mediaCards = (mediaItems: GalleryAsset[], emptyText: string) => (
    <div className="admin-gallery-grid">
      {mediaItems.map((item) => (
        <article key={item.id}>
          <div className="admin-gallery-preview">
            {item.thumbnailUrl ? <img alt={item.title} src={item.thumbnailUrl} /> : item.type === 'image' ? <img alt={item.title} src={item.fileUrl} /> : <div className="admin-media-placeholder">ویدئو بدون تصویر</div>}
            <span>{item.placement === 'intro' ? 'معرفی صفحه اصلی' : item.type === 'video' ? 'گزارش ویدیویی' : 'تصویر گالری'}</span>
          </div>
          <div className="admin-gallery-info">
            <h3>{item.title}</h3>
            <a href={item.fileUrl} rel="noreferrer" target="_blank">مشاهده فایل</a>
            <button className="is-danger-text" onClick={() => void run(() => deleteAdminGallery(item.id), 'رسانه حذف شد')} type="button">حذف</button>
          </div>
        </article>
      ))}
      {!mediaItems.length ? <Empty text={emptyText} /> : null}
    </div>
  );

  return (
    <div className="admin-stack">
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>افزودن رسانه</h2>
            <p>ابتدا مشخص کنید رسانه برای معرفی کلی صفحه اصلی است یا گزارش اجرای طرح‌ها.</p>
          </div>
        </div>
        <form className="admin-form-grid admin-gallery-form" onSubmit={submit}>
          <label>
            محل نمایش
            <select
              name="placement"
              onChange={(event) => {
                const nextPlacement = event.target.value as GalleryAssetPlacement;
                setPlacement(nextPlacement);
                if (nextPlacement === 'intro') setMediaType('video');
                setMediaFileName('');
                setThumbnailFileName('');
              }}
              value={placement}
            >
              <option value="gallery">گزارش اجرا در گالری</option>
              <option value="intro">ویدیوی معرفی بالای صفحه</option>
            </select>
          </label>
          <input name="title" placeholder="عنوان رسانه" required />
          <label>
            نوع رسانه
            <select
              disabled={placement === 'intro'}
              name="type"
              onChange={(event) => {
                setMediaType(event.target.value as 'image' | 'video');
                setMediaFileName('');
              }}
              value={mediaType}
            >
              <option value="image">تصویر</option>
              <option value="video">ویدئو</option>
            </select>
          </label>
          <label>
            طرح مرتبط
            <select disabled={placement === 'intro'} name="nazrTypeId">
              <option value="">بدون طرح مشخص</option>
              {nazrTypes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="admin-upload-field">
            <span>{mediaType === 'video' ? 'فایل ویدئو' : 'فایل تصویر'}</span>
            <small>{mediaType === 'video' ? 'MP4، WebM یا MOV تا ۱۵۰ مگابایت' : 'JPEG، PNG، WebP، GIF یا AVIF تا ۱۰ مگابایت'}</small>
            <input
              accept={mediaType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif,image/avif'}
              key={mediaType}
              name="mediaFile"
              onChange={(event) => setMediaFileName(event.target.files?.[0]?.name ?? '')}
              required
              type="file"
            />
            <span className="admin-upload-control"><b>انتخاب فایل</b><em>{mediaFileName || 'فایلی انتخاب نشده'}</em></span>
          </label>
          <label className="admin-upload-field">
            <span>تصویر بندانگشتی {mediaType === 'video' ? '' : '(اختیاری)'}</span>
            <small>تصویری که پیش از پخش ویدئو نمایش داده می‌شود.</small>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              name="thumbnailFile"
              onChange={(event) => setThumbnailFileName(event.target.files?.[0]?.name ?? '')}
              required={mediaType === 'video'}
              type="file"
            />
            <span className="admin-upload-control"><b>انتخاب تصویر</b><em>{thumbnailFileName || 'فایلی انتخاب نشده'}</em></span>
          </label>
          <button className="admin-primary" disabled={working}>
            {working ? 'در حال آپلود...' : placement === 'intro' ? 'ثبت ویدیوی معرفی' : 'افزودن به گالری اجراها'}
          </button>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>ویدیوی معرفی صفحه اصلی</h2>
            <p>این کلیپ فقط بالای صفحه اصلی نمایش داده می‌شود و با گزارش اجراها مشترک نیست.</p>
          </div>
        </div>
        {mediaCards(introItems, 'هنوز ویدیوی معرفی صفحه اصلی ثبت نشده است.')}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>گزارش‌های اجرای طرح‌ها</h2>
            <p>تصاویر و ویدیوهای این بخش فقط در گالری و گزارش‌های قابل دریافت نمایش داده می‌شوند.</p>
          </div>
        </div>
        {mediaCards(galleryItems, 'هنوز گزارشی برای گالری ثبت نشده است.')}
      </section>
    </div>
  );
}

function CallsSection({ items, onPageChange, run, working }: { items: Paginated<CallTask>; onPageChange: (page: number) => Promise<void>; run: Runner; working: boolean }) {
  const [period, setPeriod] = useState(jalaliMonthInput()); const [dueDate, setDueDate] = useState(jalaliDateInput());
  const startIndex = (items.page - 1) * items.pageSize;
  return <div className="admin-stack"><section className="admin-call-header"><div><h2>صف پیگیری ماهانه</h2><p>مخاطبان دارای پرداخت دوره‌ای را برای تماس این ماه آماده کنید.</p></div><div><input dir="ltr" inputMode="numeric" maxLength={7} onChange={(event) => setPeriod(event.target.value)} placeholder="1405/02" value={period} /><input dir="ltr" inputMode="numeric" maxLength={10} onChange={(event) => setDueDate(event.target.value)} placeholder="1405/02/03" value={dueDate} /><button className="admin-primary" disabled={working} onClick={() => void run(() => generateAdminCallTasks(period.replace('/', '-'), jalaliDateToIso(dueDate)), 'صف تماس ماهانه ساخته شد')} type="button">ساخت صف ماه</button></div></section><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>مخاطب</th><th>دوره</th><th>مبلغ مورد انتظار</th><th>سررسید</th><th>مسئول</th><th>نتیجه پیگیری</th></tr></thead><tbody>{items.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><strong>{item.userFullName}</strong><small><a href={`tel:${item.userMobile}`}>{item.userMobile}</a></small></td><td dir="ltr">{item.period.replace('-', '/')}</td><td>{money(item.expectedAmount)}</td><td>{date(item.dueDate)}</td><td>{item.assignedTo ?? 'تخصیص‌نیافته'}</td><td><select disabled={working} onChange={(event) => void run(() => updateAdminCallTask(item.id, { status: event.target.value as CallTaskStatus }), 'نتیجه تماس ثبت شد')} value={item.status}>{Object.entries(callLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table>{!items.items.length ? <Empty text="هنوز پیگیری ماهانه‌ای ساخته نشده است." /> : null}</div><AdminPagination info={items} onPageChange={onPageChange} working={working} /></section></div>;
}

type Runner = (action: () => Promise<unknown>, message: string, reload?: boolean) => Promise<boolean>;
type PaginationInfo = Pick<Paginated<unknown>, 'page' | 'pageSize' | 'total' | 'totalPages'>;

function AdminPagination({ info, onPageChange, working }: { info: PaginationInfo; onPageChange: (page: number) => Promise<void>; working: boolean }) {
  if (!info.total) return null;
  const totalPages = Math.max(1, info.totalPages);
  const firstItem = (info.page - 1) * info.pageSize + 1;
  const lastItem = Math.min(info.page * info.pageSize, info.total);
  return (
    <nav aria-label="صفحه‌بندی جدول" className="admin-pagination">
      <span>نمایش {firstItem.toLocaleString('fa-IR')} تا {lastItem.toLocaleString('fa-IR')} از {info.total.toLocaleString('fa-IR')}</span>
      <div>
        <button aria-label="صفحه قبلی" disabled={working || info.page <= 1} onClick={() => void onPageChange(info.page - 1)} title="صفحه قبلی" type="button"><ChevronRight aria-hidden="true" /></button>
        <strong>صفحه {info.page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</strong>
        <button aria-label="صفحه بعدی" disabled={working || info.page >= totalPages} onClick={() => void onPageChange(info.page + 1)} title="صفحه بعدی" type="button"><ChevronLeft aria-hidden="true" /></button>
      </div>
    </nav>
  );
}

function Empty({ text = 'موردی برای نمایش وجود ندارد.' }: { text?: string }) { return <p className="admin-empty">{text}</p>; }
