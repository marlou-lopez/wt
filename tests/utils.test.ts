import { describe, it, expect, vi } from 'vitest';
import { sanitizeTicketId, getTickets } from '../src/utils';
import { fs } from 'zx';
import { Config } from '../src/types';

// Mock fs and path from zx
vi.mock('zx', async () => {
  const actual = await vi.importActual('zx');
  return {
    ...actual,
    fs: {
      readdir: vi.fn(),
      readFile: vi.fn(),
      stat: vi.fn(),
    },
    // We keep actual path implementation or mock it if needed
    // path: actual.path
  };
});

describe('utils', () => {
  describe('sanitizeTicketId', () => {
    it('should sanitize basic string', () => {
      expect(sanitizeTicketId('My Ticket')).toBe('MY-TICKET');
    });

    it('should handle special characters', () => {
      expect(sanitizeTicketId('Ticket #123!')).toBe('TICKET-123');
    });

    it('should trim whitespace', () => {
      expect(sanitizeTicketId('  spaced  ')).toBe('SPACED');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeTicketId('a   b')).toBe('A-B');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeTicketId('-abc-')).toBe('ABC');
    });
  });

  describe('getTickets', () => {
    it('should parse ticket files correctly', async () => {
      const mockConfig = {
        directory_roots: {
          notes: '/mock/notes',
        },
      } as unknown as Config;

      // Mock file system responses
      (fs.readdir as any).mockResolvedValue(['ticket1.md', 'ignored.txt']);

      (fs.readFile as any).mockImplementation(async (filepath: string) => {
        if (filepath.endsWith('ticket1.md')) {
          return `---
type: ticket
status: todo
title: My First Ticket
id: TICKET-1
---
# Content`;
        }
        return '';
      });

      (fs.stat as any).mockResolvedValue({
        mtime: new Date('2023-01-01'),
      });

      const tickets = await getTickets(mockConfig);

      expect(tickets).toHaveLength(1);
      expect(tickets[0].id).toBe('TICKET-1');
      expect(tickets[0].title).toBe('My First Ticket');
      expect(tickets[0].status).toBe('todo');
    });

    it('should ignore non-ticket files', async () => {
      const mockConfig = {
        directory_roots: {
          notes: '/mock/notes',
        },
      } as unknown as Config;

      (fs.readdir as any).mockResolvedValue(['random.md']);

      (fs.readFile as any).mockImplementation(async () => {
        return `---
type: note
---
# Just a note`;
      });

      (fs.stat as any).mockResolvedValue({
        mtime: new Date(),
      });

      const tickets = await getTickets(mockConfig);
      expect(tickets).toHaveLength(0);
    });
  });
});
