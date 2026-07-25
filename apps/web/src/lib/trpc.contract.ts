import type { trpc } from "./trpc";

type LoginInput = Parameters<ReturnType<typeof trpc.auth.login.useMutation>["mutate"]>[0];

export const validLoginInput: LoginInput = { email: "provider@naadi.demo" };

// Compile-time contract check: this expected error proves AppRouter rejects invalid input.
// @ts-expect-error auth.login.email must be a string.
const invalidLoginInput: LoginInput = { email: 42 };

void invalidLoginInput;
