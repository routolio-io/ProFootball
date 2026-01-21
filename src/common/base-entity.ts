import {
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export abstract class BaseEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('bigint')
  created_at: number;

  @Column('bigint', { nullable: true })
  updated_at?: number;

  @BeforeInsert()
  setCreatedAt() {
    this.created_at = Math.floor(Date.now() / 1000);
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updated_at = Math.floor(Date.now() / 1000);
  }

  toDto(): T {
    // This will be overridden by entities using @UseDto decorator
    return this as unknown as T;
  }
}
