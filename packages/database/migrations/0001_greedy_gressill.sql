DO $$ BEGIN
 CREATE TYPE "time_estimate" AS ENUM('quick', 'medium', 'long', 'none');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "today_sheet_section" AS ENUM('must_do_today', 'likely_today', 'opportunistic', 'overflow', 'none');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "today_sheet_section" "today_sheet_section" DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "today_sheet_order" integer;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "time_estimate" "time_estimate" DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "priority_score" integer;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "capture_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_today_sheet_section_idx" ON "todos" ("today_sheet_section");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todos_today_sheet_order_idx" ON "todos" ("today_sheet_order");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todos" ADD CONSTRAINT "todos_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "captures"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
