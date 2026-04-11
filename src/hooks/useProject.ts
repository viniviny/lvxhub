import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Project, SaveStatus, ProjectProductData, ProjectAIData, ProjectSEOData } from '@/types/project';
import { EMPTY_PRODUCT_DATA, EMPTY_AI_DATA, EMPTY_SEO_DATA } from '@/types/project';
import {
  saveProjectLocally,
  loadProjectLocally,
  getLastOpenedProjectId,
  setLastOpenedProjectId,
  createProjectInBackend,
  saveProjectToBackend,
  loadProjectFromBackend,
  loadLatestDraft,
  addProjectImage,
  deleteProjectImage,
  markProjectPublished,
} from '@/services/projectService';

const DEBOUNCE_MS = 1000;

function getImageSignature(project: Project | null): string {
  return (project?.images ?? [])
    .map((image) => `${image.id}:${image.url}:${image.isCover ? 1 : 0}:${image.sortOrder}`)
    .join('|');
}

function resolveInitialProject(localProject: Project, backendProject: Project | null): Project {
  if (!backendProject) return localProject;

  // project_images lives outside the projects row, so backend image state must win
  // whenever local storage and backend drift apart.
  if (getImageSignature(localProject) !== getImageSignature(backendProject)) {
    return backendProject;
  }

  return new Date(backendProject.updatedAt) > new Date(localProject.updatedAt)
    ? backendProject
    : localProject;
}

export function useProject() {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);

  // ─── Initialize: load or create project ────────────────────
  useEffect(() => {
    if (!user?.id || isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      setIsLoading(true);
      try {
        let loaded: Project | null = null;

        // 1) Try local first (fastest)
        const lastId = getLastOpenedProjectId();
        if (lastId) {
          loaded = loadProjectLocally(lastId);
        }

        // 2) If local version exists, reconcile it with backend before restoring UI
        if (loaded && loaded.status === 'draft') {
          const backendVersion = await loadProjectFromBackend(loaded.id).catch(() => null);
          const resolvedProject = resolveInitialProject(loaded, backendVersion);

          setProject(resolvedProject);
          saveProjectLocally(resolvedProject);
          setLastOpenedProjectId(resolvedProject.id);
          setIsLoading(false);
          return;
        }

        // 3) Try backend latest draft
        loaded = await loadLatestDraft(user.id).catch(() => null);
        if (loaded) {
          setProject(loaded);
          saveProjectLocally(loaded);
          setLastOpenedProjectId(loaded.id);
          setIsLoading(false);
          return;
        }

        // 4) Create new project
        loaded = await createProjectInBackend(user.id);
        setProject(loaded);
        saveProjectLocally(loaded);
        setLastOpenedProjectId(loaded.id);
      } catch (e) {
        console.error('[useProject] Init error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // ─── Autosave debounce ─────────────────────────────────────
  const scheduleBackendSave = useCallback((updatedProject: Project) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveProjectToBackend(updatedProject);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, DEBOUNCE_MS);
  }, []);

  // ─── Update project helper ────────────────────────────────
  const updateProject = useCallback((updater: (prev: Project) => Project) => {
    setProject(prev => {
      if (!prev) return prev;
      const updated = updater(prev);
      updated.updatedAt = new Date().toISOString();

      // Local save (instant)
      saveProjectLocally(updated);

      // Backend save (debounced)
      scheduleBackendSave(updated);

      return updated;
    });
  }, [scheduleBackendSave]);

  // ─── Field updaters ────────────────────────────────────────
  const updateProductData = useCallback((partial: Partial<ProjectProductData>) => {
    updateProject(p => ({
      ...p,
      productData: { ...p.productData, ...partial },
      name: partial.title && partial.title.trim() ? partial.title : p.name,
    }));
  }, [updateProject]);

  const updateAIData = useCallback((partial: Partial<ProjectAIData>) => {
    updateProject(p => ({ ...p, aiData: { ...p.aiData, ...partial } }));
  }, [updateProject]);

  const updateSEOData = useCallback((partial: Partial<ProjectSEOData>) => {
    updateProject(p => ({ ...p, seoData: { ...p.seoData, ...partial } }));
  }, [updateProject]);

  const updateStep = useCallback((step: number) => {
    updateProject(p => ({ ...p, step }));
  }, [updateProject]);

  // ─── Image management ─────────────────────────────────────
  const addImage = useCallback(async (url: string, storagePath: string | null, isCover: boolean) => {
    if (!project) return;
    try {
      const img = await addProjectImage(project.id, url, storagePath, isCover, project.images.length);
      updateProject(p => ({ ...p, images: [...p.images, img] }));
    } catch (e) {
      console.error('[useProject] addImage error:', e);
    }
  }, [project, updateProject]);

  const removeImage = useCallback(async (imageId: string) => {
    if (!project) return;
    const img = project.images.find(i => i.id === imageId);
    try {
      await deleteProjectImage(imageId, img?.storagePath);
      updateProject(p => ({ ...p, images: p.images.filter(i => i.id !== imageId) }));
    } catch (e) {
      console.error('[useProject] removeImage error:', e);
    }
  }, [project, updateProject]);

  // ─── Publish ───────────────────────────────────────────────
  const publishProject = useCallback(async () => {
    if (!project) return;
    try {
      await markProjectPublished(project.id);
      updateProject(p => ({ ...p, status: 'published', publishedAt: new Date().toISOString() }));
    } catch (e) {
      console.error('[useProject] publish error:', e);
    }
  }, [project, updateProject]);

  // ─── New project ──────────────────────────────────────────
  const createNewProject = useCallback(async () => {
    if (!user?.id) return;
    try {
      const newProject = await createProjectInBackend(user.id);
      setProject(newProject);
      saveProjectLocally(newProject);
      setLastOpenedProjectId(newProject.id);
      setSaveStatus('idle');
    } catch (e) {
      console.error('[useProject] create error:', e);
    }
  }, [user?.id]);

  return {
    project,
    isLoading,
    saveStatus,
    updateProductData,
    updateAIData,
    updateSEOData,
    updateStep,
    updateProject,
    addImage,
    removeImage,
    publishProject,
    createNewProject,
  };
}
