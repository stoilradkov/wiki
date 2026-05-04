CREATE TABLE "markdown_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"markdown" text NOT NULL,
	"markdown_hash" text NOT NULL,
	"author" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "markdown_versions" ADD CONSTRAINT "markdown_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "markdown_versions_document_id_idx" ON "markdown_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "markdown_versions_markdown_hash_idx" ON "markdown_versions" USING btree ("markdown_hash");