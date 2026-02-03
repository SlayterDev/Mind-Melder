-- Add tsvector search columns with GENERATED ALWAYS AS and GIN indexes for full-text search

-- Captures table: search on content only
ALTER TABLE "captures" ADD COLUMN "search_vector" tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX "captures_search_vector_idx" ON "captures" USING GIN ("search_vector");

-- Todos table: search on content (weight A), description (weight B), and tags (weight B)
-- Note: tags is a JSONB array, we convert it to text for searching
ALTER TABLE "todos" ADD COLUMN "search_vector" tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(content, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(tags::text, '')), 'B')
  ) STORED;

CREATE INDEX "todos_search_vector_idx" ON "todos" USING GIN ("search_vector");

-- Organized Notes table: search on title (weight A) and content (weight B)
ALTER TABLE "organized_notes" ADD COLUMN "search_vector" tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;

CREATE INDEX "organized_notes_search_vector_idx" ON "organized_notes" USING GIN ("search_vector");
