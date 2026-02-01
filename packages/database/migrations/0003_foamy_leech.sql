DO $$ BEGIN
 CREATE TYPE "llm_provider" AS ENUM('openai', 'anthropic', 'ollama');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"llm_provider" "llm_provider" DEFAULT 'openai' NOT NULL,
	"llm_model" text,
	"llm_temperature" real DEFAULT 0.7 NOT NULL,
	"ollama_base_url" text DEFAULT 'http://localhost:11434' NOT NULL,
	"organization_schedule" text DEFAULT '0 17 * * *' NOT NULL,
	"schedule_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_user_id_idx" ON "settings" ("user_id");