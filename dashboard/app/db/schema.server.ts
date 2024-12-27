import { SQL, sql } from "drizzle-orm";
import {
  AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export function lower(email: AnySQLiteColumn): SQL {
  return sql`lower(${email})`;
}

export const users = sqliteTable(
  "users",
  {
    id: text("id").notNull().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "editor"] }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userEmailUniqueIndex: uniqueIndex("userEmailUniqueIndex").on(
      lower(table.email),
    ),
  }),
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").notNull().primaryKey(),
    email: text("email").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    invitationEmailUniqueIndex: uniqueIndex("invitationEmailUniqueIndex").on(
      lower(table.email),
    ),
  }),
);

export const soundPlays = sqliteTable("sound_plays", {
  soundName: text("sound_name").notNull(),
  isRandom: integer("is_random", { mode: "boolean" }),
  recordedAt: text("recorded_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferInsert;
export type Role = User["role"];
export type Invitation = typeof invitations.$inferInsert;
