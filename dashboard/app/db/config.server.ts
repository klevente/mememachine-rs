import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

import * as schema from "./schema.server";
import { env } from "~/config/env.server";

export const db = drizzle(new Database(env.DATABASE_PATH), {
  schema,
});

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Tx = Transaction | typeof db;
