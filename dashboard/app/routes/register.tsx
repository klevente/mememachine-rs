import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
} from "@remix-run/node";
import { db } from "~/db/config.server";
import { eq } from "drizzle-orm";
import { invitations } from "~/db/schema.server";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { FormLabel, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authenticator, createUser } from "~/services/auth.server";

export const meta: MetaFunction = () => {
  return [{ title: "Mememachine :: Register" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/",
  });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    throw redirect("/");
  }

  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.id, token),
  });

  if (!invitation) {
    throw redirect("/");
  }

  return json({
    success: true,
    email: invitation.email,
    token,
  } as const);
}

const registerSchema = z.object({
  password: z
    .string()
    .min(8, "Your password must be at least 8 characters long."),
  email: z.string().email(),
  token: z.string().uuid(),
});

const registerSchemaResolver = zodResolver(registerSchema);

type RegisterSchema = z.infer<typeof registerSchema>;

export async function action({ request }: ActionFunctionArgs) {
  const { errors, data, receivedValues } =
    await getValidatedFormData<RegisterSchema>(request, registerSchemaResolver);

  if (errors) {
    return json({ errors, defaultValues: receivedValues });
  }

  await db.transaction(async (tx) => {
    await createUser(data.email, data.password, "editor", tx);
    await tx.delete(invitations).where(eq(invitations.id, data.token));
  });

  return redirect(`/login?email=${data.email}`);
}

export default function Register() {
  const { email, token } = useLoaderData<typeof loader>();

  const {
    handleSubmit,
    formState: { errors },
    register,
  } = useRemixForm<RegisterSchema>({
    mode: "onSubmit",
    resolver: registerSchemaResolver,
  });

  const navigation = useNavigation();

  const isRegistering = navigation.state !== "idle";

  return (
    <Card className="w-full mx-auto max-w-md mt-52">
      <Form method="post" onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>
            Hey {email}! Please provide a password below to register an account.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <input
            type="hidden"
            {...register("email", {
              value: email,
            })}
          />
          <input
            type="hidden"
            {...register("token", {
              value: token,
            })}
          />
          <div className="grid gap-2">
            <FormLabel htmlFor="password" error={errors.password}>
              Password
            </FormLabel>
            <Input
              id="password"
              type="password"
              {...register("password")}
              required
            />
            <FormMessage error={errors.password} />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={isRegistering}>
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering
              </>
            ) : (
              "Register"
            )}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
}
