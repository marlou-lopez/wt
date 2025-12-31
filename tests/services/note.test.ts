import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNote } from '../../src/services/note';
import { fs, path, os } from 'zx';
import * as utils from '../../src/utils';
import { Config } from '../../src/types';

vi.mock('../../src/utils', async () => {
  return {
    // TODO: Use actual implementation of readTemplate
    // implementation relies on finding the template
    // relative to __dirname
    // Might change when custom templates are implemented
    readTemplate: vi.fn(),
  };
});

describe('createNote (integration)', () => {
  let tempDir: string;
  let notesDir: string;
  let mockConfig: Config;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-test-'));
    notesDir = path.join(tempDir, 'notes');
    await fs.ensureDir(notesDir);

    mockConfig = {
      directory_roots: {
        notes: notesDir,
      },
    } as unknown as Config;
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.clearAllMocks();
  });

  it('should create a new note file on disk', async () => {
    const ticketId = 'TICKET-123';
    const expectedPath = path.join(notesDir, 'TICKET-123.md');

    (utils.readTemplate as any).mockResolvedValue(
      '---\nticket: {{TICKET_ID}}\ndate: {{DATE}}\n---'
    );

    const result = await createNote(mockConfig, ticketId);

    expect(result).toBe(expectedPath);

    expect(fs.existsSync(expectedPath)).toBe(true);

    const content = await fs.readFile(expectedPath, 'utf-8');
    expect(content).toContain('ticket: TICKET-123');
    expect(content).not.toContain('{{DATE}}');
  });

  it('should return null and not overwrite if note already exists', async () => {
    const ticketId = 'EXISTING-TICKET';
    const existingPath = path.join(notesDir, 'EXISTING-TICKET.md');

    await fs.writeFile(existingPath, 'Original Content');

    const result = await createNote(mockConfig, ticketId);

    expect(result).toBeNull();

    const content = await fs.readFile(existingPath, 'utf-8');
    expect(content).toBe('Original Content');
  });
});
