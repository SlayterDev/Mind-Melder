-- Add title column with a default for existing rows
ALTER TABLE "organized_notes" ADD COLUMN "title" text DEFAULT 'Untitled Note';
-- Update existing notes to extract title from content (first line or first 50 chars)
UPDATE "organized_notes" SET "title" = CASE
  WHEN position(E'\n' in content) > 0 THEN left(split_part(content, E'\n', 1), 200)
  ELSE left(content, 200)
END;
-- Make the column NOT NULL and remove the default
ALTER TABLE "organized_notes" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "organized_notes" ALTER COLUMN "title" DROP DEFAULT;
