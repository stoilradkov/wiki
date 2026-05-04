import { desc, eq } from "drizzle-orm";
import {
  projectSchema,
  type CreateProjectRequest,
  type Project,
  type UpdateProjectRequest
} from "@wiki/shared";
import { db } from "@wiki/backend/db/client";
import { projects } from "@wiki/backend/db/schema";

const toIso = (value: Date) => value.toISOString();

export function mapProject(row: typeof projects.$inferSelect): Project {
  return projectSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    archived: row.archived,
    ingestionMode: row.ingestionMode,
    extractionProfile: row.extractionProfile,
    customExtractionInstructions: row.customExtractionInstructions,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  });
}

export async function listProjects(): Promise<Project[]> {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return rows.map(mapProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ? mapProject(row) : null;
}

export async function createProject(input: CreateProjectRequest): Promise<Project> {
  const [row] = await db
    .insert(projects)
    .values(input)
    .returning();

  if (!row) {
    throw new Error("Project insert returned no row");
  }

  return mapProject(row);
}

export async function updateProject(
  id: string,
  input: UpdateProjectRequest
): Promise<Project | null> {
  const [row] = await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return row ? mapProject(row) : null;
}
