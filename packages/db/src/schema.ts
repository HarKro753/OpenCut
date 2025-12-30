import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  real,
  bigint,
  index,
} from "drizzle-orm/pg-core";

// Projects table (normalized)
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  thumbnail: text("thumbnail"),
  backgroundColor: text("background_color").default("#000000"),
  backgroundType: text("background_type", {
    enum: ["color", "blur"],
  }).default("color"),
  blurIntensity: integer("blur_intensity").default(8),
  fps: integer("fps").default(30).notNull(),
  canvasWidth: integer("canvas_width").default(1920).notNull(),
  canvasHeight: integer("canvas_height").default(1080).notNull(),
  canvasMode: text("canvas_mode", {
    enum: ["preset", "original", "custom"],
  })
    .default("preset")
    .notNull(),
  // Keep metadata for backwards compatibility during migration
  metadata: jsonb("metadata"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}).enableRLS();

// Scenes table
export const scenes = pgTable(
  "scenes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    isMain: boolean("is_main").default(false).notNull(),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    projectIdIdx: index("scenes_project_id_idx").on(table.projectId),
  })
).enableRLS();

// Project settings table
export const projectSettings = pgTable("project_settings", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  currentSceneId: text("current_scene_id").references(() => scenes.id),
  bookmarks: jsonb("bookmarks").$type<number[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}).enableRLS();

// Media table
export const media = pgTable(
  "media",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    type: text("type", { enum: ["image", "video", "audio"] }).notNull(),
    url: text("url").notNull(), // R2 URL for the media file
    size: integer("size").notNull(),
    lastModified: bigint("last_modified", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    duration: real("duration"),
    ephemeral: boolean("ephemeral").default(false),
    sourceStickerIconName: text("source_sticker_icon_name"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    projectIdIdx: index("media_project_id_idx").on(table.projectId),
  })
).enableRLS();

// Timelines table (per scene)
export const timelines = pgTable(
  "timelines",
  {
    id: text("id").primaryKey(),
    sceneId: text("scene_id")
      .references(() => scenes.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    tracks: jsonb("tracks").notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    sceneIdIdx: index("timelines_scene_id_idx").on(table.sceneId),
  })
).enableRLS();
