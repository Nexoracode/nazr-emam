import type { ID, ISODate, Money } from './api';

export type PaymentMethod = 'online' | 'card_to_card' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'rejected' | 'refunded';

export interface CreatePaymentRequest {
  method: PaymentMethod;
  amount: Money;
  trackingCode?: string;
  transactionReference?: string | null;
}

export interface Payment {
  id: ID;
  nazrRequestId: ID;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  transactionReference: string | null;
  receiptUrl: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PaymentReceipt {
  id: ID;
  paymentId: ID;
  fileUrl: string;
  uploadedAt: ISODate;
}
