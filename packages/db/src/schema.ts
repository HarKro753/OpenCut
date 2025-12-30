import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  thumbnail: text("thumbnail"),
  metadata: jsonb("metadata").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}).enableRLS();
