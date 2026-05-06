CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "embedding_model" text;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "embedding_dimension" integer;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "embedding_task_type" text;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "embedded_at" timestamp with time zone;
