'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pencil, Power, Trash2 } from 'lucide-react';
import type {
  AdminDashboardSummary,
  AdminEitaaReceipt,
  AdminNotificationItem,
  AdminUserDetails,
  AdminUserListItem,
  CallOperator,
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
  ApiRequestError,
  addAdminCrmActivity,
  closeTicket,
  createAdminEitaaReceipt,
  createAdminGallery,
  createAdminNazrType,
  createAdminNotification,
  deleteAdminGallery,
  deleteAdminNazrType,
  generateAdminCallTasks,
  getAdminCallOperators,
  getAdminCallTasks,
  getAdminDashboard,
  getAdminEitaaReceipts,
  getAdminGallery,
  getAdminNazrRequests,
  getAdminNazrTypes,
  getAdminNotifications,
  getAdminPayments,
  getAdminTicket,
  getAdminTickets,
  getAdminUser,
  getAdminUsers,
  getMe,
  logout,
  replyTicket,
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
import { AdminGuide, AdminGuidePrompt } from './admin-guide';

type AdminSection = 'dashboard' | 'requests' | 'nazrTypes' | 'users' | 'payments' | 'eitaa' | 'tickets' | 'notifications' | 'gallery' | 'calls';
type AdminScreen = AdminSection | 'guide' | 'nazrTypeForm' | 'userDetails' | 'eitaaForm' | 'ticketDetails' | 'notificationForm' | 'galleryForm' | 'callsForm';
type PaginatedAdminSection = 'requests' | 'users' | 'payments' | 'eitaa' | 'tickets' | 'notifications' | 'calls';

let guidePromptShownDuringCurrentVisit = false;

interface ResolvedAdminView {
  id: string | null;
  parent: AdminSection;
  screen: AdminScreen;
  title: string;
}

const ADMIN_PAGE_SIZE = 10;

function emptyPage<T>(): Paginated<T> {
  return { items: [], page: 1, pageSize: ADMIN_PAGE_SIZE, total: 0, totalPages: 0 };
}

const navItems: { id: AdminSection; href: string; label: string; short: string; group: string }[] = [
  { id: 'dashboard', href: '/admin', label: 'داشبورد', short: 'د', group: 'نمای کلی' },
  { id: 'requests', href: '/admin/nazr-requests', label: 'درخواست‌های نذر', short: 'ن', group: 'عملیات' },
  { id: 'nazrTypes', href: '/admin/nazr-types', label: 'طرح‌ها', short: 'ط', group: 'عملیات' },
  { id: 'payments', href: '/admin/payments', label: 'پرداخت‌ها', short: 'و', group: 'عملیات' },
  { id: 'eitaa', href: '/admin/eitaa-receipts', label: 'رسیدهای ایتا', short: 'ا', group: 'عملیات' },
  { id: 'users', href: '/admin/users', label: 'مخاطبان و CRM', short: 'م', group: 'ارتباط' },
  { id: 'calls', href: '/admin/calls', label: 'کال‌سنتر', short: 'ک', group: 'ارتباط' },
  { id: 'tickets', href: '/admin/tickets', label: 'تیکت‌ها', short: 'ت', group: 'ارتباط' },
  { id: 'notifications', href: '/admin/notifications', label: 'اعلان‌ها', short: 'ا', group: 'محتوا' },
  { id: 'gallery', href: '/admin/gallery', label: 'گالری', short: 'گ', group: 'محتوا' },
];

function resolveAdminView(parts: string[]): ResolvedAdminView {
  const [resource, id, action] = parts;
  if (!resource) return { id: null, parent: 'dashboard', screen: 'dashboard', title: 'داشبورد' };
  if (resource === 'guide') return { id: null, parent: 'dashboard', screen: 'guide', title: 'آموزش پنل مدیریت' };
  if (resource === 'nazr-requests') return { id: null, parent: 'requests', screen: 'requests', title: 'درخواست‌های نذر' };
  if (resource === 'nazr-types' && id === 'new') return { id: null, parent: 'nazrTypes', screen: 'nazrTypeForm', title: 'افزودن طرح' };
  if (resource === 'nazr-types' && id && action === 'edit') return { id, parent: 'nazrTypes', screen: 'nazrTypeForm', title: 'ویرایش طرح' };
  if (resource === 'nazr-types') return { id: null, parent: 'nazrTypes', screen: 'nazrTypes', title: 'طرح‌ها' };
  if (resource === 'users' && id) return { id, parent: 'users', screen: 'userDetails', title: 'پرونده مخاطب' };
  if (resource === 'users') return { id: null, parent: 'users', screen: 'users', title: 'مخاطبان و CRM' };
  if (resource === 'payments') return { id: null, parent: 'payments', screen: 'payments', title: 'پرداخت‌ها' };
  if (resource === 'eitaa-receipts' && id === 'new') return { id: null, parent: 'eitaa', screen: 'eitaaForm', title: 'ثبت رسید ایتا' };
  if (resource === 'eitaa-receipts') return { id: null, parent: 'eitaa', screen: 'eitaa', title: 'رسیدهای ایتا' };
  if (resource === 'tickets' && id) return { id, parent: 'tickets', screen: 'ticketDetails', title: 'گفت‌وگوی تیکت' };
  if (resource === 'tickets') return { id: null, parent: 'tickets', screen: 'tickets', title: 'تیکت‌ها' };
  if (resource === 'notifications' && id === 'new') return { id: null, parent: 'notifications', screen: 'notificationForm', title: 'ارسال اعلان' };
  if (resource === 'notifications') return { id: null, parent: 'notifications', screen: 'notifications', title: 'اعلان‌ها' };
  if (resource === 'gallery' && id === 'new') return { id: null, parent: 'gallery', screen: 'galleryForm', title: 'افزودن رسانه' };
  if (resource === 'gallery') return { id: null, parent: 'gallery', screen: 'gallery', title: 'گالری' };
  if (resource === 'calls' && id === 'new') return { id: null, parent: 'calls', screen: 'callsForm', title: 'ساخت صف تماس' };
  if (resource === 'calls') return { id: null, parent: 'calls', screen: 'calls', title: 'کال‌سنتر' };
  return { id: null, parent: 'dashboard', screen: 'dashboard', title: 'داشبورد' };
}

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

export function AdminPanel({ view = [] }: { view?: string[] }) {
  const router = useRouter();
  const routeKey = view.join('/');
  const resolvedView = useMemo(() => resolveAdminView(view), [routeKey]);
  const { id: resourceId, parent: active, screen, title } = resolvedView;
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
  const [callOperators, setCallOperators] = useState<CallOperator[]>([]);
  const [callAssignee, setCallAssignee] = useState('');
  const [adminId, setAdminId] = useState('');
  const [guidePromptOpen, setGuidePromptOpen] = useState(false);
  const [guidePromptDontShow, setGuidePromptDontShow] = useState(false);
  const guidePromptDismissed = useRef(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const me = await getMe();
      if (me.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAdminId(me.id);
      setAdminName(me.fullName);
      if (screen !== 'guide' && !guidePromptDismissed.current && !guidePromptShownDuringCurrentVisit) {
        try {
          const permanentKey = `nazr-emam:admin-guide-dismissed:${me.id}`;
          if (window.localStorage.getItem(permanentKey) !== '1') {
            guidePromptShownDuringCurrentVisit = true;
            setGuidePromptOpen(true);
          }
        } catch {
          guidePromptShownDuringCurrentVisit = true;
          setGuidePromptOpen(true);
        }
      }
      setDashboard(await getAdminDashboard());
      if (screen === 'requests') setRequests(await getAdminNazrRequests(1, ADMIN_PAGE_SIZE));
      if (screen === 'nazrTypes' || screen === 'nazrTypeForm' || screen === 'eitaaForm' || screen === 'galleryForm') setNazrTypes(await getAdminNazrTypes());
      if (screen === 'users') setUsers(await getAdminUsers(1, ADMIN_PAGE_SIZE));
      if (screen === 'userDetails' && resourceId) setSelectedUser(await getAdminUser(resourceId));
      if (screen === 'payments') setPayments(await getAdminPayments(1, ADMIN_PAGE_SIZE));
      if (screen === 'eitaa') setEitaaReceipts(await getAdminEitaaReceipts(1, ADMIN_PAGE_SIZE));
      if (screen === 'tickets') setTickets(await getAdminTickets(1, ADMIN_PAGE_SIZE));
      if (screen === 'ticketDetails' && resourceId) setSelectedTicket(await getAdminTicket(resourceId));
      if (screen === 'notifications') setNotifications(await getAdminNotifications(1, ADMIN_PAGE_SIZE));
      if (screen === 'notificationForm') setNotificationUsers((await getAdminUsers(1, 100)).items);
      if (screen === 'gallery') setGallery(await getAdminGallery());
      if (screen === 'calls') {
        const [tasks, operators] = await Promise.all([
          getAdminCallTasks(1, ADMIN_PAGE_SIZE),
          getAdminCallOperators(),
        ]);
        setCallTasks(tasks);
        setCallOperators(operators);
      }
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.statusCode === 401) {
        router.replace('/auth/login?redirect=%2Fadmin');
        return;
      }
      setError(cause instanceof Error ? cause.message : 'دریافت اطلاعات پنل انجام نشد');
    } finally {
      setLoading(false);
    }
  }, [resourceId, router, screen]);

  useEffect(() => { setLoading(true); void refresh(); }, [refresh]);

  useEffect(() => () => {
    window.setTimeout(() => {
      if (!window.location.pathname.startsWith('/admin')) guidePromptShownDuringCurrentVisit = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!guidePromptOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (guidePromptDontShow && adminId) {
          try {
            window.localStorage.setItem(`nazr-emam:admin-guide-dismissed:${adminId}`, '1');
          } catch {
            // The prompt still closes when browser storage is unavailable.
          }
        }
        guidePromptDismissed.current = true;
        setGuidePromptOpen(false);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [adminId, guidePromptDontShow, guidePromptOpen]);

  const loadPage = useCallback(async (section: PaginatedAdminSection, page: number, query = '') => {
    setWorking(true);
    setError('');
    try {
      if (section === 'users') setUsers(await getAdminUsers(page, ADMIN_PAGE_SIZE, query));
      if (section === 'requests') setRequests(await getAdminNazrRequests(page, ADMIN_PAGE_SIZE, query));
      if (section === 'payments') setPayments(await getAdminPayments(page, ADMIN_PAGE_SIZE, query));
      if (section === 'eitaa') setEitaaReceipts(await getAdminEitaaReceipts(page, ADMIN_PAGE_SIZE, query));
      if (section === 'tickets') setTickets(await getAdminTickets(page, ADMIN_PAGE_SIZE));
      if (section === 'notifications') setNotifications(await getAdminNotifications(page, ADMIN_PAGE_SIZE));
      if (section === 'calls') setCallTasks(await getAdminCallTasks(page, ADMIN_PAGE_SIZE, '', callAssignee));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دریافت صفحه جدید انجام نشد');
    } finally {
      setWorking(false);
    }
  }, [callAssignee]);

  const filterCallTasks = async (assignee: string) => {
    setCallAssignee(assignee);
    setWorking(true);
    setError('');
    try {
      setCallTasks(await getAdminCallTasks(1, ADMIN_PAGE_SIZE, '', assignee));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دریافت صف اپراتور انجام نشد');
    } finally {
      setWorking(false);
    }
  };

  const dismissGuidePrompt = (openGuide = false) => {
    guidePromptDismissed.current = true;
    if (guidePromptDontShow && adminId) {
      try {
        window.localStorage.setItem(`nazr-emam:admin-guide-dismissed:${adminId}`, '1');
      } catch {
        // The prompt still closes when browser storage is unavailable.
      }
    }
    setGuidePromptOpen(false);
    if (openGuide) router.push('/admin/guide');
  };

  useEffect(() => {
    if (!['users', 'requests', 'payments', 'eitaa'].includes(screen)) return;
    const timeout = window.setTimeout(() => {
      void loadPage(screen as PaginatedAdminSection, 1, search.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [loadPage, screen, search]);

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
                <Link className={active === item.id ? 'is-active' : ''} href={item.href} key={item.id}>
                  <span>{item.short}</span>{item.label}
                  {item.id === 'tickets' && dashboard?.openTickets ? <b>{dashboard.openTickets}</b> : null}
                  {item.id === 'calls' && dashboard?.dueCallTasks ? <b>{dashboard.dueCallTasks}</b> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <button className="admin-exit" onClick={() => void run(async () => { await logout(); router.replace('/auth/login'); }, '', false)} type="button">خروج از حساب</button>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><h1>{title}</h1><p>{adminName}، خوش آمدید</p></div>
          <div className="admin-top-actions"><button aria-label="تازه‌سازی اطلاعات" disabled={working} onClick={() => void refresh()} title="تازه‌سازی" type="button">↻</button><a href="/" title="مشاهده سایت">مشاهده سایت</a></div>
        </header>
        {error ? <p className="admin-alert is-error">{error}</p> : null}
        {success ? <p className="admin-alert is-success">{success}</p> : null}
        {['users', 'requests', 'payments', 'eitaa'].includes(screen) ? <input className="admin-search" onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در این بخش..." value={search} /> : null}

        {screen === 'dashboard' && dashboard ? <Dashboard dashboard={dashboard} requests={dashboard.recentRequests} navigate={(href) => router.push(href)} /> : null}
        {screen === 'guide' ? <AdminGuide /> : null}
        {screen === 'requests' ? <NazrRequestsSection onPageChange={(page) => loadPage('requests', page, search.trim())} requests={requests} run={run} working={working} /> : null}
        {screen === 'nazrTypes' ? <NazrTypesSection items={nazrTypes} run={run} working={working} /> : null}
        {screen === 'nazrTypeForm' ? (
          resourceId && !nazrTypes.some((item) => item.id === resourceId)
            ? <section className="admin-panel admin-form-page"><Empty text="طرح موردنظر پیدا نشد." /></section>
            : <NazrTypeForm item={resourceId ? nazrTypes.find((item) => item.id === resourceId) ?? null : null} run={run} working={working} />
        ) : null}
        {screen === 'users' ? <UsersSection users={users} onPageChange={(page) => loadPage('users', page, search.trim())} working={working} /> : null}
        {screen === 'userDetails' && selectedUser ? <UserDetailsSection details={selectedUser} refresh={async (id) => setSelectedUser(await getAdminUser(id))} run={run} working={working} /> : null}
        {screen === 'payments' ? <PaymentsSection payments={payments} onPageChange={(page) => loadPage('payments', page, search.trim())} working={working} /> : null}
        {screen === 'eitaa' ? <EitaaReceiptsList items={eitaaReceipts} onPageChange={(page) => loadPage('eitaa', page, search.trim())} working={working} /> : null}
        {screen === 'eitaaForm' ? <EitaaReceiptForm nazrTypes={nazrTypes} run={run} working={working} /> : null}
        {screen === 'tickets' ? <TicketsList tickets={tickets} onPageChange={(page) => loadPage('tickets', page)} working={working} /> : null}
        {screen === 'ticketDetails' && selectedTicket ? <TicketDetails ticket={selectedTicket} run={run} working={working} /> : null}
        {screen === 'notifications' ? <NotificationsList items={notifications} onPageChange={(page) => loadPage('notifications', page)} working={working} /> : null}
        {screen === 'notificationForm' ? <NotificationForm users={notificationUsers} run={run} working={working} /> : null}
        {screen === 'gallery' ? <GallerySection items={gallery} mode="list" nazrTypes={nazrTypes} run={run} working={working} /> : null}
        {screen === 'galleryForm' ? <GallerySection items={gallery} mode="form" nazrTypes={nazrTypes} run={run} working={working} /> : null}
        {screen === 'calls' ? <CallsSection assignee={callAssignee} currentAdminId={adminId} items={callTasks} mode="list" onAssigneeChange={filterCallTasks} onPageChange={(page) => loadPage('calls', page)} operators={callOperators} run={run} working={working} /> : null}
        {screen === 'callsForm' ? <CallsSection assignee={callAssignee} currentAdminId={adminId} items={callTasks} mode="form" onAssigneeChange={filterCallTasks} onPageChange={(page) => loadPage('calls', page)} operators={callOperators} run={run} working={working} /> : null}
      </section>
      {guidePromptOpen ? <AdminGuidePrompt dontShow={guidePromptDontShow} onClose={() => dismissGuidePrompt()} onDontShowChange={setGuidePromptDontShow} onOpenGuide={() => dismissGuidePrompt(true)} /> : null}
    </main>
  );
}

function Dashboard({ dashboard, requests, navigate }: { dashboard: AdminDashboardSummary; requests: NazrRequest[]; navigate: (href: string) => void }) {
  const stats = [
    ['مخاطبان', dashboard.users.toLocaleString('fa-IR'), '/admin/users'], ['کل نذرها', dashboard.totalRequests.toLocaleString('fa-IR'), '/admin/nazr-requests'], ['در انتظار اقدام', dashboard.pendingRequests.toLocaleString('fa-IR'), '/admin/nazr-requests'], ['پرداخت معلق', dashboard.pendingPayments.toLocaleString('fa-IR'), '/admin/payments'], ['تیکت باز', dashboard.openTickets.toLocaleString('fa-IR'), '/admin/tickets'], ['تماس سررسیدشده', dashboard.dueCallTasks.toLocaleString('fa-IR'), '/admin/calls'],
  ] as const;
  return <div className="admin-stack">
    <section className="admin-overview"><div><p>مجموع واریزی تأییدشده</p><strong>{money(dashboard.paidAmount)}</strong><small>نمای کلی فعالیت سامانه تا امروز</small></div><div className="admin-overview-actions"><span>گزارش زنده</span><Link href="/admin/guide">آموزش پنل مدیریت</Link></div></section>
    <section className="admin-stat-grid">{stats.map(([label, value, target]) => <button key={label} onClick={() => navigate(target)} type="button"><span>{label}</span><strong>{value}</strong><small>مشاهده جزئیات</small></button>)}</section>
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>آخرین فعالیت‌ها</h2><p>نذرهای تازه ثبت‌شده در سامانه</p></div><Link className="admin-text-action" href="/admin/nazr-requests">مشاهده همه</Link></div><RequestTable items={requests} /></section>
  </div>;
}

function NazrTypesSection({ items, run, working }: { items: NazrType[]; run: Runner; working: boolean }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div><h2>طرح‌ها و انواع نذر</h2><p>{items.length.toLocaleString('fa-IR')} طرح ثبت‌شده</p></div>
        <Link className="admin-primary" href="/admin/nazr-types/new">افزودن طرح</Link>
      </div>
      <div className="admin-card-grid">
        {items.map((item) => (
          <article className="admin-plan-card" key={item.id}>
            <div>
              <span className={`admin-status ${item.isActive ? 'is-success' : 'is-neutral'}`}>{item.isActive ? 'فعال' : 'غیرفعال'}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <footer>
              <strong>{money(item.suggestedAmount)}</strong>
              <div className="admin-plan-card-actions">
                <Link href={`/admin/nazr-types/${item.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  <span>ویرایش</span>
                </Link>
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
        {!items.length ? <Empty text="هنوز طرحی ثبت نشده است." /> : null}
      </div>
    </section>
  );
}

function NazrTypeForm({ item, run, working }: { item: NazrType | null; run: Runner; working: boolean }) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    title: item?.title ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    suggestedAmount: item?.suggestedAmount ? formatAmountInput(String(item.suggestedAmount.amount)) : '',
  });
  const suggestedAmountValue = useMemo(
    () => parseAmountInput(formState.suggestedAmount),
    [formState.suggestedAmount],
  );

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
        item
          ? updateAdminNazrType(item.id, payload)
          : createAdminNazrType({ ...payload, isActive: true }),
      item ? 'اطلاعات طرح به‌روزرسانی شد' : 'نوع نذر ساخته شد',
    );
    if (succeeded) router.push('/admin/nazr-types');
  };

  return (
    <section className="admin-panel admin-form-page">
      <form className="admin-plan-form" onSubmit={submit}>
          <div className="admin-plan-form-head">
            <div>
              <h3>{item ? 'ویرایش اطلاعات طرح' : 'افزودن طرح جدید'}</h3>
              <p>{item ? 'عنوان، آدرس، مبلغ و توضیحات طرح را اصلاح کنید.' : 'اطلاعات اصلی طرح را کامل و سپس آن را ثبت کنید.'}</p>
            </div>
            <Link className="admin-text-action" href="/admin/nazr-types">بازگشت به طرح‌ها</Link>
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
            <Link className="admin-secondary" href="/admin/nazr-types">انصراف</Link>
            <button className="admin-primary" disabled={working} type="submit">{working ? 'در حال ذخیره...' : item ? 'ذخیره تغییرات' : 'ثبت طرح'}</button>
          </div>
        </form>
    </section>
  );
}

function NazrRequestsSection({ requests, onPageChange, run, working }: { requests: Paginated<NazrRequest>; onPageChange: (page: number) => Promise<void>; run: Runner; working: boolean }) {
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>درخواست‌های نذر</h2><p>بررسی و تغییر وضعیت فعالیت‌ها</p></div></div><RequestTable items={requests.items} editable run={run} startIndex={(requests.page - 1) * requests.pageSize} working={working} /><AdminPagination info={requests} onPageChange={onPageChange} working={working} /></section>;
}

function RequestTable({ items, editable = false, run, startIndex = 0, working }: { items: NazrRequest[]; editable?: boolean; run?: Runner; startIndex?: number; working?: boolean }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>مخاطب</th><th>طرح</th><th>مبلغ</th><th>کد رهگیری</th><th>تاریخ</th><th>وضعیت</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><strong>{item.donorFullName}</strong><small>{item.donorMobile}</small></td><td>{item.nazrType.title}</td><td>{money(item.amount)}</td><td dir="ltr">{item.trackingCode}</td><td>{date(item.createdAt)}</td><td>{editable && run ? <select disabled={working} onChange={(event) => void run(() => updateAdminNazrStatus(item.id, event.target.value as NazrRequestStatus), 'وضعیت نذر به‌روزرسانی شد')} value={item.status}>{requestStatuses.map((status) => <option key={status} value={status}>{requestLabels[status]}</option>)}</select> : <span className={`admin-status ${statusClass(item.status)}`}>{requestLabels[item.status]}</span>}</td></tr>)}</tbody></table>{!items.length ? <Empty /> : null}</div>;
}

function UsersSection({ users, onPageChange, working }: { users: Paginated<AdminUserListItem>; onPageChange: (page: number) => Promise<void>; working: boolean }) {
  const startIndex = (users.page - 1) * users.pageSize;
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>مخاطبان</h2><p>پرونده ارتباطی و سوابق مشارکت</p></div><span className="admin-count">{users.total.toLocaleString('fa-IR')} نفر</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>نام و تماس</th><th>مرحله CRM</th><th>مشارکت</th><th>مجموع پرداخت</th><th>پیگیری بعدی</th><th></th></tr></thead><tbody>{users.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><strong>{item.fullName}</strong><small>{item.mobile}{item.eitaNumber ? ` · ایتا: ${item.eitaNumber}` : ''}</small></td><td><span className={`admin-status ${item.crmStage === 'at_risk' ? 'is-warning' : 'is-neutral'}`}>{crmLabels[item.crmStage]}</span></td><td>{item.requestCount.toLocaleString('fa-IR')} نذر</td><td>{money(item.paidAmount)}</td><td>{date(item.nextFollowUpAt)}</td><td><Link className="admin-text-action" href={`/admin/users/${item.id}`}>پرونده</Link></td></tr>)}</tbody></table>{!users.items.length ? <Empty /> : null}</div><AdminPagination info={users} onPageChange={onPageChange} working={working} /></section>;
}

function UserDetailsSection({ details, refresh, run, working }: { details: AdminUserDetails; refresh: (id: string) => Promise<void>; run: Runner; working: boolean }) {
  const [activityType, setActivityType] = useState<CrmActivityType>('call'); const [activity, setActivity] = useState('');
  const saveCrm = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(async () => { await updateAdminCrm(details.user.id, { stage: String(data.get('stage')) as CrmStage, tags: String(data.get('tags')).split('،').map((item) => item.trim()).filter(Boolean), assignedTo: String(data.get('assignedTo')) || null, note: String(data.get('note')) || null, nextFollowUpAt: data.get('nextFollowUpAt') ? jalaliDateToIso(String(data.get('nextFollowUpAt'))) : null }); await refresh(details.user.id); }, 'پرونده CRM ذخیره شد'); };
  return <section className="admin-panel admin-detail-page"><header className="admin-detail-head"><div><h2>{details.user.fullName}</h2><p>{details.user.mobile}</p></div><Link className="admin-text-action" href="/admin/users">بازگشت به مخاطبان</Link></header><div className="admin-drawer-body"><div className="admin-mini-stats"><span><small>تعداد نذر</small><strong>{details.user.requestCount.toLocaleString('fa-IR')}</strong></span><span><small>مجموع پرداخت</small><strong>{money(details.user.paidAmount)}</strong></span></div><form className="admin-form-stack" onSubmit={saveCrm}><h3>وضعیت ارتباط</h3><label>مرحله<select defaultValue={details.crm.stage} name="stage">{Object.entries(crmLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>برچسب‌ها<input defaultValue={details.crm.tags.join('، ')} name="tags" placeholder="همراه قدیمی، تماس ماهانه" /></label><label>مسئول پیگیری<input defaultValue={details.crm.assignedTo ?? ''} name="assignedTo" /></label><label>اقدام بعدی<input defaultValue={details.crm.nextFollowUpAt ? jalaliDateInput(details.crm.nextFollowUpAt) : ''} dir="ltr" inputMode="numeric" maxLength={10} name="nextFollowUpAt" placeholder="1405/02/03" /></label><label>یادداشت<textarea defaultValue={details.crm.note ?? ''} name="note" /></label><button className="admin-primary" disabled={working}>ذخیره پرونده</button></form><div className="admin-form-stack"><h3>ثبت فعالیت</h3><select onChange={(event) => setActivityType(event.target.value as CrmActivityType)} value={activityType}><option value="call">تماس</option><option value="note">یادداشت</option><option value="payment">پرداخت</option><option value="ticket">تیکت</option><option value="status">تغییر وضعیت</option></select><textarea onChange={(event) => setActivity(event.target.value)} placeholder="خلاصه گفتگو یا اقدام انجام‌شده" value={activity} /><button className="admin-secondary" disabled={!activity.trim() || working} onClick={() => void run(async () => { await addAdminCrmActivity(details.user.id, { type: activityType, summary: activity }); setActivity(''); await refresh(details.user.id); }, 'فعالیت ثبت شد')} type="button">ثبت در تاریخچه</button></div><div className="admin-timeline"><h3>تاریخچه CRM</h3>{details.activities.map((item) => <article key={item.id}><span></span><div><strong>{item.summary}</strong><small>{item.createdBy} · {date(item.createdAt)}</small></div></article>)}{!details.activities.length ? <Empty /> : null}</div></div></section>;
}

function PaymentsSection({ payments, onPageChange, working }: { payments: Paginated<Payment>; onPageChange: (page: number) => Promise<void>; working: boolean }) {
  const startIndex = (payments.page - 1) * payments.pageSize;
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>واریزها و پرداخت‌ها</h2><p>گزارش وضعیت همه تراکنش‌های ثبت‌شده</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>شناسه درخواست</th><th>روش</th><th>مبلغ</th><th>مرجع تراکنش</th><th>تاریخ</th><th>وضعیت</th></tr></thead><tbody>{payments.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td dir="ltr">{item.nazrRequestId.slice(0, 8)}</td><td>{item.method === 'online' ? 'آنلاین' : item.method === 'cash' ? 'نقدی' : 'کارت‌به‌کارت'}</td><td>{money(item.amount)}</td><td dir="ltr">{item.transactionReference ?? '—'}</td><td>{date(item.createdAt)}</td><td><span className={`admin-status ${statusClass(item.status)}`}>{paymentLabels[item.status]}</span></td></tr>)}</tbody></table>{!payments.items.length ? <Empty /> : null}</div><AdminPagination info={payments} onPageChange={onPageChange} working={working} /></section>;
}

function EitaaReceiptForm({ nazrTypes, run, working }: { nazrTypes: NazrType[]; run: Runner; working: boolean }) {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState('');
  const [receivedAt, setReceivedAt] = useState(jalaliDateInput());
  const amountValue = useMemo(() => parseAmountInput(amountInput), [amountInput]);

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
      router.push('/admin/eitaa-receipts');
    }
  };

  return (
      <section className="admin-panel admin-form-page">
        <div className="admin-panel-head">
          <div><h2>ثبت رسید ایتا</h2><p>ثبت نذر و پرداخت تأییدشده بر اساس رسید دریافتی</p></div>
          <Link className="admin-text-action" href="/admin/eitaa-receipts">بازگشت به رسیدها</Link>
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
            <Link className="admin-secondary" href="/admin/eitaa-receipts">انصراف</Link>
            <button className="admin-primary" disabled={working || amountValue <= 0} type="submit">{working ? 'در حال ثبت...' : 'ثبت و تأیید نذر'}</button>
          </div>
        </form>
      </section>
  );
}

function EitaaReceiptsList({ items, onPageChange, working }: { items: Paginated<AdminEitaaReceipt>; onPageChange: (page: number) => Promise<void>; working: boolean }) {
  const startIndex = (items.page - 1) * items.pageSize;
  return (
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>مخاطبان تأییدشده از ایتا</h2><p>رسیدهایی که توسط مدیر ثبت و قطعی شده‌اند</p></div><div className="admin-panel-head-actions"><span className="admin-count">{items.total.toLocaleString('fa-IR')} رسید</span><Link className="admin-primary" href="/admin/eitaa-receipts/new">ثبت رسید جدید</Link></div></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th className="admin-row-number">ردیف</th><th>مخاطب</th><th>طرح</th><th>مبلغ</th><th>تاریخ رسید</th><th>کد رهگیری</th><th>وضعیت</th><th>پیام ایتا</th></tr></thead>
            <tbody>{items.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><Link className="admin-table-user-action" href={`/admin/users/${item.userId}`}><strong>{item.userFullName}</strong><small>{item.userMobile}{item.eitaNumber ? ` · ${item.eitaNumber}` : ''}</small></Link></td><td>{item.nazrTypeTitle}</td><td>{money(item.amount)}</td><td><strong>{date(item.receivedAt)}</strong><small>ثبت توسط {item.recordedBy}</small></td><td dir="ltr">{item.trackingCode}</td><td><span className={`admin-status ${statusClass(item.requestStatus)}`}>{requestLabels[item.requestStatus]}</span><small>{paymentLabels[item.paymentStatus]}</small></td><td>{item.eitaaMessageUrl ? <a className="admin-text-action" href={item.eitaaMessageUrl} rel="noreferrer" target="_blank">مشاهده پیام</a> : '—'}</td></tr>)}</tbody>
          </table>
          {!items.items.length ? <Empty text="هنوز رسیدی از ایتا ثبت نشده است." /> : null}
        </div>
        <AdminPagination info={items} onPageChange={onPageChange} working={working} />
      </section>
  );
}

function TicketsList({ tickets, onPageChange, working }: { tickets: Paginated<Ticket>; onPageChange: (page: number) => Promise<void>; working: boolean }) {
  const [filter, setFilter] = useState<'all' | Ticket['status']>('all');
  const filteredTickets = filter === 'all' ? tickets.items : tickets.items.filter((ticket) => ticket.status === filter);

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

      <div className="admin-ticket-list-page">
        <aside className="admin-ticket-inbox" aria-label="فهرست تیکت‌ها">
          {filteredTickets.map((ticket) => {
            const lastMessage = ticket.messages[ticket.messages.length - 1];
            return (
              <Link href={`/admin/tickets/${ticket.id}`} key={ticket.id}>
                <span className={`admin-ticket-state ${statusClass(ticket.status)}`}></span>
                <span className="admin-ticket-preview">
                  <strong>{ticket.subject}</strong>
                  <small>{ticket.guestMobile ?? (ticket.userId ? 'کاربر ثبت‌نام‌شده' : 'مخاطب')}</small>
                  <p>{lastMessage?.body ?? 'بدون پیام'}</p>
                </span>
                <time>{date(ticket.updatedAt)}</time>
              </Link>
            );
          })}
          {!filteredTickets.length ? <Empty text="تیکتی با این وضعیت وجود ندارد." /> : null}
        </aside>
      </div>
      <AdminPagination info={tickets} onPageChange={onPageChange} working={working} />
    </section>
  );
}

function TicketDetails({ ticket, run, working }: { ticket: Ticket; run: Runner; working: boolean }) {
  const [reply, setReply] = useState('');
  return (
    <section className="admin-ticket-center admin-ticket-detail-page">
      <div className="admin-page-back"><Link className="admin-text-action" href="/admin/tickets">بازگشت به فهرست تیکت‌ها</Link></div>
      <article className="admin-ticket-conversation">
        <header><div><h3>{ticket.subject}</h3><p>{ticket.guestMobile ?? (ticket.userId ? 'کاربر ثبت‌نام‌شده' : 'مخاطب')} · ایجاد در {date(ticket.createdAt)}</p></div><span className={`admin-status ${statusClass(ticket.status)}`}>{ticketLabels[ticket.status]}</span></header>
        <div className="admin-ticket-thread">{ticket.messages.map((message) => <div className={`admin-ticket-message ${message.authorType === 'support' ? 'is-own' : ''}`} key={message.id}><div><span className="admin-ticket-author">{message.authorType === 'support' ? 'پشتیبانی' : 'مخاطب'}</span><p>{message.body}</p><time>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.createdAt))}</time></div></div>)}</div>
        {ticket.status !== 'closed' ? <footer className="admin-ticket-composer"><textarea onChange={(event) => setReply(event.target.value)} placeholder="پاسخ خود را برای مخاطب بنویسید..." rows={3} value={reply} /><div><button className="admin-secondary" disabled={working} onClick={() => void run(() => closeTicket(ticket.id), 'تیکت بسته شد')} type="button">بستن تیکت</button><button className="admin-primary" disabled={working || !reply.trim()} onClick={() => void run(async () => { await replyTicket(ticket.id, reply); setReply(''); }, 'پاسخ ارسال شد')} type="button">ارسال پاسخ</button></div></footer> : <p className="admin-ticket-closed">این گفتگو بسته شده است.</p>}
      </article>
    </section>
  );
}

function NotificationsList({ items, onPageChange, working }: { items: Paginated<AdminNotificationItem>; onPageChange: (page: number) => Promise<void>; working: boolean }) {
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>اعلان‌های ارسال‌شده</h2><p>سوابق پیام‌های عمومی و اختصاصی</p></div><Link className="admin-primary" href="/admin/notifications/new">ارسال اعلان</Link></div><div className="admin-notification-list">{items.items.map((item) => <article key={item.id}><div><h3>{item.title}</h3><p>{item.body}</p></div><small>{item.userFullName ?? 'ارسال عمومی'} · {date(item.createdAt)}</small></article>)}</div>{!items.items.length ? <Empty text="هنوز اعلانی ارسال نشده است." /> : null}<AdminPagination info={items} onPageChange={onPageChange} working={working} /></section>;
}

function NotificationForm({ users, run, working }: { users: AdminUserListItem[]; run: Runner; working: boolean }) {
  const router = useRouter();
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); if (await run(() => createAdminNotification({ userId: String(data.get('userId')) || null, title: String(data.get('title')), body: String(data.get('body')), link: String(data.get('link')) || null }), 'اعلان ارسال شد')) router.push('/admin/notifications'); };
  return <section className="admin-panel admin-form-page"><div className="admin-panel-head"><div><h2>ارسال اعلان</h2><p>پیام عمومی یا اختصاصی برای مخاطب</p></div><Link className="admin-text-action" href="/admin/notifications">بازگشت به اعلان‌ها</Link></div><form className="admin-form-stack" onSubmit={submit}><label>مخاطب<select name="userId"><option value="">همه مخاطبان</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.mobile}</option>)}</select></label><label>عنوان<input name="title" required /></label><label>متن<textarea name="body" required /></label><label>لینک مرتبط<input dir="ltr" name="link" placeholder="/profile" /></label><div className="admin-plan-form-actions"><Link className="admin-secondary" href="/admin/notifications">انصراف</Link><button className="admin-primary" disabled={working}>ارسال اعلان</button></div></form></section>;
}

function GallerySection({ items, mode, nazrTypes, run, working }: { items: GalleryAsset[]; mode: 'list' | 'form'; nazrTypes: NazrType[]; run: Runner; working: boolean }) {
  const router = useRouter();
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
      router.push('/admin/gallery');
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

  if (mode === 'list') {
    return <div className="admin-stack"><section className="admin-panel"><div className="admin-panel-head"><div><h2>ویدیوی معرفی صفحه اصلی</h2><p>این کلیپ فقط بالای صفحه اصلی نمایش داده می‌شود و با گزارش اجراها مشترک نیست.</p></div><Link className="admin-primary" href="/admin/gallery/new">افزودن رسانه</Link></div>{mediaCards(introItems, 'هنوز ویدیوی معرفی صفحه اصلی ثبت نشده است.')}</section><section className="admin-panel"><div className="admin-panel-head"><div><h2>گزارش‌های اجرای طرح‌ها</h2><p>تصاویر و ویدیوهای گالری و گزارش‌های قابل دریافت</p></div></div>{mediaCards(galleryItems, 'هنوز گزارشی برای گالری ثبت نشده است.')}</section></div>;
  }

  return (
      <section className="admin-panel admin-form-page">
        <div className="admin-panel-head">
          <div>
            <h2>افزودن رسانه</h2>
            <p>ابتدا مشخص کنید رسانه برای معرفی کلی صفحه اصلی است یا گزارش اجرای طرح‌ها.</p>
          </div>
          <Link className="admin-text-action" href="/admin/gallery">بازگشت به گالری</Link>
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
          <div className="admin-plan-form-actions"><Link className="admin-secondary" href="/admin/gallery">انصراف</Link><button className="admin-primary" disabled={working}>{working ? 'در حال آپلود...' : placement === 'intro' ? 'ثبت ویدیوی معرفی' : 'افزودن به گالری اجراها'}</button></div>
        </form>
      </section>
  );
}

function CallsSection({ assignee, currentAdminId, items, mode, onAssigneeChange, onPageChange, operators, run, working }: { assignee: string; currentAdminId: string; items: Paginated<CallTask>; mode: 'list' | 'form'; onAssigneeChange: (value: string) => Promise<void>; onPageChange: (page: number) => Promise<void>; operators: CallOperator[]; run: Runner; working: boolean }) {
  const router = useRouter();
  const [period, setPeriod] = useState(jalaliMonthInput()); const [dueDate, setDueDate] = useState(jalaliDateInput());
  const startIndex = (items.page - 1) * items.pageSize;
  const updateTask = (id: string, payload: Parameters<typeof updateAdminCallTask>[1], message: string) => void run(async () => { await updateAdminCallTask(id, payload); await onPageChange(items.page); }, message, false);
  if (mode === 'form') return <section className="admin-panel admin-form-page"><div className="admin-panel-head"><div><h2>ساخت صف پیگیری ماهانه</h2><p>دوره و تاریخ سررسید تماس‌ها را مشخص کنید.</p></div><Link className="admin-text-action" href="/admin/calls">بازگشت به کال‌سنتر</Link></div><div className="admin-form-stack"><label>دوره<input dir="ltr" inputMode="numeric" maxLength={7} onChange={(event) => setPeriod(event.target.value)} placeholder="1405/02" value={period} /></label><label>تاریخ سررسید<input dir="ltr" inputMode="numeric" maxLength={10} onChange={(event) => setDueDate(event.target.value)} placeholder="1405/02/03" value={dueDate} /></label><div className="admin-plan-form-actions"><Link className="admin-secondary" href="/admin/calls">انصراف</Link><button className="admin-primary" disabled={working} onClick={() => void (async () => { if (await run(() => generateAdminCallTasks(period.replace('/', '-'), jalaliDateToIso(dueDate)), 'صف تماس ماهانه ساخته شد')) router.push('/admin/calls'); })()} type="button">ساخت صف ماه</button></div></div></section>;
  return <section className="admin-panel"><div className="admin-panel-head"><div><h2>صف پیگیری ماهانه</h2><p>مخاطبان دارای پرداخت دوره‌ای و نتیجه تماس‌ها</p></div><Link className="admin-primary" href="/admin/calls/new">ساخت صف ماه</Link></div><div className="admin-call-toolbar"><label>نمایش صف<select disabled={working} onChange={(event) => void onAssigneeChange(event.target.value)} value={assignee}><option value="">همه اپراتورها</option>{currentAdminId ? <option value={currentAdminId}>صف من</option> : null}<option value="unassigned">بدون مسئول</option>{operators.filter((operator) => operator.id !== currentAdminId).map((operator) => <option key={operator.id} value={operator.id}>{operator.fullName}</option>)}</select></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="admin-row-number">ردیف</th><th>مخاطب</th><th>دوره</th><th>مبلغ مورد انتظار</th><th>سررسید</th><th>مسئول</th><th>نتیجه پیگیری</th></tr></thead><tbody>{items.items.map((item, index) => <tr key={item.id}><td className="admin-row-number">{(startIndex + index + 1).toLocaleString('fa-IR')}</td><td><strong>{item.userFullName}</strong><small><a href={`tel:${item.userMobile}`}>{item.userMobile}</a></small></td><td dir="ltr">{item.period.replace('-', '/')}</td><td>{money(item.expectedAmount)}</td><td>{date(item.dueDate)}</td><td><select aria-label={`مسئول پیگیری ${item.userFullName} در ${item.period.replace('-', '/')}`} disabled={working} onChange={(event) => updateTask(item.id, { assignedToUserId: event.target.value || null }, 'مسئول تماس تغییر کرد')} value={item.assignedToUserId ?? ''}><option value="">بدون مسئول</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.fullName}</option>)}</select></td><td><select disabled={working} onChange={(event) => updateTask(item.id, { status: event.target.value as CallTaskStatus }, 'نتیجه تماس ثبت شد')} value={item.status}>{Object.entries(callLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table>{!items.items.length ? <Empty text="در این صف پیگیری موردی وجود ندارد." /> : null}</div><AdminPagination info={items} onPageChange={onPageChange} working={working} /></section>;
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
