import type {
  ApiError,
  AuthResponse,
  ChangePasswordRequest,
  CreateInvitationCardRequest,
  CreateNazrRequest,
  CreateTicketRequest,
  CreateWalletChargeRequest,
  GalleryAsset,
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
  StartOnlinePaymentResponse,
  Ticket,
  TicketMessage,
  UpdateMotivationalTargetRequest,
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

async function post<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`, {
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
  const response = await fetch(`${apiUrl}${path}`, {
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
  const response = await fetch(`${apiUrl}${path}`, {
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
  const response = await fetch(`${apiUrl}${path}`, {
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
  return post<WalletTransaction, CreateWalletChargeRequest>('/profile/wallet/charges', payload);
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
