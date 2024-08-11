import { type AuthenticateOptions, Authenticator, Strategy } from "remix-auth";
import { sessionStorage } from "~/services/session.server";
import { db, type Tx } from "~/db/config.server";
import { type Role, type User, users } from "~/db/schema.server";
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";
import { v7 as uuidv7 } from "uuid";
import { type SessionStorage } from "@remix-run/node";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getValidatedFormData } from "remix-hook-form";
import type { FieldValues, NonUndefined, Resolver } from "react-hook-form";
import type { StrategyVerifyCallback } from "remix-auth/build/strategy";
import { loginSchema } from "~/services/auth-schema";

export type LoggedInUser = Pick<User, "id" | "email" | "role">;

type RemixHookReturn<T extends FieldValues> = Awaited<
  ReturnType<typeof getValidatedFormData<T>>
>;

type RemixHookErrors<T extends FieldValues> = NonUndefined<
  RemixHookReturn<T>["errors"]
>;

type RemixHookReceivedValues<T extends FieldValues> =
  RemixHookReturn<T>["receivedValues"];

export class RemixHookFormValidationError<T extends FieldValues> extends Error {
  errors: RemixHookErrors<T>;
  receivedValues: RemixHookReceivedValues<T>;

  constructor(
    errors: RemixHookErrors<T>,
    receivedValues: RemixHookReceivedValues<T>,
  ) {
    super();
    this.errors = errors;
    this.receivedValues = receivedValues;
  }
}

type RemixHookFormVerifyOptions<T extends z.Schema> = {
  values: z.infer<T>;
};

class RemixHookFormStrategy<User, Schema extends z.Schema> extends Strategy<
  User,
  RemixHookFormVerifyOptions<Schema>
> {
  readonly resolver: Resolver;

  constructor(
    schema: Schema,
    verify: StrategyVerifyCallback<User, RemixHookFormVerifyOptions<Schema>>,
  ) {
    super(verify);
    this.resolver = zodResolver(schema);
  }

  name = "remix-hook-form";

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions,
  ): Promise<User> {
    const { errors, data, receivedValues } = await getValidatedFormData(
      request,
      this.resolver,
    );
    if (errors) {
      return await this.failure(
        "There were errors in the form",
        request,
        sessionStorage,
        options,
        new RemixHookFormValidationError(errors, receivedValues),
      );
    }
    try {
      const user = await this.verify({ values: data });
      return this.success(user, request, sessionStorage, options);
    } catch (error) {
      if (error instanceof Error) {
        return await this.failure(
          error.message,
          request,
          sessionStorage,
          options,
          error,
        );
      }

      if (typeof error === "string") {
        return await this.failure(
          error,
          request,
          sessionStorage,
          options,
          new Error(error),
        );
      }

      return await this.failure(
        "Unknown error",
        request,
        sessionStorage,
        options,
        new Error(JSON.stringify(error, null, 2)),
      );
    }
  }
}

export const authenticator = new Authenticator<LoggedInUser>(sessionStorage);

authenticator.use(
  new RemixHookFormStrategy(
    loginSchema,
    async ({ values: { email, password } }) => {
      return await login(email, password);
    },
  ),
  "remix-hook-form",
);

async function login(email: string, password: string): Promise<LoggedInUser> {
  const user = await db.query.users.findFirst({
    columns: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
    },
    where: eq(users.email, email),
  });
  if (!user) {
    throw new Error("User does not exist");
  }

  const result = await argon2.verify(user.passwordHash, password).catch((e) => {
    console.error(`Error during argon2 verification: ${e}`);
    return undefined;
  });

  if (result === undefined) {
    throw new Error("An unknown error occurred while logging in.");
  }

  if (!result) {
    throw new Error("Passwords did not match");
  }

  return user;
}

export async function createUser(
  email: string,
  password: string,
  role: Role,
  tx: Tx = db,
): Promise<void> {
  const id = uuidv7();
  const passwordHash = await argon2.hash(password);
  await tx.insert(users).values({ id, email, passwordHash, role });
}
