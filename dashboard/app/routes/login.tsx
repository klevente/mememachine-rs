import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";
import {
  authenticator,
  RemixHookFormValidationError,
} from "~/services/auth.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useRemixForm } from "remix-hook-form";
import { FormLabel, FormMessage } from "~/components/ui/form";
import { type FieldErrors } from "react-hook-form";
import { AuthorizationError } from "remix-auth";
import {
  type LoginFormFields,
  loginSchemaResolver,
} from "~/services/auth-schema";
import { Loader2 } from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Mememachine :: Login" },
    {
      name: "description",
      content: "Admin panel login for Mememachine, the Discord soundboard bot",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return await authenticator.isAuthenticated(request, {
    successRedirect: "/",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    await authenticator.authenticate("remix-hook-form", request, {
      successRedirect: "/",
      throwOnError: true,
    });
  } catch (e) {
    if (e instanceof RemixHookFormValidationError) {
      return json({ errors: e.errors, defaultValues: e.receivedValues });
    }
    if (e instanceof AuthorizationError) {
      const errors = {
        root: {
          invalid: {
            type: "server",
            message: "Incorrect email or password. Please try again.",
          },
        },
      } satisfies FieldErrors<LoginFormFields>;
      return json({ errors });
    }
    throw e;
  }
}

export default function Login() {
  const {
    handleSubmit,
    formState: { errors },
    register,
  } = useRemixForm<LoginFormFields>({
    mode: "onSubmit",
    resolver: loginSchemaResolver,
  });

  const navigation = useNavigation();

  const isSigningIn = navigation.state !== "idle";

  return (
    <Card className="w-full mx-auto max-w-sm mt-52">
      <Form method="post" onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <FormLabel htmlFor="email" error={errors.email}>
              Email
            </FormLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              autoComplete="email"
              {...register("email")}
            />
            <FormMessage error={errors.email} />
          </div>
          <div className="grid gap-2">
            <FormLabel htmlFor="password" error={errors.password}>
              Password
            </FormLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              required
            />
            <FormMessage error={errors.password} />
          </div>
          <FormMessage error={errors.root?.invalid} />
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={isSigningIn}>
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
}
