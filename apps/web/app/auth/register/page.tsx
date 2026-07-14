import type { Metadata } from 'next';
import { AuthForm } from '../../../components/auth/auth-form';

export const metadata: Metadata = {
  title: 'ثبت نام | نذر امام',
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
