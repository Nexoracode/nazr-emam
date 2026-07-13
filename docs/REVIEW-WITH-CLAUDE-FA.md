# ریویوی روزانه کد با Claude Code

این روش برای ناظر یا کسی است که PRها را بررسی می‌کند. هدف این است که قبل از merge شدن تغییرات، باگ، مشکل امنیتی، ناهماهنگی API و شکست Docker/Turbo پیدا شود.

---

## آماده‌سازی یک‌بار

```bash
git clone <repo-url>
cd nazr-emam
npm install
```

اگر پروژه هنوز remote ندارد، همین مسیر local را با Claude Code باز کن و از روی branchها review بگیر.

---

## روال روزانه review

### ۱) آخرین تغییرات را بگیر

```bash
git pull
npm install
```

اگر `package.json` یا `package-lock.json` تغییر کرده بود، `npm install` ضروری است.

### ۲) PR یا branch موردنظر را بیاور

اگر GitHub CLI فعال است:

```bash
gh pr list
gh pr checkout <شماره PR>
```

اگر فقط branch داری:

```bash
git checkout <branch-name>
git pull
```

### ۳) بررسی فنی را اجرا کن

```bash
npm run build
npm run lint
```

برای تغییرات زیرساختی یا production:

```bash
docker compose up --build
```

بعد از Docker باید این دو آدرس پاسخ بدهند:

- `http://localhost:3000`
- `http://localhost:3001/health`

### ۴) از Claude review بگیر

داخل پروژه از Claude Code بخواه:

```text
این تغییرات را طبق docs/ONBOARDING-FA.md و docs/API-CONTRACT.md ریویو کن.
روی این موارد تمرکز کن:
باگ، مشکل امنیتی، ناهماهنگی API، شکستن قرارداد بین NestJS و Next.js،
مشکل RTL، متن نامناسب فارسی، شکست build، و ناسازگاری Docker تک‌کانتینری.
```

اگر PR مربوط به API است، این متن دقیق‌تر است:

```text
این PR را با docs/API-CONTRACT.md مقایسه کن.
آیا endpointها، بدنه request، response، status code، auth و error codeها دقیقاً مطابق قرارداد هستند؟
اگر قرارداد تغییر کرده ولی سند به‌روز نشده، گزارش بده.
```

اگر PR مربوط به frontend است:

```text
این PR را از نظر هماهنگی با قرارداد API، RTL، متن فارسی، واکنش‌گرایی، و تجربه کاربر نذر امام بررسی کن.
هر جایی که فرانت به فیلدی خارج از docs/API-CONTRACT.md تکیه کرده گزارش بده.
```

---

## معیارهای رد یا قبول PR

PR را تأیید نکن اگر یکی از این موارد وجود دارد:

- `npm run build` شکست می‌خورد.
- API با `docs/API-CONTRACT.md` هماهنگ نیست.
- endpoint جدید بدون ثبت در قرارداد اضافه شده است.
- داده حساس کاربر مثل شماره موبایل یا کد ملی بی‌دلیل در log یا UI عمومی نمایش داده می‌شود.
- تغییرات Docker باعث می‌شود هر دو اپ داخل یک container اجرا نشوند.
- متن فارسی UI مبهم، نامناسب یا hard-code شده در جای اشتباه است.
- layout در RTL می‌شکند.

PR قابل قبول است اگر:

- build و lint موفق است.
- قرارداد API رعایت شده است.
- تغییرات محدود به همان feature است.
- مسیر کاربر در فرانت قابل فهم است.
- تغییرات زیرساختی با Docker و Turbo سازگار است.

---

## تصمیم نهایی

اگر ایراد داشت:

```bash
gh pr comment <شماره> --body "ایرادها: ..."
```

اگر خوب بود:

```bash
gh pr review <شماره> --approve
gh pr merge <شماره> --squash
```

اگر GitHub CLI فعال نیست، نتیجه review را دستی در Pull Request ثبت کن.

---

## مرور تغییرات یک روز

اگر فقط می‌خواهی ببینی از دیروز چه عوض شده:

```bash
git fetch
git log --oneline --since="1 day ago" --all
git diff HEAD@{1} HEAD
```

بعد از Claude بخواه:

```text
این تغییرات یک روز اخیر را خلاصه و از نظر قرارداد API، build، امنیت و Docker بررسی کن.
```
