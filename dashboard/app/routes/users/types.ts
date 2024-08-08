import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const INTENTS = {
  createInvitation: "create-invitation",
  resendInvitation: "resend-invitation",
  deleteInvitation: "delete-invitation",
} as const;

const inviteSchema = z.object({
  intent: z.literal(INTENTS.createInvitation),
  email: z.string().email("Please provide a valid email."),
});

const resendSchema = z.object({
  intent: z.literal(INTENTS.resendInvitation),
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  intent: z.literal(INTENTS.deleteInvitation),
  id: z.string().uuid(),
});

export const usersSchema = z.discriminatedUnion("intent", [
  inviteSchema,
  resendSchema,
  deleteSchema,
]);

export const inviteSchemaResolver = zodResolver(inviteSchema);
export const usersSchemaResolver = zodResolver(usersSchema);

export type UsersSchema = z.infer<typeof usersSchema>;

export type CreateInvitationSchema = z.infer<typeof inviteSchema>;
export type DeleteInvitationSchema = z.infer<typeof deleteSchema>;
export type ResendInvitationSchema = z.infer<typeof resendSchema>;
