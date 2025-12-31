import { chalk, fs, os, path, $ } from 'zx';
import matter from 'gray-matter';
import { Config, Ticket } from './types.js';
import { fileURLToPath } from 'node:url';

export const CONFIG_PATH = path.join(os.homedir(), '.config/wt/config.json');

export async function loadConfig(): Promise<Config> {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(chalk.red(`Error: Config file not found at ${CONFIG_PATH}`));
    process.exit(1);
  }
  return fs.readJson(CONFIG_PATH);
}

// Get the directory of the currently running script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readTemplate(filename: string): Promise<string> {
  const locations = [
    path.resolve(__dirname, '../templates', filename),
    path.resolve(__dirname, 'templates', filename),
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return fs.readFile(loc, 'utf-8');
    }
  }

  throw new Error(`Template not found. Searched in: ${locations.join(', ')}`);
}

export async function getTickets(config: Config): Promise<Ticket[]> {
  const notesDir = config.directory_roots.notes;
  const files = await fs.readdir(notesDir);
  const tickets: Ticket[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(notesDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);
    const data = parsed.data;

    if (data.type === 'ticket' && data.status !== 'done') {
      const h1Match = parsed.content.match(/^#\s+(.*)/m);
      const title = data.title || (h1Match ? h1Match[1] : 'No Title');
      const mtime = (await fs.stat(filePath)).mtime;

      tickets.push({
        id: data.id || path.basename(file, '.md'),
        title,
        status: data.status || 'unknown',
        filePath,
        updatedAt: mtime,
        frontmatter: data,
        content: parsed.content,
      });
    }
  }

  tickets.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return tickets;
}

export function sanitizeTicketId(id: string): string {
  return id
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toUpperCase();
}

export async function checkDependencies() {
  const deps = ['git', 'tmux', 'nvim'];
  const missing = [];

  for (const dep of deps) {
    try {
      await $`which ${dep}`;
    } catch {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    console.error(chalk.red(`\n❌ Missing required dependencies: ${missing.join(', ')}`));
    console.error(chalk.yellow(`Please install them before using dev-flow.`));
    process.exit(1);
  }
}
