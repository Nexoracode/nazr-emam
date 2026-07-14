import type { Metadata } from 'next';
import { AuthForm } from '../../../components/auth/auth-form';

export const metadata: Metadata = {
  title: 'ورود | نذر امام',
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
