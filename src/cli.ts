#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { generateTypes } from './generator';
import { createDbConnection } from './db';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .options({
      output: {
        alias: 'o',
        type: 'string',
        description: 'Output file path',
        default: './types/db.ts',
        normalize: true,
      },
      schema: {
        alias: 's',
        type: 'string',
        description: 'Database schema to introspect',
        default: 'public',
      },
      'dry-run': {
        type: 'boolean',
        description: 'Show what would be generated without writing to file',
        default: false,
      },
      host: {
        alias: 'h',
        type: 'string',
        description: 'Database host',
        default: process.env.DB_HOST || 'localhost',
      },
      port: {
        alias: 'p',
        type: 'number',
        description: 'Database port',
        default: parseInt(process.env.DB_PORT || '5432'),
      },
      user: {
        alias: 'u',
        type: 'string',
        description: 'Database user',
        default: process.env.DB_USER || 'postgres',
      },
      password: {
        type: 'string',
        description: 'Database password',
        default: process.env.DB_PASSWORD,
      },
      database: {
        alias: 'd',
        type: 'string',
        description: 'Database name',
        default: process.env.DB_DATABASE,
      },
    })
    .example('$0', 'Generate types using default settings')
    .example('$0 -o ./src/types/db.ts', 'Generate types to a custom location')
    .example('$0 --dry-run', 'Preview the generated types without writing to file')
    .example('$0 -h localhost -p 5432 -u myuser -d mydb', 'Connect to a specific database')
    .epilogue('For more information, check out the documentation at https://github.com/FaureAlexis/knex-ts-types-generator')
    .help()
    .version()
    .argv;

  const spinner = ora();

  try {
    // Create database connection with CLI args
    const db = createDbConnection({
      host: argv.host,
      port: argv.port,
      user: argv.user,
      password: argv.password || '',
      database: argv.database || '',
    });

    // Test database connection
    spinner.start('Testing database connection');
    await db.raw('SELECT 1');
    spinner.succeed('Database connection successful');

    // Generate types
    spinner.start('Generating types');
    const outputPath = path.resolve(process.cwd(), argv.output);
    await generateTypes(outputPath, db, argv.schema);
    
    if (argv['dry-run']) {
      spinner.info('Dry run completed. No files were written.');
    } else {
      spinner.succeed(chalk.green(`Types generated successfully at ${outputPath}`));
    }

    // Clean up database connection
    await db.destroy();

  } catch (error) {
    spinner.fail(chalk.red('Error:'));
    
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
      if (error.stack) {
        console.error(chalk.gray(error.stack.split('\n').slice(1).join('\n')));
      }
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled promise rejection:'));
  console.error(error);
  process.exit(1);
});

main(); 