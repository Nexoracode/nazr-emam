import type {
  AdminDashboardSummary,
  AdminEitaaReceipt,
  AdminNotificationItem,
  AdminUserDetails,
  AdminUserListItem,
  ApiError,
  AuthResponse,
  CallOperator,
  CallTask,
  CallTaskStatus,
  ChangePasswordRequest,
  CreateCallTaskRequest,
  CreateAdminEitaaReceiptRequest,
  CreateCrmActivityRequest,
  CreateGalleryAssetRequest,
  CreateInvitationCardRequest,
  CreateNazrRequest,
  CreateNazrTypeRequest,
  CreateNotificationRequest,
  CreateTicketRequest,
  CreateWalletChargeRequest,
  GalleryAsset,
  GalleryAssetType,
  GalleryUploadResponse,
  InvitationCard,
  LoginRequest,
  NazrRequest,
  NazrType,
  NotificationItem,
  OtpRequestResponse,
  Paginated,
  Payment,
  RegisterRequest,
  RequestOtpRequest,
  ResetPasswordRequest,
  StartOnlinePaymentResponse,
  StartWalletChargeResponse,
  Ticket,
  TicketMessage,
  UpdateMotivationalTargetRequest,
  UpdateCallTaskRequest,
  UpdateCrmProfileRequest,
  UpdateGalleryAssetRequest,
  UpdateNazrTypeRequest,
  CrmActivity,
  CrmProfile,
  NazrRequestStatus,
  UpdateProfileRequest,
  UpdateUserProfileDetailsRequest,
  UpdateWalletSettingsRequest,
  User,
  UserClubStatus,
  UserContributionSummary,
  UserProfileDetails,
  UserProfileSummary,
  VerifyOtpRequest,
  Wallet,
  WalletTransaction,
} from '@nazr-emam/shared';

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.fields = error.fields;
  }
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function isApiError(data: unknown): data is ApiError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'statusCode' in data &&
    'code' in data &&
    'message' in data
  );
}

async function fetchApi(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${apiUrl}${path}`, init);
  } catch {
    throw new ApiRequestError({
      statusCode: 0,
      code: 'NETWORK_ERROR',
      message: 'ارتباط با سرور برقرار نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید.',
    });
  }
}

async function post<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetchApi(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | TResponse
    | ApiError
    | null;

  if (!response.ok) {
    throw new ApiRequestError(
      isApiError(data)
        ? data
        : {
            statusCode: response.status,
            code: 'REQUEST_FAILED',
            message: 'ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.',
          },
    );
  }

  return data as TResponse;
}

async function get<TResponse>(path: string): Promise<TResponse> {
  const response = await fetchApi(path, {
    method: 'GET',
    credentials: 'include',
  });

  const data = (await response.json().catch(() => null)) as
    | TResponse
    | ApiError
    | null;

  if (!response.ok) {
    throw new ApiRequestError(
      isApiError(data)
        ? data
        : {
            statusCode: response.status,
            code: 'REQUEST_FAILED',
            message: 'ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.',
          },
    );
  }

  return data as TResponse;
}

async function patch<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetchApi(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | TResponse
    | ApiError
    | null;

  if (!response.ok && response.status !== 204) {
    throw new ApiRequestError(
      isApiError(data)
        ? data
        : {
            statusCode: response.status,
            code: 'REQUEST_FAILED',
            message: 'ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.',
          },
    );
  }

  return data as TResponse;
}

async function del(path: string): Promise<void> {
  const response = await fetchApi(path, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => null);
    throw new ApiRequestError(
      isApiError(data)
        ? data
        : {
            statusCode: response.status,
            code: 'REQUEST_FAILED',
            message: 'ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.',
          },
    );
  }
}

export function login(payload: LoginRequest) {
  return post<AuthResponse, LoginRequest>('/auth/login', payload);
}

export function register(payload: RegisterRequest) {
  return post<AuthResponse, RegisterRequest>('/auth/register', payload);
}

export function logout() {
  return del('/auth/logout');
}

export function getMe() {
  return get<User>('/auth/me');
}

export function requestOtp(payload: RequestOtpRequest) {
  return post<OtpRequestResponse, RequestOtpRequest>('/auth/otp/request', payload);
}

export function verifyOtp(payload: VerifyOtpRequest) {
  return post<AuthResponse, VerifyOtpRequest>('/auth/otp/verify', payload);
}

export function resetPassword(payload: ResetPasswordRequest) {
  return post<void, ResetPasswordRequest>('/auth/password/reset', payload);
}

export function updateProfile(payload: UpdateProfileRequest) {
  return patch<User, UpdateProfileRequest>('/auth/me', payload);
}

export function changePassword(payload: ChangePasswordRequest) {
  return patch<void, ChangePasswordRequest>('/auth/me/password', payload);
}

export function getMyNazrRequests(page = 1, pageSize = 12) {
  return get<Paginated<NazrRequest>>(`/nazr-requests/mine?page=${page}&pageSize=${pageSize}`);
}

export function getNazrTypes() {
  return get<NazrType[]>('/nazr-types');
}

export function createNazrRequest(payload: CreateNazrRequest) {
  return post<NazrRequest, CreateNazrRequest>('/nazr-requests', payload);
}

export function startOnlineNazrPayment(requestId: string) {
  return post<StartOnlinePaymentResponse, Record<string, never>>(
    `/nazr-requests/${requestId}/payments/online/start`,
    {},
  );
}

export function getProfileDetails() {
  return get<UserProfileDetails>('/profile/details');
}

export function updateProfileDetails(payload: UpdateUserProfileDetailsRequest) {
  return patch<UserProfileDetails, UpdateUserProfileDetailsRequest>('/profile/details', payload);
}

export function getProfileSummary() {
  return get<UserProfileSummary>('/profile/summary');
}

export function getProfileContributions() {
  return get<UserContributionSummary>('/profile/contributions');
}

export function getProfilePayments(page = 1, pageSize = 12, search = '') {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search.trim()) query.set('search', search.trim());
  return get<Paginated<Payment>>(`/profile/payments?${query.toString()}`);
}

export function updateProfileGoal(payload: UpdateMotivationalTargetRequest) {
  return patch<{ motivationalTarget: string | null }, UpdateMotivationalTargetRequest>(
    '/profile/goal',
    payload,
  );
}

export function getProfileWallet() {
  return get<Wallet>('/profile/wallet');
}

export function updateProfileWallet(payload: UpdateWalletSettingsRequest) {
  return patch<Wallet, UpdateWalletSettingsRequest>('/profile/wallet', payload);
}

export function createWalletCharge(payload: CreateWalletChargeRequest) {
  return post<StartWalletChargeResponse, CreateWalletChargeRequest>(
    '/profile/wallet/charges',
    payload,
  );
}

export function getWalletTransactions() {
  return get<WalletTransaction[]>('/profile/wallet/transactions');
}

export function getProfileClub() {
  return get<UserClubStatus>('/profile/club');
}

export function getProfileGallery() {
  return get<GalleryAsset[]>('/profile/gallery');
}

export function getInvitationCards() {
  return get<InvitationCard[]>('/profile/invitations');
}

export function createInvitationCard(payload: CreateInvitationCardRequest) {
  return post<InvitationCard, CreateInvitationCardRequest>('/profile/invitations', payload);
}

export function getMyTickets(page = 1, pageSize = 12) {
  return get<Paginated<Ticket>>(`/tickets/mine?page=${page}&pageSize=${pageSize}`);
}

export function createTicket(payload: CreateTicketRequest) {
  return post<Ticket, CreateTicketRequest>('/tickets', payload);
}

export function replyTicket(ticketId: string, body: string) {
  return post<TicketMessage, { body: string }>(`/tickets/${ticketId}/reply`, { body });
}

export function closeTicket(ticketId: string) {
  return post<void, Record<string, never>>(`/tickets/${ticketId}/close`, {});
}

export function getNotifications(page = 1, pageSize = 12) {
  return get<Paginated<NotificationItem>>(`/notifications?page=${page}&pageSize=${pageSize}`);
}

export function markNotificationAsRead(notificationId: string) {
  return post<void, Record<string, never>>(`/notifications/${notificationId}/read`, {});
}

function adminQuery(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export function getAdminDashboard() {
  return get<AdminDashboardSummary>('/admin/dashboard');
}

export function getAdminUsers(page = 1, pageSize = 30, search = '', stage = '') {
  return get<Paginated<AdminUserListItem>>(`/admin/users?${adminQuery({ page, pageSize, search, stage })}`);
}

export function getAdminUser(id: string) {
  return get<AdminUserDetails>(`/admin/users/${id}`);
}

export function updateAdminCrm(id: string, payload: UpdateCrmProfileRequest) {
  return patch<CrmProfile, UpdateCrmProfileRequest>(`/admin/users/${id}/crm`, payload);
}

export function addAdminCrmActivity(id: string, payload: CreateCrmActivityRequest) {
  return post<CrmActivity, CreateCrmActivityRequest>(`/admin/users/${id}/activities`, payload);
}

export function getAdminNazrRequests(page = 1, pageSize = 30, search = '', status = '') {
  return get<Paginated<NazrRequest>>(`/admin/nazr-requests?${adminQuery({ page, pageSize, search, status })}`);
}

export function getAdminNazrTypes() {
  return get<NazrType[]>('/admin/nazr-types');
}

export function createAdminNazrType(payload: CreateNazrTypeRequest) {
  return post<NazrType, CreateNazrTypeRequest>('/admin/nazr-types', payload);
}

export function updateAdminNazrType(id: string, payload: UpdateNazrTypeRequest) {
  return patch<NazrType, UpdateNazrTypeRequest>(`/admin/nazr-types/${id}`, payload);
}

export function deleteAdminNazrType(id: string) {
  return del(`/admin/nazr-types/${id}`);
}

export function updateAdminNazrStatus(id: string, status: NazrRequestStatus, adminNote?: string) {
  return patch<NazrRequest, { status: NazrRequestStatus; adminNote?: string }>(`/admin/nazr-requests/${id}/status`, { status, adminNote });
}

export function getAdminPayments(page = 1, pageSize = 30, search = '', status = '') {
  return get<Paginated<Payment>>(`/admin/payments?${adminQuery({ page, pageSize, search, status })}`);
}

export function getAdminEitaaReceipts(page = 1, pageSize = 20, search = '') {
  return get<Paginated<AdminEitaaReceipt>>(`/admin/eitaa-receipts?${adminQuery({ page, pageSize, search })}`);
}

export function createAdminEitaaReceipt(payload: CreateAdminEitaaReceiptRequest) {
  return post<AdminEitaaReceipt, CreateAdminEitaaReceiptRequest>('/admin/eitaa-receipts', payload);
}

export function getAdminTickets(page = 1, pageSize = 30) {
  return get<Paginated<Ticket>>(`/admin/tickets?${adminQuery({ page, pageSize })}`);
}

export function getAdminTicket(id: string) {
  return get<Ticket>(`/admin/tickets/${id}`);
}

export function getAdminNotifications(page = 1, pageSize = 30) {
  return get<Paginated<AdminNotificationItem>>(`/admin/notifications?${adminQuery({ page, pageSize })}`);
}

export function createAdminNotification(payload: CreateNotificationRequest) {
  return post<AdminNotificationItem, CreateNotificationRequest>('/admin/notifications', payload);
}

export function getAdminGallery() {
  return get<GalleryAsset[]>('/admin/gallery');
}

export async function uploadAdminGalleryFile(file: File, kind: GalleryAssetType) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetchApi(`/admin/gallery/upload?kind=${kind}`, {
    method: 'POST',
    credentials: 'include',
    body,
  });
  const data = (await response.json().catch(() => null)) as
    | GalleryUploadResponse
    | ApiError
    | null;
  if (!response.ok) {
    throw new ApiRequestError(
      isApiError(data)
        ? data
        : {
            statusCode: response.status,
            code: 'UPLOAD_FAILED',
            message: 'آپلود فایل انجام نشد. دوباره تلاش کنید.',
          },
    );
  }
  return data as GalleryUploadResponse;
}

export function createAdminGallery(payload: CreateGalleryAssetRequest) {
  return post<GalleryAsset, CreateGalleryAssetRequest>('/admin/gallery', payload);
}

export function updateAdminGallery(id: string, payload: UpdateGalleryAssetRequest) {
  return patch<GalleryAsset, UpdateGalleryAssetRequest>(`/admin/gallery/${id}`, payload);
}

export function deleteAdminGallery(id: string) {
  return del(`/admin/gallery/${id}`);
}

export function getAdminCallTasks(page = 1, pageSize = 50, status: CallTaskStatus | '' = '', assignee = '') {
  return get<Paginated<CallTask>>(`/admin/call-tasks?${adminQuery({ page, pageSize, status, assignee })}`);
}

export function getAdminCallOperators() {
  return get<CallOperator[]>('/admin/call-operators');
}

export function createAdminCallTask(payload: CreateCallTaskRequest) {
  return post<CallTask, CreateCallTaskRequest>('/admin/call-tasks', payload);
}

export function generateAdminCallTasks(period: string, dueDate: string) {
  return post<{ created: number }, { period: string; dueDate: string }>('/admin/call-tasks/generate', { period, dueDate });
}

export function updateAdminCallTask(id: string, payload: UpdateCallTaskRequest) {
  return patch<CallTask, UpdateCallTaskRequest>(`/admin/call-tasks/${id}`, payload);
}
