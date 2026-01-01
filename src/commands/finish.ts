import { fs, path, chalk } from 'zx';
import matter from 'gray-matter';
import { loadConfig, getTickets } from '../utils.js';
import * as Tmux from '../services/tmux.js';
import * as Git from '../services/git.js';
import { Ticket } from '../types.js';
import { cancel, isCancel, log, select, confirm } from '@clack/prompts';

export async function finish() {
  const config = await loadConfig();

  const tickets = await getTickets(config);

  if (tickets.length === 0) {
    log.success(chalk.green('No active tickets to finish! Good job.'));
    process.exit(0);
  }

  const ticketId = await select({
    message: 'Select a ticket to FINISH (Archive & Cleanup):',
    options: tickets.map((ticket) => ({
      label: `${ticket.id} - ${ticket.status}`,
      value: ticket.id,
    })),
  });

  if (isCancel(ticketId)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  const selectedTicket = tickets.find((ticket) => ticket.id === ticketId);
  if (!selectedTicket) return;

    const userConfirmation = await confirm({message: `Are you sure you want to close ${ticketId}? (This will kill the tmux session and remove worktrees)` });

  if (!userConfirmation) process.exit(0);

  await Tmux.killSession(ticketId);
  log.message(chalk.green(`✔ Killed Tmux session: ${ticketId}`));

  // We loop through ALL repos defined in config to check if a worktree exists for this ticket
  for (const [repoName, repoConfig] of Object.entries(config.repos)) {
    const baseRepo = path.join(config.directory_roots.repositories, repoConfig.path);
    const worktreePath = path.join(
      config.directory_roots.worktrees,
      repoConfig.path,
      ticketId.toString()
    );

    if (fs.existsSync(worktreePath)) {
      log.message(chalk.blue(`Cleaning up ${repoName}...`));

      await Git.removeWorktree(baseRepo, worktreePath);
      log.message(chalk.green(`✔ Removed worktree`));

      const deleteBranchConfirmation = await confirm({message: `Delete local branch '${ticketId}' in ${repoName}?` })

      if (deleteBranchConfirmation) {
        try {
          await Git.deleteBranch(baseRepo, ticketId);
          log.message(chalk.green(`✔ Deleted branch ${ticketId}`));
        } catch {
          log.error(chalk.red(`Failed to delete branch (maybe it doesn't exist)`));
        }
      }
    }
  }

  log.message(chalk.blue(`📝 Archiving note...`));

  const newFrontmatter: Partial<Ticket> = {
    ...selectedTicket.frontmatter,
    status: 'done',
    closed_at: new Date(),
  };

  const newContent = matter.stringify(selectedTicket.content, newFrontmatter);
  await fs.writeFile(selectedTicket.filePath, newContent);

  log.success(chalk.green(`✔ Ticket ${ticketId} marked as Done!`));
}
