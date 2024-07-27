import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seedAdminUser } from "~/db/seed.server";
import { db } from "~/db/config.server";

// Automatically run migrations on startup
migrate(db, {
  migrationsFolder: "app/db/migrations",
});

// Seed admin user if starting for the first time
await seedAdminUser();
