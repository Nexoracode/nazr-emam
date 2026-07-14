# قوانین بک‌اند — apps/api

> قوانین ریشه (`/CLAUDE.md`) را هم رعایت کن. این فایل فقط قوانین اختصاصی NestJS API است.

## مسئولیت این اپ

`apps/api` منطق تراکنشی و امن پروژه را نگه می‌دارد:

- احراز هویت و نقش‌ها
- ثبت و مدیریت درخواست‌های نذر
- پرداخت‌ها، رسیدها و تأیید مالی
- کد رهگیری و پیگیری وضعیت
- داشبورد و گزارش‌های مدیریتی
- تیکت، اعلان و پیام‌های کاربر

محتوای قابل ویرایش مثل متن صفحه‌ها، بنرها، پرسش‌های متداول، تصاویر و محتوای معرفی نذرها در صورت نیاز از `apps/cms` می‌آید؛ API نباید نقش CMS را بگیرد.

## ساختار پیشنهادی

تمام routeها و دامنه‌های API باید زیر `src/modules/[route]` تفکیک شوند. هر route یک ماژول مستقل است و فایل‌های همان دامنه را داخل خودش نگه می‌دارد.

```text
src/
  modules/
    auth/
      dto/
      guards/
      strategies/
      auth.controller.ts
      auth.service.ts
      auth.module.ts
    nazr-types/
      dto/
      nazr-types.controller.ts
      nazr-types.service.ts
      nazr-types.module.ts
    nazr-requests/
    payments/
    admin/
    tickets/
    notifications/
  common/
    filters/
    interceptors/
    decorators/
    guards/
    i18n/
  config/
    env.ts
```

- ساختار هر route باید الگوی `src/modules/[route]` را رعایت کند.
- منطق اصلی در `service` باشد، نه در `controller`.
- `controller` فقط ورودی را بگیرد، guard/validation را اعمال کند و service را صدا بزند.
- DTOها در پوشه `dto/` همان ماژول باشند.
- cross-cutting concernها مثل exception filter، response interceptor، language resolver و decoratorهای عمومی باید داخل `src/common/` باشند.
- فایل‌های یک route را در ریشه `src/` پخش نکن.

## قرارداد و تایپ مشترک

- خروجی و ورودی endpointها باید با `docs/API-CONTRACT.md` هماهنگ باشد.
- تایپ response/request باید از `@nazr-emam/shared` بیاید.
- تایپ محلی تکراری برای داده مشترک نساز.
- هر route جدید باید همزمان در `docs/API-CONTRACT.md` مستند شود.

## دیتابیس

دیتابیس و ORM هنوز قطعی نشده‌اند. تا قبل از تصمیم نهایی:

- ORM اضافه نکن.
- entity و migration واقعی نساز.
- قانون دیتابیس را از روی پروژه دیگر کپی نکن.
- اگر نیاز به persistence پیش آمد، اول گزینه‌ها را با کاربر قطعی کن و بعد قرارداد را در docs ثبت کن.

بعد از تصمیم کاربر، قوانین دیتابیس، migration، نام جدول‌ها و config در همین فایل کامل می‌شود.

## قواعد API

- خروجی endpoint باید از تایپ `@nazr-emam/shared` باشد. تایپ محلی نساز.
- ورودی‌ها با DTO و `class-validator` اعتبارسنجی شوند.
- برای هر DTO از decoratorهای دقیق استفاده کن، مثل `@IsString`، `@IsMobilePhone`، `@IsEnum`، `@IsOptional`، `@ValidateNested` و `@Type`.
- validation سراسری باید با `ValidationPipe` فعال شود:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`
- خطاها به شکل `ApiError` از `@nazr-emam/shared` برگردند.
- لیست‌ها باید با شکل `Paginated<T>` برگردند.
- هر controller با `@ApiTags` برچسب بخورد.
- مسیرهای admin باید guard نقش admin داشته باشند.

## Swagger

تمام routeها باید توضیحات Swagger داشته باشند.

- هر controller باید `@ApiTags(...)` داشته باشد.
- هر endpoint باید `@ApiOperation({ summary, description })` داشته باشد.
- همه پاسخ‌های موفق و خطا باید با `@ApiResponse` یا decoratorهای دقیق‌تر مثل `@ApiOkResponse`، `@ApiCreatedResponse`، `@ApiBadRequestResponse` و `@ApiUnauthorizedResponse` ثبت شوند.
- DTOها باید برای فیلدهای عمومی `@ApiProperty` یا `@ApiPropertyOptional` با `description` و `example` واقعی داشته باشند.
- routeهای محافظت‌شده باید `@ApiBearerAuth()` داشته باشند.
- اگر endpoint زبان را از header می‌خواند، باید `@ApiHeader({ name: 'Accept-Language', ... })` داشته باشد.
- اگر endpoint فایل می‌گیرد، باید `@ApiConsumes('multipart/form-data')` و schema مناسب داشته باشد.

## Interceptor و Filter

API باید cross-cutting behavior متمرکز داشته باشد:

- یک exception filter سراسری برای تبدیل خطاها به شکل `ApiError`.
- یک response interceptor سراسری برای یکدست کردن رفتار responseها، log حداقلی و افزودن metadataهای امن در صورت نیاز.
- interceptor نباید داده حساس مثل token، شماره موبایل، کد ملی یا اطلاعات پرداخت را log کند.
- اگر request id یا correlation id اضافه شد، باید از interceptor/decorator مشترک مدیریت شود.
- controllerها نباید منطق format کردن خطا یا response را تکرار کنند.

## چندزبانه و پیام‌ها

زیرساخت چندزبانه باید از ابتدا در API قابل پیش‌بینی باشد، حتی اگر UI فعلاً فارسی باشد.

- زبان درخواست از `Accept-Language` خوانده شود.
- زبان پیش‌فرض فعلاً `fa` است.
- ساختار باید امکان اضافه کردن زبان‌های بعدی مثل `ar` و `en` را داشته باشد.
- `message` و `fields` در `ApiError` باید از سیستم پیام چندزبانه بیایند، نه متن hard-code پراکنده داخل service/controller.
- `code` خطا همیشه ثابت و ماشینی باشد و ترجمه نشود.
- کلیدهای پیام باید متمرکز باشند، مثلاً در `src/common/i18n/`.
- validation errorهای `class-validator` باید به پیام قابل ترجمه تبدیل شوند.
- اگر داده‌ای خودش محتوای چندزبانه بود، شکل آن باید اول در `packages/shared` و `docs/API-CONTRACT.md` تعریف شود.

## احراز هویت
- توکن JWT در هدر `Authorization: Bearer <accessToken>`.
- جریان: `register/login` → `{accessToken, refreshToken, user}` → `POST /auth/refresh` با refreshToken → توکن جدید.
- Refresh token به‌صورت hash در جدول `refresh_tokens` ذخیره می‌شود (نه plain text).
- مسیرهای محافظت‌شده از `@UseGuards(JwtAuthGuard)` استفاده می‌کنند.


## مستندسازی

- endpointهای جدید باید در `docs/API-CONTRACT.md` ثبت شوند.
- وقتی Swagger اضافه شد، هر controller باید `@ApiTags` و هر route توضیح و response داشته باشد.

## دستورها

```bash
npm run dev -w @nazr-emam/api
npm run build -w @nazr-emam/api
npm run lint -w @nazr-emam/api
```
