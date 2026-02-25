import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesService } from '../notes-service.js';
import type { OrganizedNote } from 'database';

// Mock repository method holders
const mockRepos = {
  notes: {
    findByTitle: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('database', () => {
  class MockOrganizedNotesRepository {
    findByTitle = mockRepos.notes.findByTitle;
    create = mockRepos.notes.create;
    update = mockRepos.notes.update;
  }

  return {
    OrganizedNotesRepository: MockOrganizedNotesRepository,
  };
});

// Test fixtures
const userId = 'user-1';

const createMockNote = (overrides: Partial<OrganizedNote> = {}): OrganizedNote => ({
  id: 'note-1',
  title: 'Meeting Notes',
  content: 'Initial content',
  userId,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

describe('NotesService', () => {
  let service: NotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotesService({} as never);
  });

  describe('appendToNote', () => {
    it('should create a new note when no note with the given title exists', async () => {
      mockRepos.notes.findByTitle.mockResolvedValue([]);
      const newNote = createMockNote({ content: 'New content' });
      mockRepos.notes.create.mockResolvedValue(newNote);

      const result = await service.appendToNote(userId, 'Meeting Notes', 'New content');

      expect(mockRepos.notes.create).toHaveBeenCalledWith({
        userId,
        title: 'Meeting Notes',
        content: 'New content',
        date: expect.any(Date),
      });
      expect(result).toEqual(newNote);
      expect(mockRepos.notes.update).not.toHaveBeenCalled();
    });

    it('should append content with an APPENDED marker when the note has no existing marker', async () => {
      const existingNote = createMockNote({ content: 'Original content' });
      mockRepos.notes.findByTitle.mockResolvedValue([existingNote]);
      const updatedNote = createMockNote({ content: 'Original content\n\n---- APPENDED ----\n\nAppended content' });
      mockRepos.notes.update.mockResolvedValue(updatedNote);

      const result = await service.appendToNote(userId, 'Meeting Notes', 'Appended content');

      expect(mockRepos.notes.update).toHaveBeenCalledWith(
        'note-1',
        {
          content: 'Original content\n\n---- APPENDED ----\n\nAppended content',
        }
      );
      expect(result).toEqual(updatedNote);
      expect(mockRepos.notes.create).not.toHaveBeenCalled();
    });

    it('should not add a second APPENDED marker when one already exists', async () => {
      const existingNote = createMockNote({
        content: 'Original content\n\n---- APPENDED ----\n\nFirst append',
      });
      mockRepos.notes.findByTitle.mockResolvedValue([existingNote]);
      mockRepos.notes.update.mockResolvedValue(existingNote);

      await service.appendToNote(userId, 'Meeting Notes', 'Second append');

      const updatedContent = (mockRepos.notes.update as ReturnType<typeof vi.fn>).mock.calls[0][1].content as string;
      const markerCount = (updatedContent.match(/---- APPENDED ----/g) || []).length;
      expect(markerCount).toBe(1);
    });

    it('should append the new content after existing appended content', async () => {
      const existingNote = createMockNote({
        content: 'Original\n\n---- APPENDED ----\n\nFirst append',
      });
      mockRepos.notes.findByTitle.mockResolvedValue([existingNote]);
      mockRepos.notes.update.mockResolvedValue(existingNote);

      await service.appendToNote(userId, 'Meeting Notes', 'Second append');

      const updatedContent = (mockRepos.notes.update as ReturnType<typeof vi.fn>).mock.calls[0][1].content as string;
      expect(updatedContent).toContain('First append');
      expect(updatedContent).toContain('Second append');
      // Second append must appear after first
      expect(updatedContent.indexOf('First append')).toBeLessThan(updatedContent.indexOf('Second append'));
    });

    it('should append to the first matching note when multiple notes share a title', async () => {
      const firstNote = createMockNote({ id: 'note-1', content: 'First note' });
      const secondNote = createMockNote({ id: 'note-2', content: 'Second note' });
      mockRepos.notes.findByTitle.mockResolvedValue([firstNote, secondNote]);
      mockRepos.notes.update.mockResolvedValue(firstNote);

      await service.appendToNote(userId, 'Meeting Notes', 'New content');

      expect(mockRepos.notes.update).toHaveBeenCalledWith('note-1', expect.any(Object));
    });
  });
});
