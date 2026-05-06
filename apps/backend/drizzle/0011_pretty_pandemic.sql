ALTER TABLE "chat_messages" ADD COLUMN "retrieved_chunk_references" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "model_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "retrieval_metadata" jsonb;