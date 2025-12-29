
export interface RepoConfig {
  path: string;
  manager: 'npm' | 'yarn' | 'pnpm';
}

export interface Config {
  directory_roots: {
    repositories: string;
    worktrees: string;
    notes: string;
  };
  repos: Record<string, RepoConfig>;
}

type TicketStatus = 'done' | 'in_progress' | 'blocked' | 'todo' | 'unknown'

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  filePath: string;
  updatedAt: Date;
  frontmatter: any;
  content: string;
  closed_at?: Date;
}
