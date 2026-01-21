import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateMatchStatistics1768945408414 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'match_statistics',
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
            isUnique: true,
          },
          {
            name: 'home_possession',
            type: 'int',
            default: 50,
          },
          {
            name: 'away_possession',
            type: 'int',
            default: 50,
          },
          {
            name: 'home_shots',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_shots',
            type: 'int',
            default: 0,
          },
          {
            name: 'home_shots_on_target',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_shots_on_target',
            type: 'int',
            default: 0,
          },
          {
            name: 'home_passes',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_passes',
            type: 'int',
            default: 0,
          },
          {
            name: 'home_passes_completed',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_passes_completed',
            type: 'int',
            default: 0,
          },
          {
            name: 'home_fouls',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_fouls',
            type: 'int',
            default: 0,
          },
          {
            name: 'home_corners',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_corners',
            type: 'int',
            default: 0,
          },
          {
            name: 'home_offsides',
            type: 'int',
            default: 0,
          },
          {
            name: 'away_offsides',
            type: 'int',
            default: 0,
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
      'match_statistics',
      new TableForeignKey({
        columnNames: ['match_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'matches',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('match_statistics', true);
  }
}
