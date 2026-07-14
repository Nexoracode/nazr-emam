import type {
  ApiError,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
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

async function request<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

export function login(payload: LoginRequest) {
  return request<AuthResponse, LoginRequest>('/auth/login', payload);
}

export function register(payload: RegisterRequest) {
  return request<AuthResponse, RegisterRequest>('/auth/register', payload);
}
