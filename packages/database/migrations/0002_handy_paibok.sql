CREATE TABLE IF NOT EXISTS "today_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"summary" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captures_processed" integer DEFAULT 0 NOT NULL,
	"todos_included" integer DEFAULT 0 NOT NULL,
	"total_estimated_minutes" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "today_sheet_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "today_sheets_user_id_idx" ON "today_sheets" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "today_sheets_generated_at_idx" ON "today_sheets" ("generated_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todos" ADD CONSTRAINT "todos_today_sheet_id_today_sheets_id_fk" FOREIGN KEY ("today_sheet_id") REFERENCES "today_sheets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
