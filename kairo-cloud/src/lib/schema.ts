import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  name: text("name"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const integrations = sqliteTable("integrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["slack", "jira"] }).notNull(),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  metadata: text("metadata"), // JSON string for extra info (team name, site URL, etc.)
  installedAt: text("installed_at").default(sql`(datetime('now'))`),
});

export const instances = sqliteTable("instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  railwayServiceId: text("railway_service_id"),
  domain: text("domain"),
  gatewayToken: text("gateway_token").notNull(),
  status: text("status", {
    enum: ["provisioning", "running", "stopped", "error", "deleted"],
  }).default("provisioning"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
