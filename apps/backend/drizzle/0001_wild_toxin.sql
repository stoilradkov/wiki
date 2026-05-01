CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"default_ingestion_mode" text DEFAULT 'auto' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
