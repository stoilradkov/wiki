CREATE TABLE "document_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"markdown_version_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"markdown_version_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"normalized_name" text NOT NULL,
	"display_name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_triples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"subject_entity_id" uuid NOT NULL,
	"object_entity_id" uuid NOT NULL,
	"predicate" text NOT NULL,
	"predicate_text" text,
	"confidence" real NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_markdown_version_id" uuid NOT NULL,
	"source_chunk_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"normalized_name" text NOT NULL,
	"display_name" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_summaries" ADD CONSTRAINT "document_summaries_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_summaries" ADD CONSTRAINT "document_summaries_markdown_version_id_markdown_versions_id_fk" FOREIGN KEY ("markdown_version_id") REFERENCES "public"."markdown_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_markdown_version_id_markdown_versions_id_fk" FOREIGN KEY ("markdown_version_id") REFERENCES "public"."markdown_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entities" ADD CONSTRAINT "knowledge_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_triples" ADD CONSTRAINT "knowledge_triples_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_triples" ADD CONSTRAINT "knowledge_triples_subject_entity_id_knowledge_entities_id_fk" FOREIGN KEY ("subject_entity_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_triples" ADD CONSTRAINT "knowledge_triples_object_entity_id_knowledge_entities_id_fk" FOREIGN KEY ("object_entity_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_triples" ADD CONSTRAINT "knowledge_triples_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_triples" ADD CONSTRAINT "knowledge_triples_source_markdown_version_id_markdown_versions_id_fk" FOREIGN KEY ("source_markdown_version_id") REFERENCES "public"."markdown_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_triples" ADD CONSTRAINT "knowledge_triples_source_chunk_id_document_chunks_id_fk" FOREIGN KEY ("source_chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_summaries_document_id_idx" ON "document_summaries" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_summaries_markdown_version_id_idx" ON "document_summaries" USING btree ("markdown_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_tags_document_tag_source_idx" ON "document_tags" USING btree ("document_id","tag_id","source");--> statement-breakpoint
CREATE INDEX "document_tags_document_id_idx" ON "document_tags" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_tags_tag_id_idx" ON "document_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_entities_project_type_name_idx" ON "knowledge_entities" USING btree ("project_id","type","normalized_name");--> statement-breakpoint
CREATE INDEX "knowledge_entities_project_id_idx" ON "knowledge_entities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knowledge_triples_project_id_idx" ON "knowledge_triples" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knowledge_triples_source_document_id_idx" ON "knowledge_triples" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "knowledge_triples_subject_entity_id_idx" ON "knowledge_triples" USING btree ("subject_entity_id");--> statement-breakpoint
CREATE INDEX "knowledge_triples_object_entity_id_idx" ON "knowledge_triples" USING btree ("object_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_project_normalized_source_idx" ON "tags" USING btree ("project_id","normalized_name","source");--> statement-breakpoint
CREATE INDEX "tags_project_id_idx" ON "tags" USING btree ("project_id");