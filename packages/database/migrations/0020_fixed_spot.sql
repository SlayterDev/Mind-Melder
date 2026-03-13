DO $$ BEGIN
 CREATE TYPE "content_format" AS ENUM('markdown', 'slate_json');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "organized_notes" ADD COLUMN "content_format" "content_format" DEFAULT 'markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE "organized_notes" ADD COLUMN "content_plain" text;
--> statement-breakpoint
-- Rebuild search_vector to use content_plain (plain text) when available for slate_json notes,
-- falling back to raw content for markdown notes. This prevents JSON structural keywords
-- (type, children, paragraph, etc.) from polluting the full-text search index.
ALTER TABLE "organized_notes" DROP COLUMN "search_vector";
--> statement-breakpoint
ALTER TABLE "organized_notes" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_plain, content, '')), 'B')
  ) STORED;
--> statement-breakpoint
CREATE INDEX "organized_notes_search_vector_idx" ON "organized_notes" USING GIN ("search_vector");