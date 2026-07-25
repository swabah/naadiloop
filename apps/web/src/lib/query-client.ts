import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { getDemoRole } from "./role";
import { trpc } from "./trpc";

export const queryClient = new QueryClient({
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
          "x-demo-role": getDemoRole(),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        };
      },
    }),
  ],
});

