import { fs, path, chalk } from 'zx';
import matter from 'gray-matter';
import { select, confirm } from '@inquirer/prompts';
import { loadConfig, getTickets } from '../utils.js'
import * as Tmux from '../services/tmux.js';
import * as Git from '../services/git.js';
import { Ticket } from '../types.js';

export async function finish() {
  const config = await loadConfig();

  const tickets = await getTickets(config);

  if (tickets.length === 0) {
    console.log(chalk.green('No active tickets to finish! Good job.'));
    process.exit(0);
  }

  const ticketId = await select<string>({
    message: 'Select a ticket to FINISH (Archive & Cleanup):',
    choices: tickets.map((ticket) => ({
      name: `${ticket.id} - ${ticket.status}`,
      value: ticket.id
    }))
  });

  const selectedTicket = tickets.find((ticket) => ticket.id === ticketId);
  if (!selectedTicket) return; 

  const userConfirmation = await confirm({
    message: `Are you sure you want to close ${ticketId}? (This will kill the tmux session and remove worktrees)`,
    default: false
  });

  if (!userConfirmation) process.exit(0);

  await Tmux.killSession(ticketId);
  console.log(chalk.green(`✔ Killed Tmux session: ${ticketId}`));

  // We loop through ALL repos defined in config to check if a worktree exists for this ticket
  for (const [repoName, repoConfig] of Object.entries(config.repos)) {
    const baseRepo = path.join(config.directory_roots.repositories, repoConfig.path);
    const worktreePath = path.join(config.directory_roots.worktrees, repoConfig.path, ticketId.toString());
    
    if (fs.existsSync(worktreePath)) {
      console.log(chalk.blue(`\nCleaning up ${repoName}...`));
      
      await Git.removeWorktree(baseRepo, worktreePath);
      console.log(chalk.green(`✔ Removed worktree`));

      const deleteBranchConfirmation = await confirm({
        message: `Delete local branch '${ticketId}' in ${repoName}?`,
        default: true
      });

      if (deleteBranchConfirmation) {
        try {
            await Git.deleteBranch(baseRepo, ticketId);
            console.log(chalk.green(`✔ Deleted branch ${ticketId}`));
        } catch (e) {
            console.log(chalk.red(`Failed to delete branch (maybe it doesn't exist)`));
        }
      }
    }
  }

  console.log(chalk.blue(`\n📝 Archiving note...`));
  
  const newFrontmatter: Ticket = {
      ...selectedTicket.frontmatter,
      status: 'done',
      closed_at: new Date().toISOString()
  };
  
  const newContent = matter.stringify(selectedTicket.content, newFrontmatter);
  await fs.writeFile(selectedTicket.filePath, newContent);
  
  console.log(chalk.green(`✔ Ticket ${ticketId} marked as Done!`));

}
