import { fs, path } from 'zx';
import { Config } from '../types.js';
import { readTemplate } from '../utils.js';

export async function createNote(config: Config, ticketId: string): Promise<string | null> {
  const notePath = path.join(config.directory_roots.notes, `${ticketId}.md`);
  
  if (fs.existsSync(notePath)) return null;

  let noteContent = await readTemplate('note.md');
  noteContent = noteContent
    .replace(/{{TICKET_ID}}/g, ticketId)
    .replace('{{DATE}}', new Date().toISOString());

  await fs.outputFile(notePath, noteContent);
  return notePath;
}
