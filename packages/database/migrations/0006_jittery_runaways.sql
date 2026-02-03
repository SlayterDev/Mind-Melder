DO $$ BEGIN
 CREATE TYPE "feedback_vote" AS ENUM('thumbs_up', 'thumbs_down', 'none');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "feedback_vote" "feedback_vote" DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "feedback_text" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "feedback_timestamp" timestamp with time zone;