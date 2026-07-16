import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSessionStore } from "../store/session";
import type { LoginRequest, SessionDto } from "@chaos-coordinator/shared";

export function useRegister() {
  return useMutation({ mutationFn: api.register });
}

export function usePasswordLogin() {
  const queryClient = useQueryClient();
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId);
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: api.loginWithPassword,
    onSuccess: (session) => {
      applySession(session, setCurrentUserId, setPinElevated);
      queryClient.setQueryData(["session"], session);
    },
  });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: api.verifyEmail });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId);
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: api.acceptInvite,
    onSuccess: (session) => {
      applySession(session, setCurrentUserId, setPinElevated);
      queryClient.setQueryData(["session"], session);
    },
  });
}

export function useSession() {
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId);
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const session = await api.getSession();
      applySession(session, setCurrentUserId, setPinElevated);
      return session;
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId);
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: (req: LoginRequest) => api.login(req),
    onSuccess: (session) => {
      applySession(session, setCurrentUserId, setPinElevated);
      queryClient.setQueryData(["session"], session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId);
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: (session) => {
      applySession(session, setCurrentUserId, setPinElevated);
      queryClient.setQueryData(["session"], session);
      queryClient.removeQueries(); // clear all cached data on logout
    },
  });
}

export function useSelectProfile() {
  const queryClient = useQueryClient();
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId);
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: api.selectProfile,
    onSuccess: (session) => {
      applySession(session, setCurrentUserId, setPinElevated);
      queryClient.setQueryData(["session"], session);
    },
  });
}

export function useVerifyPin() {
  const queryClient = useQueryClient();
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: api.verifyPin,
    onSuccess: (session) => {
      setPinElevated(session.pinElevated);
      queryClient.setQueryData(["session"], session);
    },
  });
}

export function useExitEditMode() {
  const queryClient = useQueryClient();
  const setPinElevated = useSessionStore((s) => s.setPinElevated);

  return useMutation({
    mutationFn: api.exitEditMode,
    onSuccess: (session) => {
      setPinElevated(session.pinElevated);
      queryClient.setQueryData(["session"], session);
    },
  });
}

function applySession(
  session: SessionDto,
  setCurrentUserId: (id: string | null) => void,
  setPinElevated: (elevated: boolean) => void
) {
  setCurrentUserId(session.currentUserId);
  setPinElevated(session.pinElevated);
}
