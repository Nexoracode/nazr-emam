const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { randomUUID, createHash } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory, Reflector } = require('@nestjs/core');
const cookieParser = require('cookie-parser');
const next = require('next');
const ts = require('typescript');
const { AdminController } = require('../dist/modules/admin/admin.controller');
const { AdminService } = require('../dist/modules/admin/admin.service');
const { AuthGuard } = require('../dist/modules/auth/guards/auth.guard');
const { RolesGuard } = require('../dist/common/guards/roles.guard');

test('gallery uploads pass through the real Next rewrite with admin protection intact', { timeout: 120000 }, async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'nazr-gallery-test-'));
  const uploadDir = path.join(temp, 'uploads');
  const webDir = path.join(temp, 'web');
  await fs.mkdir(uploadDir);
  await fs.mkdir(path.join(webDir, 'app'), { recursive: true });
  const repoRoot = path.resolve(__dirname, '../../..');
  await fs.symlink(path.join(repoRoot, 'node_modules'), path.join(webDir, 'node_modules'));
  await fs.writeFile(path.join(webDir, 'package.json'), JSON.stringify({ private: true }));
  await fs.writeFile(path.join(webDir, 'app/layout.js'), 'export default function Layout({children}) { return <html><body>{children}</body></html> }');
  await fs.writeFile(path.join(webDir, 'app/page.js'), 'export default function Page() { return <div>Upload test</div> }');
  await fs.copyFile(path.join(repoRoot, 'apps/web/middleware.ts'), path.join(webDir, 'middleware.ts'));

  const records = new Map();
  const media = { 'media.storage': 'local', 'media.uploadDir': uploadDir };
  const config = {
    get: (key, fallback) => media[key] ?? fallback,
    getOrThrow: key => { assert.ok(media[key], key); return media[key]; },
  };
  const galleryRepo = {
    create: value => ({ ...value }),
    save: async value => {
      value.id ??= randomUUID(); value.createdAt ??= new Date();
      records.set(value.id, value); return value;
    },
    find: async () => [...records.values()],
    findOne: async ({ where }) => records.get(where.id),
    delete: async id => { records.delete(id); },
  };
  const service = new AdminService(config, undefined, undefined, undefined, undefined, undefined, undefined, undefined, galleryRepo);
  const provider = Object.fromEntries(['uploadGallery', 'createGallery', 'gallery', 'deleteGallery']
    .map(key => [key, service[key].bind(service)]));
  class TestModule {}
  Module({ controllers: [AdminController], providers: [{ provide: AdminService, useValue: provider }] })(TestModule);
  const api = await NestFactory.create(TestModule, { logger: false });
  const auth = {
    getAccessTokenFromRequest: req => req.cookies?.accessToken,
    getRefreshTokenFromRequest: () => undefined,
    authenticate: async token => token === 'admin' || token === 'donor'
      ? { user: { id: token, role: token } } : null,
  };
  api.use(cookieParser());
  api.useGlobalGuards(new AuthGuard(auth, new Reflector()), new RolesGuard(new Reflector()));
  api.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  await api.listen(0, '127.0.0.1');
  let front, server;
  t.after(async () => {
    server?.closeAllConnections();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    await front?.close();
    await api.close();
    await fs.rm(temp, { recursive: true, force: true });
  });

  // Load the actual application config, preserving its installed Next version's
  // upload-buffer option rather than duplicating that setting in this test.
  const apiBase = await api.getUrl();
  const source = await fs.readFile(path.join(repoRoot, 'apps/web/next.config.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  await fs.writeFile(path.join(webDir, 'next.config.js'), compiled + '\nmodule.exports = exports.default;\n');
  const oldApi = process.env.INTERNAL_API_URL;
  process.env.INTERNAL_API_URL = apiBase;
  front = next({ dev: true, dir: webDir, hostname: '127.0.0.1' });
  try { await front.prepare(); }
  finally { if (oldApi === undefined) delete process.env.INTERNAL_API_URL; else process.env.INTERNAL_API_URL = oldApi; }
  server = http.createServer(front.getRequestHandler());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  media['media.publicBaseUrl'] = base;
  const request = (url, options = {}, token = 'admin') => fetch(base + url, {
    ...options, headers: { ...(token ? { cookie: `accessToken=${token}` } : {}), ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  const upload = (buffer, kind, mime, token) => {
    const body = new FormData();
    body.append('file', new Blob([buffer], { type: mime }), kind === 'video' ? 'test.mp4' : 'test.png');
    return request(`/api/admin/gallery/upload?kind=${kind}`, { method: 'POST', body }, token);
  };

  await t.test('an admin uploads a video above 10 MiB, publishes it and deletes its files', async () => {
    const video = Buffer.alloc(12 * 1024 * 1024, 0x5a);
    const res = await upload(video, 'video', 'video/mp4');
    assert.equal(res.status, 201, await res.clone().text());
    const { url } = await res.json();
    const stored = await fs.readFile(path.join(uploadDir, path.basename(url)));
    assert.equal(stored.length, video.length);
    assert.equal(createHash('sha256').update(stored).digest('hex'), createHash('sha256').update(video).digest('hex'));
    const thumbnail = await upload(Buffer.from('thumbnail'), 'image', 'image/png');
    assert.equal(thumbnail.status, 201);
    const thumbnailUrl = (await thumbnail.json()).url;
    const created = await request('/api/admin/gallery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'گزارش تست', type: 'video', placement: 'gallery', nazrTypeId: null, fileUrl: url, thumbnailUrl }),
    });
    assert.equal(created.status, 201, await created.clone().text());
    const asset = await created.json();
    assert.equal((await (await request('/api/admin/gallery')).json()).length, 1);
    assert.equal((await request('/api/admin/gallery/' + asset.id, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await fs.readdir(uploadDir), []);
  });

  await t.test('donors and unauthenticated visitors cannot upload or create gallery entries', async () => {
    for (const [token, status] of [['donor', 403], [null, 401]]) {
      assert.equal((await upload(Buffer.from('small'), 'image', 'image/png', token)).status, status);
      assert.equal((await request('/api/admin/gallery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }, token)).status, status);
    }
    assert.equal(records.size, 0);
    assert.deepEqual(await fs.readdir(uploadDir), []);
  });

  await t.test('oversized images reach API validation without truncated multipart data', async () => {
    const response = await upload(Buffer.alloc(11 * 1024 * 1024), 'image', 'image/png');
    assert.equal(response.status, 400);
    assert.match((await response.json()).fields.file, /۱۰ مگابایت/);
    assert.deepEqual(await fs.readdir(uploadDir), []);
  });
});
