import { fs, path, chalk } from 'zx';
import { loadConfig, readTemplate, sanitizeTicketId } from '../utils.js';
import * as Note from '../services/note.js';
import * as Tmux from '../services/tmux.js';
import * as Git from '../services/git.js';
import { cancel, isCancel, multiselect, text, log } from '@clack/prompts';

export async function start() {
  const config = await loadConfig();

  let ticketId = await text({
    message: 'Enter Ticket ID:',
    placeholder: 'PROJ-123',
    validate(value) {
      if (value.length === 0) return `Value is required!`;
    },
  });

  if (isCancel(ticketId)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
  ticketId = sanitizeTicketId(ticketId);

  const selectedRepos = await multiselect({
    message: 'Which repositories does this involve?',
    options: Object.keys(config.repos).map((repo) => ({ value: repo, label: repo })),
  });

  if (isCancel(selectedRepos)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  if (selectedRepos.length === 0) {
    log.warn(chalk.yellow('No repos selected. Just creating notes/session.'));
  }

  const sessionName = ticketId;

  log.message(chalk.blue(`🚀 Initializing workspace for ${ticketId}...`));

  const notePath = await Note.createNote(config, ticketId);
  if (notePath) log.message(`📄 Created Note: ${notePath}`);

  const sessionCreated = await Tmux.ensureSession(sessionName);
  if (sessionCreated) {
    log.message(chalk.green('Session created: ', sessionName));
    const noteFile = path.join(config.directory_roots.notes, ticketId + '.md');
    await Tmux.sendKeys(`${sessionName}:0`, `nvim ${noteFile}`);
  }

  for (const repoName of selectedRepos) {
    const repoConfig = config.repos[repoName];
    const baseRepoPath = path.join(config.directory_roots.repositories, repoConfig.path);
    const worktreePath = path.join(config.directory_roots.worktrees, repoConfig.path, ticketId);

    log.message(chalk.cyan(`[${repoName}] Setting up worktree...`));
    await Git.createWorktree(baseRepoPath, worktreePath, repoName, ticketId);

    const envCopied = await Git.copyEnv(baseRepoPath, worktreePath);
    if (!envCopied) {
      log.warn(chalk.yellow(`No .env found in ${baseRepoPath}`));
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

  log.success(chalk.green('Setup complete!'));
}
