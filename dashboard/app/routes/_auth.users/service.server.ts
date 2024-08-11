import { db } from "~/db/config.server";
import { invitations, lower, users } from "~/db/schema.server";
import { eq } from "drizzle-orm";
import type { FieldErrors } from "react-hook-form";
import { v7 as uuidv7 } from "uuid";
import type { DeleteSchema, InviteSchema } from "~/routes/_auth.users/types";
import type { ReceivedValues } from "~/lib/utils";

export async function createInvitation(
  data: InviteSchema,
  receivedValues: ReceivedValues,
) {
  const lowercaseEmail = data.email.toLowerCase();

  try {
    return await db.transaction(async (tx) => {
      const existingUser = await tx
        .select()
        .from(users)
        .where(eq(lower(users.email), lowercaseEmail));
      if (existingUser.length) {
        const errors = {
          email: {
            type: "validate",
            message: "User already exists",
          },
        } as FieldErrors<InviteSchema>;
        return {
          errors,
          defaultValues: receivedValues,
        };
      }

      const existingInvitation = await tx
        .select()
        .from(invitations)
        .where(eq(lower(invitations.email), lowercaseEmail));
      if (existingInvitation.length) {
        const errors = {
          email: {
            type: "validate",
            message: "Invitation already exists",
          },
        } as FieldErrors<InviteSchema>;
        return {
          errors,
          defaultValues: receivedValues,
        };
      }

      const [insertedInvitation] = await tx
        .insert(invitations)
        .values({
          id: uuidv7(),
          email: lowercaseEmail,
        })
        .returning();

      await sendInvitationEmail(
        insertedInvitation.email,
        insertedInvitation.id,
      );

      return { success: true };
    });
  } catch (e) {
    console.error("Error occurred while creating invitation", e);
    return { success: false };
  }
}

export async function deleteInvitation(data: DeleteSchema) {
  try {
    await db.delete(invitations).where(eq(invitations.id, data.id));
    return { success: true };
  } catch (e) {
    console.error("Error occurred while deleting invitation", e);
    return { success: false };
  }
}

async function sendInvitationEmail(email: string, token: string) {
  console.log("sending email...", email, token);
}
