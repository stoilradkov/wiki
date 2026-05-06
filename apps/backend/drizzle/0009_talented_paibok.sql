ALTER TABLE "document_chunks" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("content", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("heading_path"::text, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'title', '')), 'A') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'author', '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(("source_metadata"->'tags')::text, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(("source_metadata"->'entityNames')::text, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(("source_metadata"->'entityTypes')::text, '')), 'C') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'url', '')), 'C') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'sourceDate', '')), 'C') ||
          setweight(to_tsvector('simple', coalesce("source_metadata"->>'note', '')), 'C')) STORED;--> statement-breakpoint
CREATE INDEX "document_chunks_search_vector_idx" ON "document_chunks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "documents_search_vector_idx" ON "documents" USING gin ("search_vector");