import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableRLS1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // These policies are only valid for PostgreSQL. We ensure this migration is safely executed.
    if (queryRunner.connection.options.type !== 'postgres') {
      return;
    }

    await queryRunner.query(`ALTER TABLE cart_item ENABLE ROW LEVEL SECURITY;`);

    await queryRunner.query(`
      CREATE POLICY "Cart owner policy SELECT" ON cart_item
      FOR SELECT
      USING (user_id::text = current_setting('app.current_user_id', true));
    `);

    await queryRunner.query(`
      CREATE POLICY "Cart owner policy INSERT" ON cart_item
      FOR INSERT
      WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
    `);

    await queryRunner.query(`
      CREATE POLICY "Cart owner policy UPDATE" ON cart_item
      FOR UPDATE
      USING (user_id::text = current_setting('app.current_user_id', true))
      WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
    `);

    await queryRunner.query(`
      CREATE POLICY "Cart owner policy DELETE" ON cart_item
      FOR DELETE
      USING (user_id::text = current_setting('app.current_user_id', true));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') {
      return;
    }
    await queryRunner.query(
      `DROP POLICY "Cart owner policy SELECT" ON cart_item;`,
    );
    await queryRunner.query(
      `DROP POLICY "Cart owner policy INSERT" ON cart_item;`,
    );
    await queryRunner.query(
      `DROP POLICY "Cart owner policy UPDATE" ON cart_item;`,
    );
    await queryRunner.query(
      `DROP POLICY "Cart owner policy DELETE" ON cart_item;`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_item DISABLE ROW LEVEL SECURITY;`,
    );
  }
}
