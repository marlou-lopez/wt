#!/usr/bin/env node
import { argv, chalk } from 'zx';
import { start } from './commands/start.js';
import { list } from './commands/list.js';
import { finish } from './commands/finish.js';
import { checkDependencies } from './utils.js';

const command = argv._[0];

try {
  switch (command) {
    case 'start':
      await start();
      break;
    case 'list':
    case 'ls':
      await list();
      break;
    case 'finish':
    case 'done':
      await finish();
      break;
    case 'doctor':
      await checkDependencies();
      console.log(chalk.green('\n✅ All checks passed! System is ready.'));
      break;
    default:
      console.log(chalk.bold('wt CLI'));
      console.log('Usage: wt [start | list | finish | doctor]');
  }
} catch (error: any) {
  if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
    console.log(chalk.yellow('\n\n🚫 Operation cancelled by user.'));
  } else {
    console.error(chalk.red('\nAn unexpected error occurred:'));
    console.error(error);
  }
  process.exit(1);
}

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🚫 Operation cancelled by user. Exiting...'));
  process.exit(0);
});

