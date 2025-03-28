import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import * as path from 'path'
import { generateTypes } from '../src/generator'
import * as fs from 'fs/promises'
import { introspectSchema } from '../src/introspector'
import dotenv from 'dotenv'

// Mock fs and introspectSchema
vi.mock('fs/promises')
vi.mock('../src/introspector')

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

beforeAll(() => {
  // Load test environment variables
  dotenv.config({ path: '.env.test' })
})

afterAll(() => {
  // Restore process.exit
  mockExit.mockRestore()
})

describe('generateTypes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Mock mkdir to do nothing
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    // Mock writeFile to do nothing
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
  })

  it('should generate type definitions correctly', async () => {
    // Mock schema data
    const mockSchema = {
      tables: [
        {
          name: 'users',
          schema: 'public',
          columns: [
            {
              name: 'id',
              type: 'int4',
              isNullable: false,
              defaultValue: null,
              comment: 'Primary key'
            },
            {
              name: 'email',
              type: 'varchar',
              isNullable: false,
              defaultValue: null
            },
            {
              name: 'role',
              type: 'user_role',
              isNullable: true,
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

    vi.mocked(introspectSchema).mockResolvedValue(mockSchema)

    // Call generateTypes
    await generateTypes('types.ts')

    // Verify fs.writeFile was called
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
    
    // Get the content that was written
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string
    
    // Verify content includes expected type definitions
    expect(writtenContent).toContain('export type user_role =')
    expect(writtenContent).toContain("'admin' |")
    expect(writtenContent).toContain('export interface users')
    expect(writtenContent).toContain('id: number')
    expect(writtenContent).toContain('email: string')
    expect(writtenContent).toContain('role: user_role | null')
    expect(writtenContent).toContain('interface Tables')

    // More specific assertions about the generated content
    const lines = writtenContent.split('\n')
    const roleTypeLine = lines.find(line => line.trim().startsWith('role:'))
    expect(roleTypeLine?.trim()).toBe('role: user_role | null;')
  })

  it('should create output directory if it does not exist', async () => {
    vi.mocked(introspectSchema).mockResolvedValue({ tables: [], enums: [] })
    
    await generateTypes('types/types.ts')
    
    expect(fs.mkdir).toHaveBeenCalledWith('types', { recursive: true })
  })

  it('should handle empty schema', async () => {
    vi.mocked(introspectSchema).mockResolvedValue({ tables: [], enums: [] })
    
    await generateTypes('types.ts')
    
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string
    expect(writtenContent).toContain('// This file is auto-generated')
    expect(writtenContent).toContain('interface Tables')
  })
}) 