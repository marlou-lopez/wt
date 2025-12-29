import { fs, path, $, chalk } from 'zx';
import { Config } from '../types.js';

export async function createWorktree(
  baseRepoPath: string,
  worktreePath: string,
  repoName: string, 
  ticketId: string
): Promise<string | null> {
  
  await fs.ensureDir(path.dirname(worktreePath));
  
  if (fs.existsSync(worktreePath)) {
    return null; 
  }

  try {
    await $`git -C ${baseRepoPath} worktree add -b ${ticketId} ${worktreePath}`;
    return worktreePath;
  } catch (e) {
    console.error(chalk.red(`Failed to create worktree for ${repoName}: ${e}`));
    throw e;
  }
}

export async function removeWorktree(baseRepoPath: string, worktreePath: string) {
  if (!fs.existsSync(worktreePath)) return;

  try {
    await $`git -C ${baseRepoPath} worktree remove ${worktreePath}`;
  } catch (e) {
    console.log(chalk.yellow(`⚠ standard remove failed. Force removing...`));
    await $`git -C ${baseRepoPath} worktree remove -f ${worktreePath}`;
    console.log(chalk.green(`✔ Force removed worktree`));
  }
  
  await fs.remove(worktreePath);
}

export async function copyEnv(baseRepoPath: string, worktreePath: string) {
  const baseEnvPath = path.join(baseRepoPath, '.env');
  if (fs.existsSync(baseEnvPath)) {
    await fs.copy(baseEnvPath, path.join(worktreePath, '.env'));
    return true;
  }
  return false;
}

export async function deleteBranch(baseRepoPath: string, branchName: string) {
  try {
    await $`git -C ${baseRepoPath} branch -D ${branchName}`;
  } catch (e) {
    console.error(chalk.red(`Failed to delete branch: ${branchName}`))
    throw e;
  }
}
