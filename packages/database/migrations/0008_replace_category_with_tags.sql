-- Add tags column
ALTER TABLE "organized_notes" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;

-- Migrate existing categories to tags array
UPDATE "organized_notes"
SET "tags" = CASE
  WHEN "category" IS NOT NULL AND "category" != ''
  THEN jsonb_build_array("category")
  ELSE '[]'::jsonb
END;

-- Drop category column and its index
DROP INDEX IF EXISTS "organized_notes_category_idx";
ALTER TABLE "organized_notes" DROP COLUMN "category";

-- Add GIN index for tags queries
CREATE INDEX "organized_notes_tags_idx" ON "organized_notes" USING GIN ("tags");
