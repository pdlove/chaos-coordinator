import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateProjectRequest, CreateProjectTaskRequest, UpdateProjectTaskRequest } from "@chaos-coordinator/shared";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.getProject(id!),
    enabled: !!id,
  });
}

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["projects"] });
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({ mutationFn: (req: CreateProjectRequest) => api.createProject(req), onSuccess: invalidate });
}

export function useAddProjectTask() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ projectId, req }: { projectId: string; req: CreateProjectTaskRequest }) => api.addProjectTask(projectId, req),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectTask() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateProjectTaskRequest }) => api.updateProjectTask(id, req),
    onSuccess: invalidate,
  });
}
