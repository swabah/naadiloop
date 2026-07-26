import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";

import { trpc } from "./trpc";

const handleAuthError = (error: unknown) => {
  const candidate = error as { data?: { code?: string } };
  if (candidate.data?.code !== "UNAUTHORIZED") return;
  localStorage.removeItem("naadi_jwt_token");
  localStorage.removeItem("naadi_user");
  if (window.location.pathname !== "/login") window.location.assign("/login");
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 3_000,
    },
  },
});

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL ?? "http://localhost:3001/trpc",
      headers: () => {
        const token = localStorage.getItem("naadi_jwt_token");
        return {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        };
      },
    }),
  ],
});
