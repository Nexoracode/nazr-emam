import type { Metadata } from 'next';
import { AuthForm } from '../../../components/auth/auth-form';

export const metadata: Metadata = {
  title: 'ثبت نام | نذر امام',
};

type AuthPageSearchParams = Promise<{
  redirect?: string | string[];
}>;

function getRedirect(searchParams: Awaited<AuthPageSearchParams>) {
  const redirect = searchParams.redirect;
  return Array.isArray(redirect) ? redirect[0] : redirect;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: AuthPageSearchParams;
}) {
  return <AuthForm mode="register" initialRedirect={getRedirect(await searchParams)} />;
}
