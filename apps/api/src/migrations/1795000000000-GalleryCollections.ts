import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class GalleryCollections1795000000000 implements MigrationInterface {
  private readonly columns = [
    new TableColumn({ name: 'collection_title', type: 'varchar', length: '80', isNullable: true }),
    new TableColumn({ name: 'cover_selected_at', type: 'datetime', precision: 3, isNullable: true }),
  ];

  async up(runner: QueryRunner): Promise<void> {
    for (const column of this.columns) {
      if (!(await runner.hasColumn('gallery_assets', column.name))) {
        await runner.addColumn('gallery_assets', column);
      }
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    for (const column of this.columns) {
      if (await runner.hasColumn('gallery_assets', column.name)) {
        await runner.dropColumn('gallery_assets', column.name);
      }
    }
  }
}
