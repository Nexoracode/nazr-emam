'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { NazrRequest, NazrRequestStatus, Paginated } from '@nazr-emam/shared';
import { getMyNazrRequests } from '../../lib/api';

const STATUS_LABEL: Record<NazrRequestStatus, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ثبت شده',
  awaiting_payment: 'منتظر پرداخت',
  payment_pending_review: 'در حال بررسی پرداخت',
  confirmed: 'تأیید شده',
  in_progress: 'در حال انجام',
  completed: 'انجام شده',
  cancelled: 'لغو شده',
  rejected: 'رد شده',
};

const STATUS_COLOR: Record<NazrRequestStatus, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-info',
  awaiting_payment: 'badge-warning',
  payment_pending_review: 'badge-warning',
  confirmed: 'badge-success',
  in_progress: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
  rejected: 'badge-danger',
};

export function MyNazrsList() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<NazrRequest> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyNazrRequests(page)
      .then(setData)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('401') || msg.includes('UNAUTHORIZED')) {
          router.replace('/auth/login');
        } else {
          setError('خطا در دریافت اطلاعات. دوباره تلاش کنید.');
        }
      })
      .finally(() => setLoading(false));
  }, [page, router]);

  return (
    <main className="page-shell" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ color: 'var(--heading)', fontSize: 20, fontWeight: 700, margin: 0 }}>نذرهای من</h1>
        <Link href="/nazr/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: 13 }}>
          + ثبت نذر جدید
        </Link>
      </div>

      {loading && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>در حال بارگذاری...</p>
      )}

      {error && <p className="field-error">{error}</p>}

      {!loading && data && data.total === 0 && (
        <div className="surface-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>هنوز نذری ثبت نکرده‌اید.</p>
          <Link href="/nazr/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            ثبت اولین نذر
          </Link>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.items.map((item) => (
              <NazrCard key={item.id} item={item} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <button
                className="btn-ghost"
                style={{ padding: '8px 16px' }}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </button>
              <span style={{ color: 'var(--muted)', alignSelf: 'center', fontSize: 13 }}>
                صفحه {page} از {data.totalPages}
              </span>
              <button
                className="btn-ghost"
                style={{ padding: '8px 16px' }}
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function NazrCard({ item }: { item: NazrRequest }) {
  const amount = `${item.amount.amount.toLocaleString('fa-IR')} ${item.amount.currency === 'IRT' ? 'تومان' : 'ریال'}`;

  return (
    <div className="surface-card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>
            {item.nazrType.title}
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            کد رهگیری:{' '}
            <span dir="ltr" style={{ fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: 1 }}>
              {item.trackingCode}
            </span>
          </p>
        </div>
        <span className={STATUS_COLOR[item.status]} style={{ flexShrink: 0 }}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Info label="مبلغ" value={amount} />
        <Info label="تاریخ ثبت" value={formatDate(item.createdAt)} />
        {item.note && <Info label="یادداشت" value={item.note} />}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{label}: </span>
      <span style={{ color: 'var(--foreground)', fontSize: 13 }}>{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}
