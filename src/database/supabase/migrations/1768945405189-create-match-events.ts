import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateMatchEvents1768945405189 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'match_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'match_id',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'minute',
            type: 'int',
          },
          {
            name: 'team',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'player',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'bigint',
          },
          {
            name: 'updated_at',
            type: 'bigint',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'match_events',
      new TableForeignKey({
        columnNames: ['match_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'matches',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'match_events',
      new TableIndex({
        name: 'IDX_match_events_match_minute',
        columnNames: ['match_id', 'minute'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('match_events', true);
  }
}
