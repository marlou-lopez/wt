import { fs, path, chalk } from 'zx';
import { input, checkbox } from '@inquirer/prompts';
import { loadConfig, readTemplate, sanitizeTicketId } from '../utils.js';
import * as Note from '../services/note.js';
import * as Tmux from '../services/tmux.js';
import * as Git from '../services/git.js';

export async function start() {
  const config = await loadConfig();

  let ticketId = await input({
    message: 'Enter Ticket ID (e.g., PROJ-123):',
    required: true,
  });

  ticketId = sanitizeTicketId(ticketId)
  console.log(chalk.gray(`Using sanitized Ticket ID: ${ticketId}`));

  const selectedRepos = await checkbox<string>({
      message: 'Which repositories does this involve?',
      choices: Object.keys(config.repos),
    });

  if (selectedRepos.length === 0) {
    console.log(chalk.yellow('No repos selected. Just creating notes/session.'));
  }

  const sessionName = ticketId;

  console.log(chalk.blue(`\n🚀 Initializing workspace for ${ticketId}...`));

  const notePath = await Note.createNote(config, ticketId);
  if (notePath) console.log(`📄 Created Note: ${notePath}`);

  const sessionCreated = await Tmux.ensureSession(sessionName);
  if (sessionCreated) {
    console.log(chalk.green("Session created: ", sessionName))
    const noteFile = path.join(config.directory_roots.notes, ticketId + '.md');
    await Tmux.sendKeys(`${sessionName}:0`, `nvim ${noteFile}`);
  }

  for (const repoName of selectedRepos) {
    const repoConfig = config.repos[repoName];
    const baseRepoPath = path.join(config.directory_roots.repositories, repoConfig.path);
    const worktreePath = path.join(config.directory_roots.worktrees, repoConfig.path, ticketId);

    console.log(chalk.cyan(`\n[${repoName}] Setting up worktree...`));
    await Git.createWorktree(baseRepoPath, worktreePath, repoName, ticketId);

    const envCopied = await Git.copyEnv(baseRepoPath, worktreePath);
    if (!envCopied) {
      console.warn(chalk.yellow(`⚠️ No .env found in ${baseRepoPath}`));
    }

    const setupScriptPath = path.join(worktreePath, '.dev-init.sh');
    let scriptContent = await readTemplate('init.sh');
    
    const installCmd = repoConfig.manager === 'yarn' ? 'yarn install' : 'npm ci';

    scriptContent = scriptContent
      .replace('{{TICKET_ID}}', ticketId)
      .replace('{{INSTALL_CMD}}', installCmd);

    await fs.outputFile(setupScriptPath, scriptContent, { mode: 0o755 });

    await Tmux.createWindow(sessionName, repoName, worktreePath);
    
    await Tmux.sendKeys(`${sessionName}:${repoName}`, setupScriptPath);

  }

  console.log(chalk.green("\n✅ Setup complete!"));
}

