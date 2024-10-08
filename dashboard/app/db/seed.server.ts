import { db } from "./config.server";
import { createUser } from "~/services/auth.server";
import { env } from "~/config/env.server";
import { count } from "drizzle-orm";
import { users } from "~/db/schema.server";

export async function seedAdminUser() {
  const [{ value }] = await db.select({ value: count() }).from(users);
  if (value !== 0) {
    console.log("Route already exist, not adding admin user again.");
    return;
  }
  console.log("No _auth.users in DB, creating admin user...");
  await createUser(env.ADMIN_EMAIL, env.ADMIN_PASSWORD, "admin");
  console.log("Admin user successfully created!");
}
