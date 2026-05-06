CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"markdown_version_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"heading_path" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"token_count" integer NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_markdown_version_id_markdown_versions_id_fk" FOREIGN KEY ("markdown_version_id") REFERENCES "public"."markdown_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_chunks_markdown_version_id_idx" ON "document_chunks" USING btree ("markdown_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_chunks_markdown_version_index_idx" ON "document_chunks" USING btree ("markdown_version_id","chunk_index");--> statement-breakpoint
CREATE INDEX "document_chunks_content_hash_idx" ON "document_chunks" USING btree ("content_hash");