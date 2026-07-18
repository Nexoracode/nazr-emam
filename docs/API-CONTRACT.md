# قرارداد API — نذر امام

این سند قبل از کدنویسی endpointها تکمیل و تأیید می‌شود. بعد از تأیید، منبع حقیقت بین NestJS و Next.js است: بک‌اند طبق آن می‌سازد و فرانت طبق آن مصرف می‌کند.

> هر تغییر در API اول اینجا ثبت می‌شود، بعد تایپ همان تغییر در `packages/shared` به‌روز می‌شود، بعد کد تغییر می‌کند.

---

## قواعد عمومی

- **Base URL local:** `http://localhost:3001`
- همه‌ی بدنه‌ها JSON هستند، مگر آپلود فایل/رسید که `multipart/form-data` می‌شود.
- تاریخ‌ها با ISO string برمی‌گردند.
- شناسه‌ها از نوع string هستند.
- endpointهای مدیریتی فقط برای `role: admin` مجازند.
- endpointهای کاربر با لاگین، در نسخه مرورگر با cookie امن کار می‌کنند. برای کلاینت‌های غیرمرورگری، header زیر هم پشتیبانی می‌شود:
  ```text
  Authorization: Bearer <accessToken>
  ```
- خطاها همیشه شکل یکسان دارند:
  ```json
  { "statusCode": 400, "code": "VALIDATION_ERROR", "message": "ورودی نامعتبر است", "fields": { "mobile": "شماره موبایل معتبر نیست" } }
  ```
- لیست‌های صفحه‌بندی‌شده همیشه این شکل را دارند:
  ```json
  { "items": [], "page": 1, "pageSize": 12, "total": 0, "totalPages": 0 }
  ```

---

## تایپ‌های پایه

```ts
type ID = string;
type ISODate = string;

interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Money {
  amount: number;
  currency: "IRR" | "IRT";
}
```

---

## نقشه منابع

| دامنه | منبع | توضیح |
|---|---|---|
| health و اطلاعات پروژه | NestJS | وضعیت سرویس و metadata |
| محتوای صفحه‌ها، بنرها، FAQ و مدیا | CMS | محتوای قابل ویرایش توسط مدیر محتوا |
| احراز هویت | NestJS | کاربر، مدیر، نشست‌ها |
| نوع نذر و کمپین | NestJS | داده‌های قابل نمایش در سایت و فرم‌ها |
| درخواست نذر | NestJS | داده تراکنشی اصلی |
| پرداخت و رسید | NestJS | ثبت پرداخت، رسید، تأیید مدیر |
| داشبورد و گزارش | NestJS | آمار و مدیریت |
| پیام/تیکت | NestJS | ارتباط کاربر با پشتیبانی |
| اعلان‌ها | NestJS | اطلاع‌رسانی به کاربر |

---

# بخش ۱ — وضعیت سرویس

### `GET /health`

- **پاسخ:** `200 HealthResponse`

```ts
interface HealthResponse {
  status: "ok";
  service: "nazr-emam-api";
  timestamp: ISODate;
}
```

### `GET /project`

- **پاسخ:** `200 ProjectInfo`

```ts
interface ProjectInfo {
  name: "Nazr Emam";
  description: string;
  workflow: string[];
}
```

---

# بخش ۲ — احراز هویت

> فاز اول می‌تواند بدون حساب کاربری کامل شروع شود، اما قرارداد auth از ابتدا مشخص می‌ماند تا بعداً فرانت و بک جدا نشوند.

## قانون اعتبارسنجی شماره همراه

- همه endpointهای auth که `mobile` می‌گیرند باید شماره را trim کنند و فاصله/خط تیره را قبل از اعتبارسنجی حذف کنند.
- شماره معتبر باید دقیقاً ۱۱ رقم، با `09` شروع شود، و پیش‌شماره آن جزو پیش‌شماره‌های معتبر موبایل ایران باشد.
- فرانت و API باید از یک قانون مشترک استفاده کنند؛ شماره‌هایی مثل `09612345678`، `09123`، مقدار خالی، یا مقدار غیرعددی باید با خطای فیلد `mobile` رد شوند.

### `POST /auth/register`

- **بدنه:** `RegisterRequest`
- **پاسخ:** `201 AuthResponse` + `Set-Cookie: accessToken, refreshToken`
- **خطاها:** `409 MOBILE_TAKEN`، `400 VALIDATION_ERROR`

### `POST /auth/login`

- **بدنه:** `LoginRequest`
- **پاسخ:** `200 AuthResponse` + `Set-Cookie: accessToken, refreshToken`
- **خطاها:** `401 INVALID_CREDENTIALS`، `400 VALIDATION_ERROR`

### `POST /auth/otp/request`

- **بدنه:** `RequestOtpRequest`
- **پاسخ:** `200 OtpRequestResponse`
- **خطا:** `400 VALIDATION_ERROR`

### `POST /auth/otp/verify`

- **بدنه:** `VerifyOtpRequest`
- **پاسخ:** `200 AuthResponse` + `Set-Cookie: accessToken, refreshToken`
- **خطاها:** `401 INVALID_OTP`، `400 VALIDATION_ERROR`

### `POST /auth/password/reset`

- **بدنه:** `ResetPasswordRequest`
- **پاسخ:** `204 No Content`
- **رفتار:** کد تایید را مصرف می‌کند، رمز عبور جدید را ذخیره می‌کند و کاربر را لاگین نمی‌کند.
- **خطاها:** `401 INVALID_OTP`، `400 VALIDATION_ERROR`

### `POST /auth/refresh`

- **پاسخ:** `200 AuthResponse` + `Set-Cookie: accessToken, refreshToken`
- **خطا:** `401 INVALID_REFRESH_TOKEN`

### `DELETE /auth/logout`

- **پاسخ:** `204 No Content`

### `GET /auth/me`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 User`

### `PATCH /auth/me`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `UpdateProfileRequest`
- **پاسخ:** `200 User`
- **خطا:** `400 VALIDATION_ERROR`

### `PATCH /auth/me/password`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `ChangePasswordRequest`
- **پاسخ:** `204 No Content`
- **خطاها:** `401 INVALID_CREDENTIALS`، `400 VALIDATION_ERROR`

```ts
type UserRole = "donor" | "admin";

interface RegisterRequest {
  fullName: string;
  mobile: string;
  password: string;
}

interface LoginRequest {
  mobile: string;
  password: string;
}

interface RequestOtpRequest {
  mobile: string;
}

interface VerifyOtpRequest {
  mobile: string;
  code: string;
}

interface ResetPasswordRequest {
  mobile: string;
  code: string;
  newPassword: string;
}

interface OtpRequestResponse {
  expiresAt: ISODate;
}

interface User {
  id: ID;
  fullName: string;
  mobile: string;
  role: UserRole;
  createdAt: ISODate;
}

interface AuthResponse {
  user: User;
}

interface UpdateProfileRequest {
  fullName: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

---

# بخش ۳ — نوع نذر و کمپین‌ها

### `GET /nazr-types`

لیست نوع‌های نذر برای نمایش در صفحه اصلی و فرم ثبت.

- **Query:** `isActive?`
- **پاسخ:** `200 NazrType[]`

### `GET /nazr-types/:slug`

- **پاسخ:** `200 NazrType`
- **خطا:** `404 NAZR_TYPE_NOT_FOUND`

### `POST /nazr-types`

- **Auth:** admin
- **بدنه:** `CreateNazrTypeRequest`
- **پاسخ:** `201 NazrType`

### `PATCH /nazr-types/:id`

- **Auth:** admin
- **بدنه:** `UpdateNazrTypeRequest`
- **پاسخ:** `200 NazrType`

### `DELETE /nazr-types/:id`

- **Auth:** admin
- **پاسخ:** `204 No Content`

```ts
interface NazrType {
  id: ID;
  slug: string;
  title: string;
  description: string;
  suggestedAmount: Money | null;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface CreateNazrTypeRequest {
  slug: string;
  title: string;
  description: string;
  suggestedAmount?: Money | null;
  isActive?: boolean;
}

type UpdateNazrTypeRequest = Partial<CreateNazrTypeRequest>;
```

### `GET /gallery`

رسانه‌های قابل نمایش در صفحه اصلی و بخش گزارش‌های عمومی.

- **Auth:** عمومی
- **Query:** `nazrTypeId?`
- **پاسخ:** `200 GalleryAsset[]`
- ترتیب پاسخ از جدیدترین رسانه به قدیمی‌ترین است.
- برای رسانه با `type: "video"` مقدار `thumbnailUrl` هنگام ثبت در مدیریت الزامی است.

---

# بخش ۴ — درخواست نذر

### وضعیت‌ها

```ts
type NazrRequestStatus =
  | "draft"
  | "submitted"
  | "awaiting_payment"
  | "payment_pending_review"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";
```

### `POST /nazr-requests`

ثبت درخواست نذر توسط کاربر لاگین‌شده. نام و شماره همراه اهداکننده از حساب کاربری گرفته می‌شود.

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `CreateNazrRequest`
- **پاسخ:** `201 NazrRequest`
- **خطاها:** `401 UNAUTHORIZED`، `404 NAZR_TYPE_NOT_FOUND`، `400 VALIDATION_ERROR`

### `GET /nazr-requests/mine`

- **Auth:** کاربر لاگین‌شده
- **Query:** `page, pageSize, status?`
- **پاسخ:** `200 Paginated<NazrRequest>`

### `GET /nazr-requests/track/:trackingCode`

پیگیری درخواست با کد رهگیری.

- **Auth:** عمومی
- **پاسخ:** `200 NazrRequestPublicStatus`
- **خطا:** `404 NAZR_REQUEST_NOT_FOUND`

### `GET /nazr-requests`

- **Auth:** admin
- **Query:** `page, pageSize, status?, nazrTypeId?, search?, from?, to?`
- **پاسخ:** `200 Paginated<NazrRequest>`

### `GET /nazr-requests/:id`

- **Auth:** صاحب درخواست یا admin
- **پاسخ:** `200 NazrRequest`

### `PATCH /nazr-requests/:id/status`

- **Auth:** admin
- **بدنه:** `UpdateNazrRequestStatus`
- **پاسخ:** `200 NazrRequest`

```ts
interface CreateNazrRequest {
  nazrTypeId: ID;
  donorNationalCode?: string | null;
  amount: Money;
  note?: string | null;
  isAnonymous?: boolean;
}

interface NazrRequest {
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

interface NazrRequestPublicStatus {
  trackingCode: string;
  nazrTypeTitle: string;
  amount: Money;
  status: NazrRequestStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface UpdateNazrRequestStatus {
  status: NazrRequestStatus;
  adminNote?: string | null;
}
```

---

# بخش ۵ — پرداخت و رسید

```ts
type PaymentMethod = "online" | "card_to_card" | "cash";
type PaymentStatus = "pending" | "paid" | "rejected" | "refunded";
```

### `POST /nazr-requests/:requestId/payments/online/start`

شروع پرداخت آنلاین برای درخواست نذر با زرین‌پال. اگر تنظیمات زرین‌پال فعال نباشد، API خطای تنظیمات برمی‌گرداند و فرانت باید پیام قابل فهم نمایش دهد.

- **Auth:** صاحب درخواست
- **پاسخ:** `201 StartOnlinePaymentResponse`
- **خطاها:** `401 UNAUTHORIZED`، `403 FORBIDDEN`، `404 NAZR_REQUEST_NOT_FOUND`، `400 PAYMENT_GATEWAY_DISABLED`

### `GET /payments/zarinpal/callback`

callback برگشت زرین‌پال. API پرداخت را verify می‌کند و کاربر را به فرانت برمی‌گرداند.

- **Auth:** عمومی
- **Query:** `Authority, Status`
- **پاسخ:** redirect به فرانت

### `POST /nazr-requests/:requestId/payments`

ثبت پرداخت یا رسید برای یک درخواست.

- **Auth:** صاحب درخواست یا مهمان با `trackingCode`
- **بدنه:** `CreatePaymentRequest`
- **پاسخ:** `201 Payment`

### `POST /nazr-requests/:requestId/payment-receipt`

آپلود رسید کارت‌به‌کارت.

- **Content-Type:** `multipart/form-data`
- **پاسخ:** `201 PaymentReceipt`

### `GET /payments`

- **Auth:** admin
- **Query:** `page, pageSize, status?, method?, from?, to?`
- **پاسخ:** `200 Paginated<Payment>`

### `POST /payments/:id/approve`

- **Auth:** admin
- **پاسخ:** `200 Payment`

### `POST /payments/:id/reject`

- **Auth:** admin
- **بدنه:** `{ reason: string }`
- **پاسخ:** `200 Payment`

```ts
interface CreatePaymentRequest {
  method: PaymentMethod;
  amount: Money;
  trackingCode?: string;
  transactionReference?: string | null;
}

interface Payment {
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

interface PaymentReceipt {
  id: ID;
  paymentId: ID;
  fileUrl: string;
  uploadedAt: ISODate;
}

interface StartOnlinePaymentResponse {
  paymentId: ID;
  paymentUrl: string;
  authority: string;
}
```

---

# بخش ۶ — داشبورد و گزارش مدیریتی

### `GET /admin/dashboard`

- **Auth:** admin
- **پاسخ:** `200 AdminDashboard`

```ts
interface AdminDashboard {
  totalRequests: number;
  submittedRequests: number;
  confirmedRequests: number;
  completedRequests: number;
  pendingPayments: number;
  totalPaidAmount: Money;
  recentRequests: NazrRequest[];
}
```

### `GET /admin/reports/nazr-requests`

- **Auth:** admin
- **Query:** `from?, to?, nazrTypeId?, status?`
- **پاسخ:** `200 NazrRequestsReport`

```ts
interface NazrRequestsReport {
  totalCount: number;
  totalAmount: Money;
  byStatus: Record<NazrRequestStatus, number>;
  byNazrType: { nazrTypeId: ID; title: string; count: number; totalAmount: Money }[];
}
```

---

# بخش ۷ — تیکت و پیام کاربر

```ts
type TicketStatus = "open" | "answered" | "closed";
```

### `POST /tickets`

- **Auth:** کاربر یا مهمان
- **بدنه:** `CreateTicketRequest`
- **پاسخ:** `201 Ticket`

### `GET /tickets/mine`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 Paginated<Ticket>`

### `GET /tickets`

- **Auth:** admin
- **پاسخ:** `200 Paginated<Ticket>`

### `POST /tickets/:id/reply`

- **Auth:** صاحب تیکت یا admin
- **بدنه:** `{ body: string }`
- **پاسخ:** `201 TicketMessage`

### `POST /tickets/:id/close`

- **Auth:** صاحب تیکت یا admin
- **پاسخ:** `204 No Content`

```ts
interface CreateTicketRequest {
  subject: string;
  body: string;
  guestMobile?: string | null;
  nazrRequestTrackingCode?: string | null;
}

interface Ticket {
  id: ID;
  userId: ID | null;
  guestMobile: string | null;
  subject: string;
  status: TicketStatus;
  nazrRequestId: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: ID;
  body: string;
  authorType: "user" | "support";
  createdAt: ISODate;
}
```

---

# بخش ۸ — اعلان‌ها

### `GET /notifications`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 Paginated<NotificationItem>`

### `POST /notifications`

- **Auth:** admin
- **بدنه:** `CreateNotificationRequest`
- **پاسخ:** `201 NotificationItem`

### `POST /notifications/:id/read`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `204 No Content`

```ts
interface NotificationItem {
  id: ID;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: ISODate;
}

interface CreateNotificationRequest {
  userId?: ID | null;
  title: string;
  body: string;
  link?: string | null;
}
```

---

## نمونه مسیر کامل

1. کاربر `GET /nazr-types` را می‌گیرد.
2. کاربر فرم را پر می‌کند و `POST /nazr-requests` می‌زند.
3. API کد رهگیری می‌سازد و `NazrRequest` برمی‌گرداند.
4. کاربر پرداخت را با `POST /nazr-requests/:requestId/payments` ثبت می‌کند.
5. اگر رسید دارد، `POST /nazr-requests/:requestId/payment-receipt` را می‌زند.
6. admin پرداخت را در `GET /payments` می‌بیند و approve/reject می‌کند.
7. admin وضعیت درخواست را با `PATCH /nazr-requests/:id/status` جلو می‌برد.
8. کاربر با `GET /nazr-requests/track/:trackingCode` وضعیت را می‌بیند.

---

## فرایند تغییر قرارداد

اگر وسط کار نیاز به تغییر API بود:

1. اول همین فایل را به‌روز کن.
2. تایپ‌های مشترک را در `packages/shared` به‌روز کن.
3. API را مطابق قرارداد تغییر بده.
4. Frontend را مطابق قرارداد تغییر بده.
5. `npm run build` را اجرا کن.

این چرخه کمک می‌کند فرانت و بک‌اند از هم جدا نشوند.

---

## قرارداد فرانت‌اند و طراحی

- تمام UI فرانت‌اند باید با Tailwind CSS نوشته شود. از CSS خام در کامپوننت‌ها یا فایل‌های سراسری فقط برای پایه‌های ضروری پروژه مثل importهای Tailwind، reset خیلی محدود، font-face و تعریف CSS variableهای طراحی استفاده شود.
- رنگ‌ها، سایه‌ها، radiusها و حالت‌های UI باید از قرارداد طراحی پروژه بیایند و در Tailwind theme یا CSS variableهای مرکزی تعریف شوند؛ رنگ hard-code شده و پراکنده داخل کامپوننت‌ها مجاز نیست.
- هر صفحه یا کامپوننت جدید باید از tokenهای طراحی مشترک استفاده کند تا ظاهر پروژه یکپارچه بماند.
- اگر برای پیاده‌سازی یک UI به رنگ یا token جدید نیاز شد، اول قرارداد طراحی به‌روزرسانی شود، بعد Tailwind theme و سپس کد فرانت تغییر کند.
- تمام بخش‌ها، صفحه‌ها، فرم‌ها و کامپوننت‌های فرانت باید responsive باشند و در عرض‌های موبایل، تبلت و دسکتاپ بدون overflow، شکست layout یا بیرون‌زدگی متن/کنترل‌ها کار کنند.

### رنگ‌های پایه قرارداد طراحی

```ts
const designColors = {
  background: '#F4F6F8',
  foreground: '#20211F',
  surface: '#FFFFFF',
  muted: '#686B65',
  border: '#D8DDE4',
  primary: '#305F72',
  primaryDark: '#1D4658',
  primarySoft: '#E9F1F4',
  danger: '#A43B3B',
};
```

---

# بخش ۹ — پنل کاربری

این بخش قرارداد API پنل کاربری است و فرانت پروفایل باید از همین مسیرها استفاده کند.

### `GET /profile/details`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 UserProfileDetails`

### `PATCH /profile/details`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `UpdateUserProfileDetailsRequest`
- **پاسخ:** `200 UserProfileDetails`

### `GET /profile/summary`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 UserProfileSummary`

### `GET /profile/contributions`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 UserContributionSummary`

### `GET /profile/payments`

- **Auth:** کاربر لاگین‌شده
- **Query:** `page?, pageSize?, search?, from?, to?`
- **پاسخ:** `200 Paginated<Payment>`

### `GET /profile/goal`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 { motivationalTarget: string | null }`

### `PATCH /profile/goal`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `UpdateMotivationalTargetRequest`
- **پاسخ:** `200 { motivationalTarget: string | null }`

### `GET /profile/wallet`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 Wallet`

### `PATCH /profile/wallet`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `UpdateWalletSettingsRequest`
- **پاسخ:** `200 Wallet`
- با فعال‌شدن برداشت ماهانه، اولین سررسید یک ماه بعد ثبت می‌شود.
- پردازش سررسیدها به‌صورت دوره‌ای انجام می‌شود؛ برداشت موفق فقط یک‌بار ثبت شده و سررسید بعدی یک ماه جلو می‌رود.
- اگر موجودی کافی نباشد هیچ تراکنش یا کاهش موجودی ثبت نمی‌شود و سررسید برای تلاش بعدی باز می‌ماند.

### `POST /profile/wallet/charges`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `CreateWalletChargeRequest`
- **پاسخ:** `201 StartWalletChargeResponse`
- این endpoint فقط یک تراکنش `pending` می‌سازد و لینک درگاه را برمی‌گرداند؛ موجودی کیف پول در این مرحله تغییر نمی‌کند.
- موجودی فقط پس از callback موفق زرین‌پال و verify شدن پرداخت افزایش می‌یابد.
- callback کاربر را با یکی از وضعیت‌های `paid | cancelled | failed` به `/profile?tab=wallet&walletCharge=...` برمی‌گرداند.

### `GET /profile/wallet/transactions`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 WalletTransaction[]`

### `GET /profile/club`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 UserClubStatus`

### `GET /profile/gallery`

- **Auth:** کاربر لاگین‌شده
- **Query:** `nazrTypeId?`
- **پاسخ:** `200 GalleryAsset[]`

### `GET /profile/invitations`

- **Auth:** کاربر لاگین‌شده
- **پاسخ:** `200 InvitationCard[]`

### `POST /profile/invitations`

- **Auth:** کاربر لاگین‌شده
- **بدنه:** `CreateInvitationCardRequest`
- **پاسخ:** `201 InvitationCard`

```ts
type UserPlatform =
  | "eitaa"
  | "instagram"
  | "telegram"
  | "whatsapp"
  | "website"
  | "other";

interface UserProfileDetails {
  id: ID;
  fullName: string;
  mobile: string;
  eitaNumber: string | null;
  activePlatforms: UserPlatform[];
  motivationalTarget: string | null;
  createdAt: ISODate;
}

interface UpdateUserProfileDetailsRequest {
  fullName?: string;
  mobile?: string;
  eitaNumber?: string | null;
  activePlatforms?: UserPlatform[];
}

interface UpdateMotivationalTargetRequest {
  motivationalTarget: string | null;
}

interface UserContributionSummary {
  totalRequests: number;
  completedRequests: number;
  awaitingPaymentRequests: number;
  totalAmount: Money;
  byNazrType: {
    nazrTypeId: ID;
    title: string;
    count: number;
    totalAmount: Money;
    sharePercent: number;
  }[];
}

interface UserProfileSummary {
  profile: UserProfileDetails;
  contributions: UserContributionSummary;
  payments: {
    totalPaidAmount: Money;
    totalPayments: number;
    recentPayments: Payment[];
  };
  club: UserClubStatus;
  unreadNotifications: number;
  openTickets: number;
}

type GalleryAssetType = "image" | "video";

interface GalleryAsset {
  id: ID;
  nazrTypeId: ID | null;
  title: string;
  type: GalleryAssetType;
  fileUrl: string;
  thumbnailUrl: string | null;
  createdAt: ISODate;
}

interface Wallet {
  id: ID;
  userId: ID;
  balance: Money;
  isMonthlyDeductionEnabled: boolean;
  monthlyDeductionAmount: Money | null;
  nextMonthlyDeductionAt: ISODate | null;
  lastMonthlyDeductionAt: ISODate | null;
  updatedAt: ISODate;
}

interface UpdateWalletSettingsRequest {
  isMonthlyDeductionEnabled: boolean;
  monthlyDeductionAmount?: Money | null;
}

interface CreateWalletChargeRequest {
  amount: Money;
}

interface StartWalletChargeResponse {
  transactionId: ID;
  paymentUrl: string;
  authority: string;
}

interface WalletTransaction {
  id: ID;
  walletId: ID;
  type: "charge" | "deduction" | "payment" | "refund";
  status: "pending" | "completed" | "failed";
  amount: Money;
  description: string;
  transactionReference: string | null;
  createdAt: ISODate;
}

interface UserClubStatus {
  level: string;
  points: number;
  joinedDays: number;
  missions: {
    id: string;
    title: string;
    description: string;
    points: number;
    status: "available" | "completed" | "locked";
  }[];
}

interface CreateInvitationCardRequest {
  friendName: string;
  friendMobile?: string | null;
}

interface InvitationCard {
  id: ID;
  userId: ID;
  friendName: string;
  friendMobile: string | null;
  message: string;
  downloadText: string;
  createdAt: ISODate;
}
```

---

# بخش ۹ — پنل مدیریت و CRM

همه مسیرهای این بخش به نشست معتبر با نقش `admin` نیاز دارند. اطلاعات تراکنشی در API نگه‌داری می‌شود و پنل `/admin` فقط مصرف‌کننده این قرارداد است.

### داشبورد و مخاطبان

- `GET /admin/dashboard` → `200 AdminDashboardSummary`
- `GET /admin/users?page&pageSize&search&stage` → `200 Paginated<AdminUserListItem>`
- `GET /admin/users/:id` → `200 AdminUserDetails`
- `PATCH /admin/users/:id/crm` با `UpdateCrmProfileRequest` → `200 CrmProfile`
- `POST /admin/users/:id/activities` با `CreateCrmActivityRequest` → `201 CrmActivity`

مرحله‌های CRM: `new | engaged | recurring | at_risk | inactive`.
فعالیت‌ها: `call | note | payment | ticket | status`.

پرونده مخاطب شامل مشخصات، خلاصه مشارکت، نذرها، پرداخت‌ها، تیکت‌ها، وضعیت CRM و تاریخچه فعالیت است. داده‌های حساس مانند هش رمز در پاسخ وجود ندارند.

### نذر و پرداخت

- `GET /admin/nazr-types` → `200 NazrType[]`
- `POST /admin/nazr-types` با `CreateNazrTypeRequest` → `201 NazrType`
- `PATCH /admin/nazr-types/:id` با `UpdateNazrTypeRequest` → `200 NazrType`
- `DELETE /admin/nazr-types/:id` → `204` (حذف قطعی فقط وقتی هیچ نذری از این نوع ثبت نشده باشد)
  - اگر نوع نذر استفاده شده باشد: `409 NAZR_TYPE_IN_USE` و مدیر باید آن را غیرفعال کند.
- `GET /admin/nazr-requests?page&pageSize&search&status` → `200 Paginated<NazrRequest>`
- `PATCH /admin/nazr-requests/:id/status` با `UpdateNazrRequestStatus` → `200 NazrRequest`
- `GET /admin/payments?page&pageSize&search&status` → `200 Paginated<Payment>`
- `POST /admin/payments/:id/approve` → `200 Payment`
- `POST /admin/payments/:id/reject` با `{ reason?: string }` → `200 Payment`

تأیید پرداخت، درخواست نذر را `confirmed` می‌کند. رد پرداخت، درخواست را `cancelled` می‌کند و دلیل در یادداشت مدیریتی ثبت می‌شود.

### پشتیبانی، اعلان و گالری

- `GET /admin/tickets?page&pageSize` → `200 Paginated<Ticket>`
- پاسخ و بستن تیکت از مسیرهای مشترک `POST /tickets/:id/reply` و `POST /tickets/:id/close` انجام می‌شود.
- `GET /admin/notifications?page&pageSize` → `200 Paginated<AdminNotificationItem>`
- `POST /admin/notifications` با `CreateNotificationRequest` → `201 AdminNotificationItem`
- `GET /admin/gallery` → `200 GalleryAsset[]`
- `POST /admin/gallery/upload?kind=image|video` با بدنه `multipart/form-data` و فیلد `file` → `201 GalleryUploadResponse`
- `POST /admin/gallery` با `CreateGalleryAssetRequest` → `201 GalleryAsset`
- `PATCH /admin/gallery/:id` با `UpdateGalleryAssetRequest` → `200 GalleryAsset`
- `DELETE /admin/gallery/:id` → `204`

```ts
interface GalleryUploadResponse {
  url: string;
}
```

- فرمت‌های تصویر مجاز: `JPEG`، `PNG`، `WebP`، `GIF` و `AVIF` تا سقف ۱۰ مگابایت.
- فرمت‌های ویدئو مجاز: `MP4`، `WebM` و `MOV` تا سقف ۱۵۰ مگابایت.
- در ساخت یا تبدیل رسانه به نوع `video`، ارسال `thumbnailUrl` معتبر الزامی است.

### کال‌سنتر و پیگیری ماهانه

- `GET /admin/call-tasks?page&pageSize&status` → `200 Paginated<CallTask>`
- `POST /admin/call-tasks` با `CreateCallTaskRequest` → `201 CallTask`
- `POST /admin/call-tasks/generate` با `GenerateMonthlyCallTasksRequest` → `201 { created: number }`
- `PATCH /admin/call-tasks/:id` با `UpdateCallTaskRequest` → `200 CallTask`

دوره با قالب `YYYY-MM` ارسال می‌شود. تولید ماهانه فقط برای کیف‌پول‌هایی انجام می‌شود که برداشت دوره‌ای فعال دارند و برای هر مخاطب در هر دوره فقط یک وظیفه ساخته می‌شود.

وضعیت‌های تماس: `pending | contacted | promised | paid | unreachable | cancelled`.

تعریف کامل تایپ‌های این بخش در `packages/shared/src/admin.ts` منبع حقیقت قرارداد است.
