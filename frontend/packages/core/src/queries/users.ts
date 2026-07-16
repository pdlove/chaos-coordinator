import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateDietaryTagRequest, CreateUserRequest, SetPinRequest, UpdateUserRequest } from "@chaos-coordinator/shared";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: api.getUsers });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["household"] });
  };
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: (req: CreateUserRequest) => api.createUser(req), onSuccess: invalidate });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateUserRequest }) => api.updateUser(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: (id: string) => api.deleteUser(id), onSuccess: invalidate });
}

export function useSetUserPin() {
  return useMutation({ mutationFn: ({ id, req }: { id: string; req: SetPinRequest }) => api.setUserPin(id, req) });
}

export function useSendAccountEmail() {
  return useMutation({ mutationFn: (id: string) => api.sendAccountEmail(id) });
}

export function useDietaryTags(userId: string | undefined) {
  return useQuery({
    queryKey: ["dietaryTags", userId],
    queryFn: () => api.getDietaryTags(userId!),
    enabled: !!userId,
  });
}

export function useAddDietaryTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, req }: { userId: string; req: CreateDietaryTagRequest }) => api.addDietaryTag(userId, req),
    onSuccess: (_, { userId }) => queryClient.invalidateQueries({ queryKey: ["dietaryTags", userId] }),
  });
}

export function useDeleteDietaryTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, tagId }: { userId: string; tagId: string }) => api.deleteDietaryTag(userId, tagId),
    onSuccess: (_, { userId }) => queryClient.invalidateQueries({ queryKey: ["dietaryTags", userId] }),
  });
}
