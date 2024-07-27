import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { GlobalError } from "react-hook-form";

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email."),
  password: z.string().min(4, "Please provide at least 4 characters."),
});

export const loginSchemaResolver = zodResolver(loginSchema);

export type LoginSchema = z.infer<typeof loginSchema>;

export type LoginErrors = {
  root: {
    invalid: GlobalError;
  };
};

export type LoginFormFields = LoginSchema & LoginErrors;
