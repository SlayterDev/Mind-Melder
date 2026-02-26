DO $$ BEGIN
 CREATE TYPE "agent_action_status" AS ENUM('pending', 'accepted', 'rejected', 'redirected', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_action_type" AS ENUM('create_task', 'assign_due_date', 'flag_followup', 'detect_overcommitment', 'suggest_defer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_outcome" AS ENUM('accepted', 'rejected', 'redirected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_trigger_type" AS ENUM('capture', 'scheduled', 'threshold');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"trigger_type" "agent_trigger_type" NOT NULL,
	"trigger_ref" uuid,
	"action_type" "agent_action_type" NOT NULL,
	"action_payload" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"reason" text NOT NULL,
	"status" "agent_action_status" DEFAULT 'pending' NOT NULL,
	"user_correction" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action_id" uuid,
	"outcome" "agent_outcome" NOT NULL,
	"original_action" jsonb NOT NULL,
	"corrected_action" jsonb,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_actions_user_id_idx" ON "agent_actions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_actions_status_idx" ON "agent_actions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_actions_created_at_idx" ON "agent_actions" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_user_id_idx" ON "agent_feedback" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_action_id_idx" ON "agent_feedback" ("action_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_feedback_captured_at_idx" ON "agent_feedback" ("captured_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_trigger_ref_captures_id_fk" FOREIGN KEY ("trigger_ref") REFERENCES "captures"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_action_id_agent_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "agent_actions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
