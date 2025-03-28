import { describe, it, expect } from 'vitest'
import { DatabaseSchema, DatabaseTable, DatabaseColumn, DatabaseEnum, RawColumn, RawEnum } from '../src/types'

describe('Types', () => {
  describe('DatabaseColumn', () => {
    it('should create a valid column', () => {
      const column: DatabaseColumn = {
        name: 'id',
        type: 'integer',
        isNullable: false,
        defaultValue: null,
        comment: 'Primary key'
      }
      expect(column.name).toBe('id')
      expect(column.type).toBe('integer')
      expect(column.isNullable).toBe(false)
      expect(column.defaultValue).toBeNull()
      expect(column.comment).toBe('Primary key')
    })
  })

  describe('DatabaseTable', () => {
    it('should create a valid table with columns', () => {
      const table: DatabaseTable = {
        name: 'users',
        schema: 'public',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isNullable: false,
            defaultValue: null
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: false,
            defaultValue: null
          }
        ]
      }
      expect(table.name).toBe('users')
      expect(table.schema).toBe('public')
      expect(table.columns).toHaveLength(2)
      expect(table.columns[0].name).toBe('id')
      expect(table.columns[1].name).toBe('email')
    })
  })

  describe('DatabaseEnum', () => {
    it('should create a valid enum', () => {
      const dbEnum: DatabaseEnum = {
        name: 'user_role',
        schema: 'public',
        values: 'admin,user,guest'
      }
      expect(dbEnum.name).toBe('user_role')
      expect(dbEnum.schema).toBe('public')
      expect(dbEnum.values).toBe('admin,user,guest')
    })
  })

  describe('DatabaseSchema', () => {
    it('should create a valid schema with tables and enums', () => {
      const schema: DatabaseSchema = {
        tables: [
          {
            name: 'users',
            schema: 'public',
            columns: [
              {
                name: 'id',
                type: 'integer',
                isNullable: false,
                defaultValue: null
              }
            ]
          }
        ],
        enums: [
          {
            name: 'user_role',
            schema: 'public',
            values: 'admin,user,guest'
          }
        ]
      }
      expect(schema.tables).toHaveLength(1)
      expect(schema.enums).toHaveLength(1)
      expect(schema.tables[0].name).toBe('users')
      expect(schema.enums[0].name).toBe('user_role')
    })
  })

  describe('Raw Types', () => {
    it('should create valid raw column data', () => {
      const rawColumn: RawColumn = {
        column_name: 'id',
        data_type: 'integer',
        udt_name: 'int4',
        is_nullable: 'NO',
        column_default: null,
        description: 'Primary key'
      }
      expect(rawColumn.column_name).toBe('id')
      expect(rawColumn.is_nullable).toBe('NO')
    })

    it('should create valid raw enum data', () => {
      const rawEnum: RawEnum = {
        typname: 'user_role',
        nspname: 'public',
        enumlabels: 'admin,user,guest'
      }
      expect(rawEnum.typname).toBe('user_role')
      expect(rawEnum.enumlabels).toBe('admin,user,guest')
    })
  })
}) 