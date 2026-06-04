"use client";

/**
 * Authentication hooks.
 * Endpoints: POST /api/auth/login, POST /api/auth/register, GET /api/auth/google/status
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";
import type { AuthResponse } from "@/lib/api/types";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const authKeys = {
  googleStatus: ["auth", "google", "status"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Checks whether Google OAuth login is enabled on the backend.
 * Hits: GET /api/auth/google/status
 * Returns: UseQueryResult<{ enabled: boolean }>
 */
export function useGoogleAuthStatus() {
  return useQuery<{ enabled: boolean }>({
    queryKey: authKeys.googleStatus,
    queryFn: () => api.getGoogleAuthStatus(),
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Logs in with email + password.
 * Hits: POST /api/auth/login
 * Side-effect: calls setAuthToken() when a token is returned.
 *
 * @example
 * const { mutate } = useLoginWithEmail();
 * mutate({ email, password }, { onSuccess: () => router.replace("/") });
 */
export function useLoginWithEmail() {
  return useMutation<AuthResponse, Error, { email: string; password: string }>({
    mutationFn: ({ email, password }) => api.loginWithEmail(email, password),
    onSuccess: (data) => {
      if (data.token) setAuthToken(data.token);
    },
  });
}

/**
 * Registers a new account.
 * Hits: POST /api/auth/register
 * Side-effect: calls setAuthToken() when a token is returned.
 *
 * @example
 * const { mutate } = useRegister();
 * mutate({ email, password, displayName }, { onSuccess: () => router.replace("/") });
 */
export function useRegister() {
  return useMutation<AuthResponse, Error, { email: string; password: string; displayName?: string }>({
    mutationFn: ({ email, password, displayName }) => api.register(email, password, displayName),
    onSuccess: (data) => {
      if (data.token) setAuthToken(data.token);
    },
  });
}
