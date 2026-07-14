import type {
  ApiError,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
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
