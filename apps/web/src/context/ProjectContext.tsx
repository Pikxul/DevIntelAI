'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { getProjects, Project } from '@/lib/api';

interface ProjectContextType {
  projects: Project[];
  selectedProjectId: string;
  selectedProject: Project | null;
  setSelectedProjectId: (id: string) => void;
  isLoading: boolean;
  error: any;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const orgId = (session as any)?.organizationId ?? '';

  const { data: projects = [], error, isLoading } = useSWR<Project[]>(
    orgId ? `projects:${orgId}` : null,
    () => getProjects(orgId),
    { revalidateOnFocus: false }
  );

  const [selectedProjectId, setSelectedProjectIdState] = useState<string>('');

  useEffect(() => {
    // Load from localStorage if present
    const stored = localStorage.getItem(`selectedProjectId:${orgId}`);
    if (stored) {
      setSelectedProjectIdState(stored);
    } else {
      setSelectedProjectIdState('');
    }
  }, [orgId]);

  const setSelectedProjectId = (id: string) => {
    setSelectedProjectIdState(id);
    localStorage.setItem(`selectedProjectId:${orgId}`, id);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProjectId,
        selectedProject,
        setSelectedProjectId,
        isLoading,
        error
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
