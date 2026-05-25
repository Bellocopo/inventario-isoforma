import { z } from "zod";

const schema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_USE_EMULATORS: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(
    "Env inválido. Confira .env.local contra .env.example.\n" +
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
}

export const env = parsed.data;
