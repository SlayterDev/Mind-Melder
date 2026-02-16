CREATE TABLE IF NOT EXISTS "token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"method" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_usage_user_id_idx" ON "token_usage" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_usage_created_at_idx" ON "token_usage" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_usage_user_created_at_idx" ON "token_usage" ("user_id","created_at");
