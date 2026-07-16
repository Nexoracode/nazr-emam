import type { ID, ISODate, Money, Paginated } from './api';
import type { UserPlatform, GalleryAsset, GalleryAssetType } from './profile';
import type { NazrRequest, NazrRequestStatus } from './nazr';
import type { Payment, PaymentStatus } from './payments';
import type { Ticket } from './support';

export type CrmStage = 'new' | 'engaged' | 'recurring' | 'at_risk' | 'inactive';
export type CrmActivityType = 'call' | 'note' | 'payment' | 'ticket' | 'status';
export type CallTaskStatus = 'pending' | 'contacted' | 'promised' | 'paid' | 'unreachable' | 'cancelled';

export interface AdminDashboardSummary {
  users: number;
  totalRequests: number;
  pendingRequests: number;
  pendingPayments: number;
  openTickets: number;
  dueCallTasks: number;
  paidAmount: Money;
  recentRequests: NazrRequest[];
}

export interface AdminUserListItem {
  id: ID;
  fullName: string;
  mobile: string;
  eitaNumber: string | null;
  activePlatforms: UserPlatform[];
  role: 'donor' | 'admin';
  requestCount: number;
  paidAmount: Money;
  lastActivityAt: ISODate;
  crmStage: CrmStage;
  tags: string[];
  nextFollowUpAt: ISODate | null;
  createdAt: ISODate;
}

export interface CrmProfile {
  userId: ID;
  stage: CrmStage;
  tags: string[];
  assignedTo: string | null;
  note: string | null;
  nextFollowUpAt: ISODate | null;
  lastContactAt: ISODate | null;
  updatedAt: ISODate;
}

export interface UpdateCrmProfileRequest {
  stage?: CrmStage;
  tags?: string[];
  assignedTo?: string | null;
  note?: string | null;
  nextFollowUpAt?: ISODate | null;
}

export interface CrmActivity {
  id: ID;
  userId: ID;
  type: CrmActivityType;
  summary: string;
  createdBy: string;
  createdAt: ISODate;
}

export interface CreateCrmActivityRequest {
  type: CrmActivityType;
  summary: string;
}

export interface AdminUserDetails {
  user: AdminUserListItem;
  crm: CrmProfile;
  requests: NazrRequest[];
  payments: Payment[];
  tickets: Ticket[];
  activities: CrmActivity[];
}

export interface AdminUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: CrmStage;
}

export interface CallTask {
  id: ID;
  userId: ID;
  userFullName: string;
  userMobile: string;
  period: string;
  dueDate: ISODate;
  expectedAmount: Money | null;
  status: CallTaskStatus;
  assignedTo: string | null;
  note: string | null;
  outcome: string | null;
  contactedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateCallTaskRequest {
  userId: ID;
  period: string;
  dueDate: ISODate;
  expectedAmount?: Money | null;
  assignedTo?: string | null;
  note?: string | null;
}

export interface UpdateCallTaskRequest {
  status?: CallTaskStatus;
  assignedTo?: string | null;
  note?: string | null;
  outcome?: string | null;
  dueDate?: ISODate;
}

export interface GenerateMonthlyCallTasksRequest {
  period: string;
  dueDate: ISODate;
}

export interface CreateGalleryAssetRequest {
  nazrTypeId?: ID | null;
  title: string;
  type: GalleryAssetType;
  fileUrl: string;
  thumbnailUrl?: string | null;
}

export type UpdateGalleryAssetRequest = Partial<CreateGalleryAssetRequest>;

export interface AdminNotificationItem {
  id: ID;
  userId: ID | null;
  userFullName: string | null;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: ISODate;
}

export interface AdminDataCollections {
  users: Paginated<AdminUserListItem>;
  requests: Paginated<NazrRequest>;
  payments: Paginated<Payment>;
  tickets: Paginated<Ticket>;
  callTasks: Paginated<CallTask>;
  gallery: GalleryAsset[];
  notifications: Paginated<AdminNotificationItem>;
}

export interface AdminNazrRequestQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: NazrRequestStatus;
}

export interface AdminPaymentQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PaymentStatus;
}
