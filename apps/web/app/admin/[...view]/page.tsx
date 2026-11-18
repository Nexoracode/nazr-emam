import { AdminPanel } from '../../../components/admin/admin-panel';

export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ view: string[] }>;
}) {
  const { view } = await params;
  return <AdminPanel view={view} />;
}
