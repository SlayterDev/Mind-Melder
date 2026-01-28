DO $$ BEGIN
 CREATE TYPE "todo_status" AS ENUM('pending', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"user_id" text NOT NULL,
	"organized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organized_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"status" "todo_status" DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "captures_user_id_idx" ON "captures" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "captures_organized_idx" ON "captures" ("organized_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "captures_timestamp_idx" ON "captures" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organized_notes_user_id_idx" ON "organized_notes" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organized_notes_date_idx" ON "organized_notes" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organized_notes_category_idx" ON "organized_notes" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_user_id_idx" ON "todos" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_status_idx" ON "todos" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_due_date_idx" ON "todos" ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_user_id_idx" ON "templates" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_is_active_idx" ON "templates" ("is_active");