type ProjectInfo = {
  name: string;
  description: string;
  workflow: string[];
};

async function getProjectInfo(): Promise<ProjectInfo | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/project`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const project = await getProjectInfo();

  return (
    <main className="page-shell">
      <section className="intro">
        <p className="eyebrow">سامانه نذر امام</p>
        <h1>شروع پیاده‌سازی پروژه نذر امام</h1>
        <p>
          پایه‌ی فرانت و API آماده است. قدم بعدی، تکمیل مدل دامنه و فرم‌های
          ثبت بر اساس محتوای PDF پروژه است.
        </p>
      </section>

      <section className="status-panel" aria-label="وضعیت اتصال API">
        <h2>وضعیت سرویس</h2>
        {project ? (
          <div className="status-ok">
            <strong>{project.name}</strong>
            <span>اتصال فرانت به API برقرار است.</span>
          </div>
        ) : (
          <div className="status-error">
            <strong>API در دسترس نیست</strong>
            <span>آدرس API یا وضعیت اجرای سرویس را بررسی کنید.</span>
          </div>
        )}
      </section>

      <section className="workflow">
        <h2>workflow اولیه</h2>
        <ol>
          <li>ثبت درخواست نذر</li>
          <li>بررسی و تایید درخواست</li>
          <li>پیگیری وضعیت انجام</li>
        </ol>
      </section>
    </main>
  );
}
