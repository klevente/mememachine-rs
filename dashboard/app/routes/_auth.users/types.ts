import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const inviteSchema = z.object({
  email: z.string().email("Please provide a valid email."),
});

export const inviteSchemaResolver = zodResolver(inviteSchema);

export type InviteSchema = z.infer<typeof inviteSchema>;

export const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const deleteSchemaResolver = zodResolver(deleteSchema);

export type DeleteSchema = z.infer<typeof deleteSchema>;
