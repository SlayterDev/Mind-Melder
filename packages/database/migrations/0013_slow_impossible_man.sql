CREATE TABLE IF NOT EXISTS "weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"summary" text NOT NULL,
	"insights" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_reviews_user_id_idx" ON "weekly_reviews" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_reviews_week_start_date_idx" ON "weekly_reviews" ("week_start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_reviews_user_week_idx" ON "weekly_reviews" ("user_id","week_start_date");