import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { db } from '../src/db'
import { generateTypes } from '../src/generator'
import path from 'path'
import chalk from 'chalk'
import ora from 'ora'

// Create a mock spinner instance
const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  info: vi.fn().mockReturnThis()
}

// Mock all dependencies
vi.mock('../src/db', () => ({
  db: {
    raw: vi.fn(),
    destroy: vi.fn()
  }
}))

vi.mock('../src/generator', () => ({
  generateTypes: vi.fn()
}))

vi.mock('ora', () => ({
  default: () => mockSpinner
}))

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('CLI', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.argv = ['node', 'cli.js'] // Reset argv
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should generate types with default options', async () => {
    // Set up mocks
    vi.mocked(db.raw).mockResolvedValueOnce(true)
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)
    vi.mocked(generateTypes).mockResolvedValueOnce(undefined)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    // Verify database connection was tested
    expect(db.raw).toHaveBeenCalledWith('SELECT 1')

    // Verify types were generated with default path
    const expectedPath = path.resolve(process.cwd(), './types/db.ts')
    expect(generateTypes).toHaveBeenCalledWith(expectedPath)

    // Verify spinner messages
    expect(mockSpinner.start).toHaveBeenCalledWith('Testing database connection')
    expect(mockSpinner.succeed).toHaveBeenCalledWith('Database connection successful')
    expect(mockSpinner.start).toHaveBeenCalledWith('Generating types')
    expect(mockSpinner.succeed).toHaveBeenCalledWith(
      chalk.green(`Types generated successfully at ${expectedPath}`)
    )

    // Verify cleanup
    expect(db.destroy).toHaveBeenCalled()
  })

  it('should handle custom output path', async () => {
    // Set custom output path
    process.argv.push('-o', './src/custom/types.ts')

    vi.mocked(db.raw).mockResolvedValueOnce(true)
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)
    vi.mocked(generateTypes).mockResolvedValueOnce(undefined)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    const expectedPath = path.resolve(process.cwd(), './src/custom/types.ts')
    expect(generateTypes).toHaveBeenCalledWith(expectedPath)
    expect(mockSpinner.succeed).toHaveBeenCalledWith(
      chalk.green(`Types generated successfully at ${expectedPath}`)
    )
  })

  it('should handle dry run mode', async () => {
    process.argv.push('--dry-run')

    vi.mocked(db.raw).mockResolvedValueOnce(true)
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)
    vi.mocked(generateTypes).mockResolvedValueOnce(undefined)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    expect(mockSpinner.info).toHaveBeenCalledWith('Dry run completed. No files were written.')
  })

  it('should handle database connection error', async () => {
    const dbError = new Error('Connection failed')
    vi.mocked(db.raw).mockRejectedValueOnce(dbError)
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('Error:'))
    expect(mockConsoleError).toHaveBeenCalledWith(chalk.red('Connection failed'))
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('should handle type generation error', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce(true)
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)
    
    const genError = new Error('Generation failed')
    vi.mocked(generateTypes).mockRejectedValueOnce(genError)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('Error:'))
    expect(mockConsoleError).toHaveBeenCalledWith(chalk.red('Generation failed'))
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('should handle unknown errors', async () => {
    vi.mocked(db.raw).mockRejectedValueOnce('Unknown error')
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('Error:'))
    expect(mockConsoleError).toHaveBeenCalledWith(chalk.red('An unknown error occurred'))
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('should always attempt to clean up database connection', async () => {
    vi.mocked(db.raw).mockRejectedValueOnce(new Error('Connection failed'))
    vi.mocked(db.destroy).mockResolvedValueOnce(undefined)

    // Import and wait for CLI execution
    const cliPromise = import('../src/cli')
    await new Promise(resolve => setTimeout(resolve, 100))
    await cliPromise

    expect(mockConsoleLog).toHaveBeenCalledWith('Cleaning up database connection')
    expect(db.destroy).toHaveBeenCalled()
  })

  it('should handle unhandled promise rejections', async () => {
    const unhandledError = new Error('Unhandled error')
    const rejectedPromise = Promise.reject(unhandledError)
    
    // Get the actual handler from the process
    const rejectionHandlers = process.listeners('unhandledRejection')
    const handler = rejectionHandlers[rejectionHandlers.length - 1]
    
    // Call the handler directly with both required arguments
    handler(unhandledError, rejectedPromise)

    // Catch the rejected promise to prevent unhandled rejection
    rejectedPromise.catch(() => {})

    expect(mockConsoleError).toHaveBeenCalledWith(chalk.red('Unhandled promise rejection:'))
    expect(mockConsoleError).toHaveBeenCalledWith(unhandledError)
    expect(mockExit).toHaveBeenCalledWith(1)
  })
}) 