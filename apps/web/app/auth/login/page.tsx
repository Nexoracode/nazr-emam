import type { Metadata } from 'next';
import { AuthForm } from '../../../components/auth/auth-form';

export const metadata: Metadata = {
  title: 'ورود | نذر امام',
};

type AuthPageSearchParams = Promise<{
  redirect?: string | string[];
}>;

function getRedirect(searchParams: Awaited<AuthPageSearchParams>) {
  const redirect = searchParams.redirect;
  return Array.isArray(redirect) ? redirect[0] : redirect;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: AuthPageSearchParams;
}) {
  return <AuthForm mode="login" initialRedirect={getRedirect(await searchParams)} />;
}
