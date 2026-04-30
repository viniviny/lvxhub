/**
 * useImageStudio — data layer for the independent Image Studio.
 * Wraps Supabase access to visual_projects, image_sessions and
 * studio_images. No coupling with products, Shopify, drafts or stores.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StudioImage = {
  id: string;
  project_id: string;
  session_id: string;
  parent_image_id: string | null;
  branch_id: string | null;
  image_url: string;
  storage_path: string | null;
  prompt: string | null;
  final_prompt: string | null;
  mode: string | null;
  role: string;
  status: string;
  aspect_ratio: string | null;
  format: string | null;
  approved: boolean;
  metadata: any;
  created_at: string;
};

export type VisualProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updated_at: string;
};

export type ImageSession = {
  id: string;
  project_id: string;
  name: string;
  visual_dna: any;
  seed_base: string | null;
  seed_family: string | null;
  anchor_image_id: string | null;
  updated_at: string;
};

export function useImageStudio() {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [sessions, setSessions] = useState<ImageSession[]>([]);
  const [images, setImages] = useState<StudioImage[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadProjects = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('visual_projects')
      .select('*')
      .order('updated_at', { ascending: false });
    setProjects(data || []);
    return data || [];
  }, []);

  const reloadSessions = useCallback(async (projectId: string) => {
    const { data } = await (supabase as any)
      .from('image_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    setSessions(data || []);
    return data || [];
  }, []);

  const reloadImages = useCallback(async (sessionId: string) => {
    const { data } = await (supabase as any)
      .from('studio_images')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setImages(data || []);
    return data || [];
  }, []);

  // initial bootstrap
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await reloadProjects();
        if (list.length > 0) {
          setActiveProjectId(list[0].id);
          const ss = await reloadSessions(list[0].id);
          if (ss.length > 0) {
            setActiveSessionId(ss[0].id);
            await reloadImages(ss[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadProjects, reloadSessions, reloadImages]);

  const createProject = useCallback(
    async (name: string, description?: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('not auth');
      const { data, error } = await (supabase as any)
        .from('visual_projects')
        .insert({ user_id: u.user.id, name, description: description || null })
        .select()
        .single();
      if (error) throw error;
      const session = await createSession(data.id, 'Sessão principal');
      await reloadProjects();
      setActiveProjectId(data.id);
      setActiveSessionId(session.id);
      setImages([]);
      toast.success('Projeto visual criado');
      return data as VisualProject;
    },
    [reloadProjects],
  );

  const createSession = useCallback(
    async (projectId: string, name: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('not auth');
      const seedBase = `${Math.floor(Math.random() * 9000000) + 1000000}`;
      const { data, error } = await (supabase as any)
        .from('image_sessions')
        .insert({
          user_id: u.user.id,
          project_id: projectId,
          name,
          seed_base: seedBase,
          visual_dna: {},
        })
        .select()
        .single();
      if (error) throw error;
      await reloadSessions(projectId);
      return data as ImageSession;
    },
    [reloadSessions],
  );

  const selectProject = useCallback(
    async (id: string) => {
      setActiveProjectId(id);
      const ss = await reloadSessions(id);
      if (ss.length > 0) {
        setActiveSessionId(ss[0].id);
        await reloadImages(ss[0].id);
      } else {
        setActiveSessionId(null);
        setImages([]);
      }
    },
    [reloadSessions, reloadImages],
  );

  const selectSession = useCallback(
    async (id: string) => {
      setActiveSessionId(id);
      await reloadImages(id);
    },
    [reloadImages],
  );

  const updateSessionDNA = useCallback(
    async (sessionId: string, dna: any) => {
      const { error } = await (supabase as any)
        .from('image_sessions')
        .update({ visual_dna: dna })
        .eq('id', sessionId);
      if (error) throw error;
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, visual_dna: dna } : s)),
      );
    },
    [],
  );

  const setAnchor = useCallback(
    async (imageId: string) => {
      if (!activeSessionId) return;
      await (supabase as any)
        .from('image_sessions')
        .update({ anchor_image_id: imageId })
        .eq('id', activeSessionId);
      await (supabase as any)
        .from('studio_images')
        .update({ role: 'anchor' })
        .eq('id', imageId);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, anchor_image_id: imageId } : s)),
      );
      setImages((prev) =>
        prev.map((i) => (i.id === imageId ? { ...i, role: 'anchor' } : i)),
      );
      toast.success('Imagem âncora definida');
    },
    [activeSessionId],
  );

  const setApproved = useCallback(async (imageId: string, approved: boolean) => {
    await (supabase as any)
      .from('studio_images')
      .update({ approved, status: approved ? 'approved' : 'generated' })
      .eq('id', imageId);
    setImages((prev) =>
      prev.map((i) => (i.id === imageId ? { ...i, approved, status: approved ? 'approved' : 'generated' } : i)),
    );
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    await (supabase as any).from('studio_images').delete().eq('id', imageId);
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  }, []);

  const deleteProject = useCallback(
    async (id: string) => {
      await (supabase as any).from('visual_projects').delete().eq('id', id);
      const list = await reloadProjects();
      if (activeProjectId === id) {
        if (list.length > 0) await selectProject(list[0].id);
        else {
          setActiveProjectId(null);
          setActiveSessionId(null);
          setImages([]);
        }
      }
    },
    [activeProjectId, reloadProjects, selectProject],
  );

  const generate = useCallback(
    async (payload: {
      user_prompt: string;
      role?: string;
      locks?: any;
      output?: any;
      parent_image_id?: string;
      branch_id?: string;
    }) => {
      if (!activeProjectId || !activeSessionId) throw new Error('Sem sessão ativa');
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Faça login');
      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: {
          project_id: activeProjectId,
          session_id: activeSessionId,
          ...payload,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await reloadImages(activeSessionId);
      return data;
    },
    [activeProjectId, activeSessionId, reloadImages],
  );

  return {
    loading,
    projects,
    sessions,
    images,
    activeProjectId,
    activeSessionId,
    activeProject: projects.find((p) => p.id === activeProjectId) || null,
    activeSession: sessions.find((s) => s.id === activeSessionId) || null,
    createProject,
    createSession,
    selectProject,
    selectSession,
    updateSessionDNA,
    setAnchor,
    setApproved,
    deleteImage,
    deleteProject,
    generate,
    reloadImages,
  };
}