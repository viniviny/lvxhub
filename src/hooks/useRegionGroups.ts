// Manage custom region groups for batch publishing

import { useState, useCallback } from 'react';

export interface RegionGroup {
  id: string;
  name: string;
  storeIds: string[];
  createdAt: string;
}

const GROUPS_KEY = 'publify_region_groups';

function loadGroups(): RegionGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistGroups(groups: RegionGroup[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function useRegionGroups() {
  const [groups, setGroups] = useState<RegionGroup[]>(loadGroups);

  const addGroup = useCallback((name: string, storeIds: string[]): RegionGroup => {
    const group: RegionGroup = {
      id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      storeIds,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setGroups(prev => {
      const updated = [...prev, group];
      persistGroups(updated);
      return updated;
    });
    return group;
  }, []);

  const updateGroup = useCallback((id: string, name: string, storeIds: string[]) => {
    setGroups(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, name, storeIds } : g);
      persistGroups(updated);
      return updated;
    });
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups(prev => {
      const updated = prev.filter(g => g.id !== id);
      persistGroups(updated);
      return updated;
    });
  }, []);

  return { groups, addGroup, updateGroup, removeGroup };
}
