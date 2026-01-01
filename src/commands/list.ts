import { chalk, $ } from 'zx';
import { cancel, isCancel, log, select } from '@clack/prompts'
import { loadConfig, getTickets } from '../utils.js';
import { getSessionName } from '../services/tmux.js';

export async function list() {
  const config = await loadConfig();

  const tickets = await getTickets(config);

  if (tickets.length === 0) {
    log.warn(chalk.yellow('No active tickets found.'));
    process.exit(0);
  }

  const choices = tickets.map((ticket) => {
    let icon = '⚪';
    if (ticket.status === 'in_progress') icon = '🚧';
    if (ticket.status === 'blocked') icon = '🛑';
    if (ticket.status === 'todo') icon = '🔵';

    return {
      label: `${icon} ${ticket.id}`,
      value: ticket.id,
    };
  });

  const ticketId = await select({
    message: 'Select a ticket to resume:',
    options: choices
  });

  if (isCancel(ticketId)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  try {
    await $`tmux has-session -t ${getSessionName(ticketId)}`;
  } catch {
    log.error(chalk.red(`Session '${ticketId}' is not running.`));
    process.exit(0);
  }

  // If session exists, switch to it
  log.message(chalk.green(`Switching to ${ticketId}...`));

  if (process.env.TMUX) {
    // If we are already inside tmux, switch client
    await $`tmux switch-client -t ${getSessionName(ticketId)}:0`;
  } else {
    // If we are in normal terminal, attach
    await $`tmux attach -t ${getSessionName(ticketId)}:0`;
  }
}
