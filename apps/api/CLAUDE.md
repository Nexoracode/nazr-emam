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

هر دامنه یک ماژول مستقل داشته باشد:

```text
src/
  auth/
    dto/
    guards/
    strategies/
    auth.controller.ts
    auth.service.ts
    auth.module.ts
  nazr-types/
  nazr-requests/
  payments/
  admin/
  tickets/
  notifications/
  common/
    filters/
    decorators/
    guards/
  config/
    env.ts
```

- منطق اصلی در `service` باشد، نه در `controller`.
- `controller` فقط ورودی را بگیرد، guard/validation را اعمال کند و service را صدا بزند.
- DTOها در پوشه `dto/` همان ماژول باشند.

## قرارداد و تایپ مشترک

- خروجی و ورودی endpointها باید با `docs/API-CONTRACT.md` هماهنگ باشد.
- تایپ response/request باید از `@nazr-emam/shared` بیاید.
- تایپ محلی تکراری برای داده مشترک نساز.
- هر route جدید باید همزمان در `docs/API-CONTRACT.md` مستند شود.


## Stack دیتابیس
- ORM: **TypeORM** + دیتابیس: **MySQL**
- PK همه‌ی entity‌ها: `uuid` (نه auto-increment integer)
- نام جداول و ستون‌ها: snake_case
- Migration اجباری. هرگز `synchronize: true` در production.

## قواعد API
- خروجی endpoint باید از تایپ `@roohbakhsh/shared` باشد. تایپ محلی نساز.
- ورودی‌ها با DTO و `class-validator` اعتبارسنجی شوند.
- خطاها به شکل `ApiError` (از shared) برگردند — فیلتر سراسری این را handle می‌کند.
- هر controller با `@ApiTags` برچسب بخورد.

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
