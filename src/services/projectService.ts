import { supabase } from '@/integrations/supabase/client';
import type { Project, ProjectImage, ProjectProductData, ProjectAIData, ProjectSEOData } from '@/types/project';
import { EMPTY_PRODUCT_DATA, EMPTY_AI_DATA, EMPTY_SEO_DATA } from '@/types/project';

const LOCAL_PREFIX = 'project:';
const LAST_OPENED_KEY = 'lastOpenedProjectId';

// ─── Local Persistence ───────────────────────────────────────

export function saveProjectLocally(project: Project): void {
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${project.id}`, JSON.stringify(project));
    localStorage.setItem(LAST_OPENED_KEY, project.id);
  } catch (e) {
    console.warn('[ProjectService] Failed to save locally:', e);
  }
}

export function loadProjectLocally(projectId: string): Project | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getLastOpenedProjectId(): string | null {
  return localStorage.getItem(LAST_OPENED_KEY);
}

export function setLastOpenedProjectId(id: string): void {
  localStorage.setItem(LAST_OPENED_KEY, id);
}

export function removeProjectLocally(projectId: string): void {
  localStorage.removeItem(`${LOCAL_PREFIX}${projectId}`);
}

// ─── Backend Persistence ─────────────────────────────────────

export async function createProjectInBackend(userId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: 'Novo Produto',
      status: 'draft',
      step: 1,
      product_data: EMPTY_PRODUCT_DATA as any,
      ai_data: EMPTY_AI_DATA as any,
      seo_data: EMPTY_SEO_DATA as any,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRowToProject(data, []);
}

export async function saveProjectToBackend(project: Project): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      name: project.name,
      status: project.status,
      step: project.step,
      product_data: project.productData as any,
      ai_data: project.aiData as any,
      seo_data: project.seoData as any,
      updated_at: new Date().toISOString(),
      published_at: project.publishedAt,
    })
    .eq('id', project.id);

  if (error) {
    console.error('[ProjectService] Backend save failed:', error);
    throw error;
  }
}

export async function loadProjectFromBackend(projectId: string): Promise<Project | null> {
  const { data: row, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !row) return null;

  const { data: images } = await supabase
    .from('project_images')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  return mapRowToProject(row, images || []);
}

export async function loadLatestDraft(userId: string): Promise<Project | null> {
  const { data: row, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return null;

  const { data: images } = await supabase
    .from('project_images')
    .select('*')
    .eq('project_id', row.id)
    .order('sort_order', { ascending: true });

  return mapRowToProject(row, images || []);
}

export async function addProjectImage(
  projectId: string,
  url: string,
  storagePath: string | null,
  isCover: boolean,
  sortOrder: number
): Promise<ProjectImage> {
  const { data, error } = await supabase
    .from('project_images')
    .insert({
      project_id: projectId,
      url,
      storage_path: storagePath,
      is_cover: isCover,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return mapImageRow(data);
}

export async function deleteProjectImage(imageId: string, storagePath?: string | null): Promise<void> {
  // Optionally delete from storage
  if (storagePath) {
    await supabase.storage.from('product-images').remove([storagePath]).catch(() => {});
  }

  const { error } = await supabase
    .from('project_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
}

export async function markProjectPublished(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) throw error;
}

// ─── Mapping ────────────────────────────────────────────────

function mapRowToProject(row: any, images: any[]): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status as Project['status'],
    step: row.step,
    productData: (row.product_data || EMPTY_PRODUCT_DATA) as ProjectProductData,
    aiData: (row.ai_data || EMPTY_AI_DATA) as ProjectAIData,
    seoData: (row.seo_data || EMPTY_SEO_DATA) as ProjectSEOData,
    images: (images || []).map(mapImageRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function mapImageRow(row: any): ProjectImage {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storage_path,
    isCover: row.is_cover,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}
