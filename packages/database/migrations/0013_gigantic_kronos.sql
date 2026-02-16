ALTER TABLE "settings" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_check_interval" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_reminder_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_show_overdue" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_show_upcoming" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_quiet_hours_start" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_quiet_hours_end" text;