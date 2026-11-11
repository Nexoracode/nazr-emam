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
      if (sql.includes('FROM Contacts')) return [{ id: 'contact', mobile: request.donorMobile }];
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
    { id: 'c1', mobile: '+989000000000', firstname: 'یک', lastname: 'فرد' },
    { id: 'c2', mobile: '09000000000', firstname: 'دیگر', lastname: 'فرد' },
  ];
  const client = { query: async () => contacts, create: () => assert.fail() };
  const service = new CrmSyncService(client, {}, {}, {});
  const donor = { donorMobile: '09000000000', donorFullName: 'یک فرد' };
  assert.equal(await service.upsertContact(donor), 'c1');
  contacts[1].firstname = contacts[0].firstname;
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
