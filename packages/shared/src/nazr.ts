import type { ID, ISODate, Money } from './api';

export interface NazrType {
  id: ID;
  slug: string;
  title: string;
  description: string;
  suggestedAmount: Money | null;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateNazrTypeRequest {
  slug: string;
  title: string;
  description: string;
  suggestedAmount?: Money | null;
  isActive?: boolean;
}

export type UpdateNazrTypeRequest = Partial<CreateNazrTypeRequest>;

export type NazrRequestStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_payment'
  | 'payment_pending_review'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface CreateNazrRequest {
  nazrTypeId: ID;
  donorNationalCode?: string | null;
  amount: Money;
  note?: string | null;
  isAnonymous?: boolean;
}

export interface NazrRequest {
  id: ID;
  trackingCode: string;
  userId: ID | null;
  nazrType: NazrType;
  donorFullName: string;
  donorMobile: string;
  donorNationalCode: string | null;
  amount: Money;
  note: string | null;
  isAnonymous: boolean;
  status: NazrRequestStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface NazrRequestPublicStatus {
  trackingCode: string;
  nazrTypeTitle: string;
  amount: Money;
  status: NazrRequestStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface UpdateNazrRequestStatus {
  status: NazrRequestStatus;
  adminNote?: string | null;
}

export interface AdminDashboard {
  totalRequests: number;
  submittedRequests: number;
  confirmedRequests: number;
  completedRequests: number;
  pendingPayments: number;
  totalPaidAmount: Money;
  recentRequests: NazrRequest[];
}

export interface NazrRequestsReport {
  totalCount: number;
  totalAmount: Money;
  byStatus: Record<NazrRequestStatus, number>;
  byNazrType: {
    nazrTypeId: ID;
    title: string;
    count: number;
    totalAmount: Money;
  }[];
}
