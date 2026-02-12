import { Database, OrganizedNotesRepository } from 'database';

export class NotesService {
  private notesRepo: OrganizedNotesRepository;

  constructor(db: Database) {
    this.notesRepo = new OrganizedNotesRepository(db);
  }

  /**
   * Append content to an existing note with the same title, or create a new note if none exists
   */
  async appendToNote(userId: string, title: string, contentToAppend: string) {
    // Find existing notes with the given title
    const existingNotes = await this.notesRepo.findByTitle(userId, title);
    const appendMarker = '\n\n---- APPENDED ----\n';

    if (existingNotes.length === 0) {
      // No existing note found, create a new one
      const newNote = await this.notesRepo.create({
        userId,
        title,
        content: contentToAppend,
        date: new Date(),
      });
      return newNote;
    } else {
      // Append to the first found note with the matching title
      const noteToUpdate = existingNotes[0];
      let updatedContent = noteToUpdate.content;

      if (updatedContent.indexOf(appendMarker.trim()) === -1) {
        updatedContent += appendMarker;
      }

      updatedContent += '\n' + contentToAppend;

      const updatedNote = await this.notesRepo.update(noteToUpdate.id, {
        content: updatedContent,
      });
      return updatedNote;
    }
  }
}
