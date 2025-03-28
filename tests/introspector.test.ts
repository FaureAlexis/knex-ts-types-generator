import { describe, it, expect, vi, beforeEach } from 'vitest'
import { introspectSchema } from '../src/introspector'
import { db } from '../src/db'

// Mock the database module
vi.mock('../src/db', () => ({
  db: {
    raw: vi.fn()
  }
}))

describe('introspectSchema', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should introspect database schema correctly', async () => {
    // Mock table query results
    vi.mocked(db.raw).mockResolvedValueOnce({
      rows: [
        { table_name: 'users', table_schema: 'public' }
      ]
    })

    // Mock column query results
    vi.mocked(db.raw).mockResolvedValueOnce({
      rows: [
        {
          column_name: 'id',
          data_type: 'integer',
          udt_name: 'int4',
          is_nullable: 'NO',
          column_default: null,
          description: 'Primary key'
        },
        {
          column_name: 'email',
          data_type: 'character varying',
          udt_name: 'varchar',
          is_nullable: 'NO',
          column_default: null,
          description: null
        }
      ]
    })

    // Mock enum query results
    vi.mocked(db.raw).mockResolvedValueOnce({
      rows: [
        {
          typname: 'user_role',
          nspname: 'public',
          enumlabels: ['admin', 'user', 'guest']
        }
      ]
    })

    const schema = await introspectSchema()

    // Verify schema structure
    expect(schema.tables).toHaveLength(1)
    expect(schema.enums).toHaveLength(1)

    // Verify table data
    const table = schema.tables[0]
    expect(table.name).toBe('users')
    expect(table.schema).toBe('public')
    expect(table.columns).toHaveLength(2)

    // Verify column data
    const [idColumn, emailColumn] = table.columns
    expect(idColumn.name).toBe('id')
    expect(idColumn.type).toBe('int4')
    expect(idColumn.isNullable).toBe(false)
    expect(idColumn.comment).toBe('Primary key')

    expect(emailColumn.name).toBe('email')
    expect(emailColumn.type).toBe('varchar')
    expect(emailColumn.isNullable).toBe(false)

    // Verify enum data
    const enumType = schema.enums[0]
    expect(enumType.name).toBe('user_role')
    expect(enumType.schema).toBe('public')
    expect(enumType.values).toEqual(['admin', 'user', 'guest'])

    // Verify raw queries
    expect(db.raw).toHaveBeenCalledTimes(3)
  })

  it('should handle empty database schema', async () => {
    // Mock empty results
    vi.mocked(db.raw).mockResolvedValueOnce({ rows: [] }) // No tables
    vi.mocked(db.raw).mockResolvedValueOnce({ rows: [] }) // No enums

    const schema = await introspectSchema()

    expect(schema.tables).toHaveLength(0)
    expect(schema.enums).toHaveLength(0)
  })

  it('should handle database query errors', async () => {
    vi.mocked(db.raw).mockRejectedValueOnce(new Error('Database connection failed'))

    await expect(introspectSchema()).rejects.toThrow('Database connection failed')
  })
}) 