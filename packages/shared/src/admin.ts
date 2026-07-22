import type { ID, ISODate, Money, Paginated } from './api';
import type {
  UserPlatform,
  GalleryAsset,
  GalleryAssetPlacement,
  GalleryAssetType,
} from './profile';
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

export interface CallOperator {
  id: ID;
  fullName: string;
  mobile: string;
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
  assignedToUserId: ID | null;
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
  assignedToUserId?: ID | null;
  /** @deprecated Use assignedToUserId. */
  assignedTo?: string | null;
  note?: string | null;
}

export interface UpdateCallTaskRequest {
  status?: CallTaskStatus;
  assignedToUserId?: ID | null;
  /** @deprecated Use assignedToUserId. */
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
  placement: GalleryAssetPlacement;
  fileUrl: string;
  thumbnailUrl?: string | null;
}

export interface GalleryUploadResponse {
  url: string;
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

export interface CreateAdminEitaaReceiptRequest {
  fullName: string;
  mobile: string;
  eitaNumber?: string | null;
  nazrTypeId: ID;
  amount: Money;
  transactionReference?: string | null;
  eitaaMessageUrl?: string | null;
  receivedAt?: ISODate;
  note?: string | null;
}

export interface AdminEitaaReceipt {
  id: ID;
  userId: ID;
  userFullName: string;
  userMobile: string;
  eitaNumber: string | null;
  nazrRequestId: ID;
  trackingCode: string;
  nazrTypeId: ID;
  nazrTypeTitle: string;
  paymentId: ID;
  amount: Money;
  transactionReference: string | null;
  eitaaMessageUrl: string | null;
  receivedAt: ISODate;
  note: string | null;
  requestStatus: NazrRequestStatus;
  paymentStatus: PaymentStatus;
  recordedBy: string;
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
  eitaaReceipts: Paginated<AdminEitaaReceipt>;
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

export interface AdminEitaaReceiptsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}
