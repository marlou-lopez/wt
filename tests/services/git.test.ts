import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWorktree, removeWorktree, copyEnv, deleteBranch } from '../../src/services/git';
import { fs, path, $, os } from 'zx';

$.verbose = false;

describe('git services (integration)', () => {
  let tempDir: string;
  let baseRepoPath: string;
  let worktreesDir: string;
  const repoName = 'test-repo';
  const ticketId = 'TICKET-123';

  beforeEach(async () => {
    // Create a temporary directory for the test environment
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-test-'));
    baseRepoPath = path.join(tempDir, 'repo');
    worktreesDir = path.join(tempDir, 'worktrees');

    // Setup a real git repo
    await fs.ensureDir(baseRepoPath);
    await $`git init ${baseRepoPath}`;

    // Configure git for the temp repo to allow commits
    await $`git -C ${baseRepoPath} config user.email "test@example.com"`;
    await $`git -C ${baseRepoPath} config user.name "Test User"`;

    // Create an initial commit so we have a valid HEAD
    await fs.writeFile(path.join(baseRepoPath, 'README.md'), '# Test Repo');
    await $`git -C ${baseRepoPath} add README.md`;
    await $`git -C ${baseRepoPath} commit -m "Initial commit"`;
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('createWorktree', () => {
    it('should create a real git worktree', async () => {
      const worktreePath = path.join(worktreesDir, ticketId);

      const result = await createWorktree(baseRepoPath, worktreePath, repoName, ticketId);

      expect(result).toBe(worktreePath);
      expect(fs.existsSync(worktreePath)).toBe(true);
      expect(fs.existsSync(path.join(worktreePath, '.git'))).toBe(true);

      const branches = (await $`git -C ${baseRepoPath} branch`).stdout;
      expect(branches).toContain(ticketId);
    });

    it('should return null if worktree path already exists', async () => {
      const worktreePath = path.join(worktreesDir, ticketId);

      await fs.ensureDir(worktreePath);

      const result = await createWorktree(baseRepoPath, worktreePath, repoName, ticketId);

      expect(result).toBeNull();
    });
  });

  describe('removeWorktree', () => {
    it('should remove an existing worktree', async () => {
      const worktreePath = path.join(worktreesDir, ticketId);

      await createWorktree(baseRepoPath, worktreePath, repoName, ticketId);
      expect(fs.existsSync(worktreePath)).toBe(true);

      await removeWorktree(baseRepoPath, worktreePath);

      expect(fs.existsSync(worktreePath)).toBe(false);

      const worktreeList = (await $`git -C ${baseRepoPath} worktree list`).stdout;
      expect(worktreeList).not.toContain(worktreePath);
    });

    it('should handle non-existent worktree gracefully', async () => {
      const nonExistentPath = path.join(worktreesDir, 'fake');
      await removeWorktree(baseRepoPath, nonExistentPath);
      expect(fs.existsSync(nonExistentPath)).toBe(false);
    });
  });

  describe('copyEnv', () => {
    it('should copy .env file if it exists in base repo', async () => {
      const worktreePath = path.join(worktreesDir, ticketId);
      await fs.ensureDir(worktreePath);

      // Create .env in base repo
      await fs.writeFile(path.join(baseRepoPath, '.env'), 'SECRET=true');

      const result = await copyEnv(baseRepoPath, worktreePath);

      expect(result).toBe(true);
      expect(fs.existsSync(path.join(worktreePath, '.env'))).toBe(true);
      const content = await fs.readFile(path.join(worktreePath, '.env'), 'utf-8');
      expect(content).toBe('SECRET=true');
    });

    it('should return false if .env does not exist', async () => {
      const worktreePath = path.join(worktreesDir, ticketId);
      await fs.ensureDir(worktreePath);

      const result = await copyEnv(baseRepoPath, worktreePath);

      expect(result).toBe(false);
      expect(fs.existsSync(path.join(worktreePath, '.env'))).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    it('should delete a git branch', async () => {
      await $`git -C ${baseRepoPath} branch ${ticketId}`;
      let branches = (await $`git -C ${baseRepoPath} branch`).stdout;
      expect(branches).toContain(ticketId);

      await deleteBranch(baseRepoPath, ticketId);

      branches = (await $`git -C ${baseRepoPath} branch`).stdout;
      expect(branches).not.toContain(ticketId);
    });
  });
});
