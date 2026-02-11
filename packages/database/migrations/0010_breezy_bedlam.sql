DO $$ BEGIN
 CREATE TYPE "schedule_frequency" AS ENUM('daily', 'weekly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "message_role" AS ENUM('user', 'assistant', 'system', 'tool');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text,
	"tool_calls" jsonb,
	"tool_call_id" text,
	"tool_results" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"user_id" text NOT NULL,
	"model" text,
	"system_prompt" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "today_sheet_schedule_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "today_sheet_time" text DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_frequency" "schedule_frequency" DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_time" text DEFAULT '17:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "organize_schedule_weekday" text DEFAULT '1' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" ON "conversations" ("updated_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
