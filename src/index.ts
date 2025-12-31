#!/usr/bin/env node
import { argv, chalk, $ } from 'zx';
import { start } from './commands/start.js';
import { list } from './commands/list.js';
import { finish } from './commands/finish.js';
import { checkDependencies } from './utils.js';
import { cancel, intro, log } from '@clack/prompts';

const command = argv._[0];

$.quiet = true;
intro(chalk.hex("#ff8700").bold(' wt - Worktree Session '))
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
      log.success(chalk.green('All checks passed! System is ready.'));
      break;
    default:
      log.info(chalk.bold('Usage: wt [start | list | finish | doctor]'));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (error: any) {
  if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
    cancel("Operation cancelled.")
  } else {
    log.error(chalk.red('An unexpected error occurred:'));
    log.error(error);
  }
  process.exit(1);
}

process.on('SIGINT', () => {
  // console.log(chalk.yellow('\n\n🚫 Operation cancelled by user. Exiting...'));
  process.exit(0);
});
