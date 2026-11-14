const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CrmSyncService } = require('../dist/crm/crm-sync.service');
const { Crm24ClientService } = require('../dist/crm/crm24-client.service');

test('simultaneous CRM requests share one login challenge and a failed login can retry', async () => {
  const client = new Crm24ClientService({});
  let calls = 0;
  client.openSession = async () => {
    calls++;
    await new Promise(resolve => setImmediate(resolve));
    if (calls === 1) throw new Error('session unavailable');
    client.sessionName = 'test';
  };
  const first = await Promise.allSettled([client.login(), client.login()]);
  assert.ok(first.every(attempt => attempt.status === 'rejected'));
  assert.equal(calls, 1);
  await Promise.all([client.login(), client.login()]);
  assert.equal(calls, 2);
});

test('reconciliation recovers a missed payment, keeps its date and avoids duplicate writes', async () => {
  const request = {
    id: 'req', trackingCode: 'NE-ABC123', donorMobile: '09000000000',
    donorFullName: 'کاربر تست', nazrType: { slug: 'niaz-rooz' }, amount: { currency: 'IRT', amount: 100 },
  };
  const payment = {
    id: 'payment', nazrRequest: request, status: 'paid', method: 'online',
    amount: request.amount, updatedAt: new Date('2026-10-29T09:00:00Z'),
  };
  const remote = [];
  let writes = 0;
  const client = {
    query: async sql => {
      if (sql.includes('FROM Contacts')) return [{ id: 'contact', mobile: request.donorMobile, cf_1756: 'بله' }];
      if (sql.includes('FROM Services')) return [{ id: 'service' }];
      return remote;
    },
    create: async (_, fields) => {
      writes++;
      remote.push({ ...fields, id: 'crm-id' });
      throw new Error('response lost after insert');
    },
    update: async () => assert.fail('a paid record must be preserved'),
  };
  const runner = { connect: async () => {}, release: async () => {}, query: async () => [{ locked: 1 }] };
  const payments = {
    manager: { connection: { createQueryRunner: () => runner } },
    findOne: async () => payment,
    find: async ({ where }) => where.id.value === '' ? [payment] : [],
  };
  const sync = new CrmSyncService(client, { enabled: true, config: { assignedUserId: 'test' } }, payments, {findOne: async () => request});
  sync.logger.error = () => {};
  await sync.reconcilePaid();
  await sync.reconcilePaid();
  await sync.syncByPaymentId(payment.id);
  await sync.syncNewNazr(request.id);
  assert.equal(writes, 1);
  assert.equal(remote[0].amount_currency_value, 1000);
  assert.equal(remote[0].paymentsstatus, 'پرداخت شده');
  assert.equal(remote[0].datereceived, '1405/08/07');
});

test('duplicate CRM contacts are resolved only when a single name matches the donor', async () => {
  const contacts = [
    { id: 'c1', mobile: '+989000000000', firstname: 'یک', lastname: 'فرد', cf_1756: 'بله' },
    { id: 'c2', mobile: '09000000000', firstname: 'دیگر', lastname: 'فرد', cf_1756: '' },
  ];
  const client = { query: async () => contacts, create: () => assert.fail() };
  const service = new CrmSyncService(client, {}, {}, {});
  const donor = { donorMobile: '09000000000', donorFullName: 'یک فرد' };
  assert.equal(await service.upsertContact(donor), 'c1');
  contacts[1].firstname = contacts[0].firstname;
  contacts[0].cf_1756 = '';
  await assert.rejects(service.upsertContact(donor), /بررسی دستی/);
  contacts[0].cf_1756 = 'بله';
  assert.equal(await service.upsertContact(donor), 'c1');
  await assert.rejects(service.upsertContact({ ...donor, donorFullName: 'نام دیگری' }), /بررسی دستی/);
});

test('an existing settled CRM amount conflict cannot be overwritten during retry', async () => {
  const payment = { id: 'p', status: 'paid', amount: { currency: 'IRT', amount: 42 },
    nazrRequest: { id: 'n', trackingCode: 'NE-ABC123' } };
  const client = {
    query: async () => [{ id: 'c', paymentsstatus: 'پرداخت شده', cf_1764: 'نذر امام', amount_currency_value: '410' }],
    update: async () => assert.fail(), create: async () => assert.fail(),
  };
  const runner = { connect: async () => {}, release: async () => {}, query: async () => [{ locked: 1 }] };
  const service = new CrmSyncService(client, { enabled: true }, {
    findOne: async () => payment, manager: { connection: { createQueryRunner: () => runner } },
  }, {});
  let logged;
  service.logger.error = message => { logged = message; };
  service.logger.warn = message => { logged = message; };
  await service.syncByPaymentId('p');
  assert.match(logged, /مغایرت رکورد مالی/);
});

test('a challenge displaced by another integration gets one new handshake', async () => {
  const client = new Crm24ClientService({});
  let calls = 0;
  client.openSession = async () => {
    if (++calls === 1) throw new Error('CRM24: Invalid username or password');
    client.sessionName = 'test';
  };
  await Promise.all([client.login(), client.login()]);
  assert.equal(calls, 2);
});

function fixture({ requests = [], users = [], payments = [], contacts = [], remote = [], review = [] } = {}) {
  let locked = false;
  const waiting = [];
  const manager = { connection: { createQueryRunner: () => ({
    connect: async () => {}, release: async () => {},
    query: async sql => {
      if (sql.includes('GET_LOCK')) {
        if (locked) await new Promise(resolve => waiting.push(resolve));
        locked = true;
        return [{ locked: 1 }];
      }
      const next = waiting.shift();
      if (next) next(); else locked = false;
      return [];
    },
  }) } };
  const writes = [];
  const client = {
    query: async sql => {
      if (sql.includes('FROM Contacts')) return contacts;
      if (sql.includes('FROM Services')) return [{ id: 'service' }];
      return remote.filter(row => sql.includes(`'${row.tracking_code}'`));
    },
    create: async (module, fields) => {
      writes.push({ module, ...fields });
      const row = { ...fields, id: 'created-' + writes.length };
      (module === 'Contacts' ? contacts : remote).push(row);
      return row;
    },
    update: async (module, fields) => {
      writes.push({ module, ...fields });
      const row = (module === 'Contacts' ? contacts : remote).find(r => r.id === fields.id);
      Object.assign(row, fields);
      return row;
    },
  };
  const paged = rows => ({ where }) => rows.filter(r => r.id > where.id.value).slice(0, 40);
  const requestRepo = { find: async options => paged(requests)(options), findOne: async ({ where }) => requests.find(r => r.id === where.id) };
  const userRepo = { find: async options => paged(users)(options), findOne: async ({ where }) => users.find(r => r.id === where.id) };
  const paymentRepo = { manager, find: async options => paged(payments)(options), findOne: async ({ where }) => payments.find(r => r.id === where.id) };
  const service = new CrmSyncService(client, { enabled: true, config: { assignedUserId: 'owner', reviewTrackingCodes: review } }, paymentRepo, requestRepo, userRepo);
  service.logger = { error: () => {}, warn: () => {}, log: () => {} };
  return { service, client, writes, requestRepo, userRepo, paymentRepo, remote, contacts };
}

const requestFixture = (id = 'n1', code = 'NE-ABC123') => ({
  id, trackingCode: code, donorMobile: '09000000000', donorFullName: 'کاربر تست',
  nazrType: { slug: 'niaz-rooz' }, status: 'awaiting_payment',
  amount: { amount: 120, currency: 'IRT' }, payments: [],
});

test('all request states recover idempotently and cancellation never counts as paid', async () => {
  const pending = requestFixture();
  const cancelled = { ...requestFixture('n2', 'NE-DEF456'), status: 'cancelled' };
  const f = fixture({ requests: [pending, cancelled] });
  await f.service.reconcileRequests();
  await f.service.reconcileRequests();
  assert.equal(f.remote.length, 2);
  assert.equal(f.contacts.length, 1);
  assert.deepEqual(f.remote.map(p => p.paymentsstatus), ['در انتظار پرداخت', 'لغو شده']);
  assert.ok(f.remote.every(p => p.amount_currency_value === 1200 && !p.datereceived));
  cancelled.status = 'awaiting_payment';
  await f.service.reconcileRequests();
  assert.equal(f.remote[1].paymentsstatus, 'در انتظار پرداخت');
});

test('a stored user with no donation is recovered and existing contact origins are preserved', async () => {
  const users = [
    { id: 'u1', mobile: '09000000000', fullName: 'نام جدید', role: 'donor' },
    { id: 'u2', mobile: '09100000000', fullName: 'کاربر تازه', role: 'donor' },
  ];
  const contact = { id: 'existing', mobile: '+98 900 000 0000', firstname: 'نام', lastname: 'قدیمی', cf_1756: 'خیر', leadsource: 'منبع قبلی', assigned_user_id: 'original-owner' };
  const f = fixture({ users, contacts: [contact] });
  await f.service.reconcileUsers();
  await f.service.reconcileUsers();
  assert.equal(f.contacts.length, 2);
  assert.equal(contact.cf_1756, 'بله');
  assert.equal(contact.lastname, 'قدیمی');
  assert.equal(contact.leadsource, 'منبع قبلی');
  assert.equal(contact.assigned_user_id, 'original-owner');
  assert.equal(f.writes.length, 2);
  assert.equal(f.remote.length, 0);
});

test('review codes prevent every financial write even after identity becomes unambiguous', async () => {
  const request = requestFixture();
  const payment = { id: 'p1', status: 'paid', nazrRequest: request, amount: request.amount };
  request.payments = [payment];
  const f = fixture({ requests: [request], payments: [payment], review: [request.trackingCode] });
  await f.service.syncNewNazr(request.id);
  await f.service.syncByPaymentId(payment.id);
  await f.service.reconcilePaid();
  await f.service.reconcileRequests();
  assert.equal(f.writes.length, 0);
});

test('a request snapshot cannot downgrade an already settled CRM payment', async () => {
  const request = { ...requestFixture(), status: 'cancelled' };
  const settled = { id: 'crm', tracking_code: request.trackingCode, paymentsstatus: 'پرداخت شده', cf_1764: 'نذر امام', amount_currency_value: 1200 };
  const f = fixture({ requests: [request], remote: [settled] });
  await f.service.syncNewNazr(request.id);
  assert.equal(f.writes.length, 0);
  assert.equal(settled.paymentsstatus, 'پرداخت شده');
});

test('cancellation is repaired but an unsafe historical amount is held without fabrication', async () => {
  const cancelled = { ...requestFixture(), status: 'cancelled' };
  const unsafe = { ...requestFixture('n2', 'NE-DEF456'), amount: { amount: 8e38, currency: 'IRT' } };
  const f = fixture({ requests: [cancelled, unsafe], remote: [{ id: 'crm', tracking_code: cancelled.trackingCode, paymentsstatus: 'در انتظار پرداخت', cf_1764: 'نذر امام', amount_currency_value: 1200 }] });
  await f.service.reconcileRequests();
  assert.equal(f.remote.length, 1);
  assert.equal(f.remote[0].paymentsstatus, 'لغو شده');
  assert.equal(f.service.retryNeeded, false, 'manual review must not produce rapid network retries');
});

test('one failing CRM page does not starve later requests or the next sweep', async () => {
  const requests = Array.from({ length: 41 }, (_, n) => requestFixture('n' + String(n).padStart(2, '0'), 'NE-TEST' + n));
  const f = fixture({ requests });
  const query = f.client.query;
  let failed = false;
  f.client.query = async sql => {
    if (sql.includes('tracking_code IN') && !failed) { failed = true; throw new Error('network down'); }
    return query(sql);
  };
  await f.service.reconcileRequests();
  assert.equal(f.remote.length, 1);
  assert.equal(f.service.retryNeeded, true);
  await f.service.reconcileRequests();
  assert.equal(f.remote.length, 41);
});

test('simultaneous different donors requests and signup reuse one contact under the shared lock', async () => {
  const r1 = requestFixture(), r2 = requestFixture('n2', 'NE-DEF456');
  const user = { id: 'u1', mobile: r1.donorMobile, fullName: r1.donorFullName, role: 'donor' };
  const f = fixture({ requests: [r1, r2], users: [user] });
  await Promise.all([f.service.syncNewNazr(r1.id), f.service.syncNewNazr(r2.id), f.service.syncUser(user.id), f.service.syncNewNazr(r1.id)]);
  assert.equal(f.contacts.length, 1);
  assert.equal(f.remote.length, 2);
});

test('a signup CRM outage is isolated and recovered by the persisted-user sweep', async () => {
  const user = { id: 'u1', mobile: '09000000000', fullName: 'تست', role: 'donor' };
  const f = fixture({ users: [user] });
  const query = f.client.query;
  f.client.query = async () => { throw new Error('timeout'); };
  await assert.doesNotReject(f.service.syncUser(user.id));
  assert.equal(f.service.retryNeeded, true);
  f.client.query = query;
  await f.service.reconcileUsers();
  assert.equal(f.contacts.length, 1);
});

test('Arabic and Persian formatted contact numbers reuse the original contact', async () => {
  for (const mobile of ['+۹۸ ۹۰۰ ۰۰۰ ۰۰۰۰', '٠٠٩٨٩٠٠٠٠٠٠٠٠٠']) {
    const contact = { id: 'existing', mobile, lastname: 'تست', cf_1756: 'بله' };
    const f = fixture({ contacts: [contact] });
    assert.equal(await f.service.upsertContact(requestFixture()), 'existing');
    assert.equal(f.writes.length, 0);
  }
});
