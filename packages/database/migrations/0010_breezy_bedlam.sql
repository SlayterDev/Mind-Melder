DO $$ BEGIN
 CREATE TYPE "schedule_frequency" AS ENUM('daily', 'weekly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "today_sheet_schedule_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "today_sheet_time" text DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_frequency" "schedule_frequency" DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_time" text DEFAULT '17:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_weekday" text DEFAULT '1' NOT NULL;--> statement-breakpoint
