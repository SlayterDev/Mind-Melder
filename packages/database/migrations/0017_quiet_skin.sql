ALTER TABLE "settings" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_morning_reminder_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_morning_reminder_time" text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_afternoon_reminder_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_afternoon_reminder_time" text DEFAULT '15:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_show_overdue" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_quiet_hours_start" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notifications_quiet_hours_end" text;