ALTER TYPE "llm_provider" ADD VALUE 'lmstudio';
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "lmstudio_base_url" text NOT NULL DEFAULT 'http://localhost:1234';
