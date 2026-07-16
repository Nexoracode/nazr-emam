import type { Metadata } from 'next';
import { NazrRequestForm } from '../../../../components/nazr/nazr-request-form';

export const metadata: Metadata = {
  title: 'ثبت نذر | نذر امام',
};

type NewNazrPageSearchParams = Promise<{
  nazrTypeId?: string | string[];
}>;

function getInitialNazrTypeId(searchParams: Awaited<NewNazrPageSearchParams>) {
  const value = searchParams.nazrTypeId;
  return typeof value === 'string' ? value : '';
}

export default async function NewNazrPage({
  searchParams,
}: {
  searchParams: NewNazrPageSearchParams;
}) {
  return <NazrRequestForm initialNazrTypeId={getInitialNazrTypeId(await searchParams)} />;
}
