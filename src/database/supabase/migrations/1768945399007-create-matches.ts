import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMatches1768945399007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'matches',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'home_team',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'away_team',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'home_score',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_score',
            type: 'int',
            default: 0,
          },
          {
            name: 'minute',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'NOT_STARTED'",
          },
          {
            name: 'kickoff_time',
            type: 'bigint',
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

    await queryRunner.createIndex(
      'matches',
      new TableIndex({
        name: 'IDX_matches_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('matches', true);
  }
}
