const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { DataSource, QueryResult } = require('typeorm');
const { AdminService } = require('../dist/modules/admin/admin.service');
const { PaymentEntity } = require('../dist/modules/payments/entities/payment.entity');
const { NazrRequestEntity } = require('../dist/modules/nazr-requests/entities/nazr-request.entity');

test('joined admin lists paginate and sort JSON amounts using the real MySQL query builder', async t => {
  // Build entity metadata without connecting to a database. Only query execution
  // is stubbed, so TypeORM's DISTINCT/pagination alias parsing still runs.
  const source = new DataSource({
    type: 'mysql', database: 'nazr_test',
    entities: [path.join(__dirname, '../dist/**/*.entity.js')],
  });
  await source.buildMetadatas();
  for (const [method, entity, repo] of [
    ['payments', PaymentEntity, 'paymentsRepo'],
    ['requests', NazrRequestEntity, 'requestsRepo'],
  ]) {
    for (const sort of ['amount_asc', 'amount_desc', 'date_asc', undefined]) {
      await t.test(`${method}: ${sort ?? 'newest first'}`, async () => {
        const sql = [];
        const runner = source.createQueryRunner();
        runner.query = async statement => {
          sql.push(statement);
          const result = new QueryResult();
          result.records = statement.includes('COUNT(') ? [{ cnt: 0 }] : [];
          result.raw = result.records;
          return result;
        };
        const service = Object.create(AdminService.prototype);
        service[repo] = { createQueryBuilder: alias => source.getRepository(entity).createQueryBuilder(alias, runner) };
        const result = method === 'payments'
          ? await service.payments(2, 20, '', 'paid', undefined, undefined, { sort })
          : await service.requests(2, 20, '', undefined, { sort });
        assert.equal(result.page, 2);
        assert.deepEqual(result.items, []);
        const pageQuery = sql.find(value => value.startsWith('SELECT DISTINCT'));
        assert.ok(pageQuery, 'joined pagination must execute its DISTINCT query');
        assert.match(pageQuery, /LIMIT 20 OFFSET 20/);
        if (sort?.startsWith('amount_')) {
          assert.match(pageQuery, /JSON_EXTRACT/);
          assert.match(pageQuery, /AS `admin_sort_amount`/);
          assert.match(pageQuery, new RegExp('ORDER BY `distinctAlias`\\.`admin_sort_amount` ' + (sort === 'amount_asc' ? 'ASC' : 'DESC')));
        }
      });
    }
  }
});
