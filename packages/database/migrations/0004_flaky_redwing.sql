CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_user_id_idx" ON "tags" ("user_id");