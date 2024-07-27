import dotenv from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

dotenv.config();

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_PATH: z.string(),
    SESSION_SECRET: z
      .string()
      .transform((s) => s.split(".").map((e) => e.trim())),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
