import type { Metadata } from 'next';
import { NazrRequestForm } from '../../../../components/nazr/nazr-request-form';

export const metadata: Metadata = {
  title: 'ثبت نذر | نذر امام',
};

export default function NewNazrPage() {
  return <NazrRequestForm />;
}
