import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyNazrsList } from '../../../components/nazr/my-nazrs-list';

export const metadata: Metadata = { title: 'نذرهای من | نذر امام' };

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <MyNazrsList />
    </Suspense>
  );
}