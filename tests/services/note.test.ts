import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNote } from '../../src/services/note';
import { fs, path } from 'zx';
import * as utils from '../../src/utils';
import { Config } from '../../src/types';

// Mock zx
vi.mock('zx', async () => {
  const actual = await vi.importActual('zx');
  return {
    ...actual,
    fs: {
      existsSync: vi.fn(),
      outputFile: vi.fn(),
    },
  };
});

// Mock utils
vi.mock('../../src/utils', async () => {
  return {
    readTemplate: vi.fn(),
  };
});

describe('createNote', () => {
  const mockConfig = {
    directory_roots: {
      notes: '/mock/notes',
    },
  } as unknown as Config;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new note if it does not exist', async () => {
    const ticketId = 'TICKET-123';
    const expectedPath = path.join('/mock/notes', 'TICKET-123.md');

    // Mock fs.existsSync to return false (file doesn't exist)
    (fs.existsSync as any).mockReturnValue(false);

    // Mock readTemplate
    (utils.readTemplate as any).mockResolvedValue(
      '---\nticket: {{TICKET_ID}}\ndate: {{DATE}}\n---'
    );

    const result = await createNote(mockConfig, ticketId);

    expect(result).toBe(expectedPath);
    expect(utils.readTemplate).toHaveBeenCalledWith('note.md');
    expect(fs.outputFile).toHaveBeenCalledWith(
      expectedPath,
      expect.stringContaining('ticket: TICKET-123')
    );
    expect(fs.outputFile).toHaveBeenCalledWith(
      expectedPath,
      expect.not.stringContaining('{{DATE}}') // Should be replaced
    );
  });

  it('should return null if note already exists', async () => {
    const ticketId = 'EXISTING-TICKET';

    // Mock fs.existsSync to return true
    (fs.existsSync as any).mockReturnValue(true);

    const result = await createNote(mockConfig, ticketId);

    expect(result).toBeNull();
    expect(fs.outputFile).not.toHaveBeenCalled();
  });
});
