CREATE TYPE "provider_kind" AS ENUM('xcpng', 'proxmox');--> statement-breakpoint
CREATE TYPE "provider_status" AS ENUM('unknown', 'ok', 'error');--> statement-breakpoint
CREATE TYPE "migration_mode" AS ENUM('cold', 'warm');--> statement-breakpoint
CREATE TYPE "log_level" AS ENUM('debug', 'info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "migration_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "migration_step" AS ENUM('precheck', 'prepare_source', 'create_target', 'transfer_disks', 'adapt_guest', 'start_target', 'verify');--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"kind" "provider_kind" NOT NULL,
	"url" text NOT NULL,
	"insecure_tls" boolean DEFAULT false NOT NULL,
	"username" text NOT NULL,
	"secret_encrypted" text NOT NULL,
	"status" "provider_status" DEFAULT 'unknown'::"provider_status" NOT NULL,
	"status_message" text,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"source_provider_id" uuid NOT NULL,
	"target_provider_id" uuid NOT NULL,
	"target_node" text NOT NULL,
	"mode" "migration_mode" DEFAULT 'cold'::"migration_mode" NOT NULL,
	"network_map" jsonb NOT NULL,
	"storage_map" jsonb NOT NULL,
	"vms" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "migration_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"migration_id" uuid NOT NULL,
	"level" "log_level" DEFAULT 'info'::"log_level" NOT NULL,
	"step" "migration_step",
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"source_vm_uuid" text NOT NULL,
	"vm_name" text NOT NULL,
	"status" "migration_status" DEFAULT 'pending'::"migration_status" NOT NULL,
	"current_step" "migration_step",
	"progress" integer DEFAULT 0 NOT NULL,
	"target_vmid" integer,
	"state" jsonb DEFAULT '{}' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "migration_logs_migration_idx" ON "migration_logs" ("migration_id","id");--> statement-breakpoint
CREATE INDEX "migrations_plan_idx" ON "migrations" ("plan_id");--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_source_provider_id_providers_id_fkey" FOREIGN KEY ("source_provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_target_provider_id_providers_id_fkey" FOREIGN KEY ("target_provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "migration_logs" ADD CONSTRAINT "migration_logs_migration_id_migrations_id_fkey" FOREIGN KEY ("migration_id") REFERENCES "migrations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "migrations" ADD CONSTRAINT "migrations_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;