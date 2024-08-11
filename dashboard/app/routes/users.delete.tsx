import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { deleteInvitation } from "~/routes/_auth.users/service.server";
import { getValidatedFormData } from "remix-hook-form";
import {
  type DeleteSchema,
  deleteSchemaResolver,
} from "~/routes/_auth.users/types";

export async function action({ request }: ActionFunctionArgs) {
  const currentUser = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (currentUser.role !== "admin") {
    return redirect("/");
  }

  const { errors, data } = await getValidatedFormData<DeleteSchema>(
    request,
    deleteSchemaResolver,
  );

  if (errors) {
    console.warn("Validation error when deleting invitation:", errors);
    return json({ success: false });
  }

  return json(await deleteInvitation(data));
}
