import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const conversationsTable = pgTable("hamaumin_conversations", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  ...timestamps,
});

export const messagesTable = pgTable("hamaumin_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasksTable = pgTable("hamaumin_tasks", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("New"),
  progress: integer("progress").notNull().default(0),
  steps: text("steps").array().notNull().default([]),
  currentStep: integer("current_step").notNull().default(0),
  errors: text("errors").array().notNull().default([]),
  priority: text("priority").notNull().default("Medium"),
  ...timestamps,
});

export const projectsTable = pgTable("hamaumin_projects", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  progress: integer("progress").notNull().default(0),
  buildStatus: text("build_status").notNull().default("Not started"),
  files: text("files").array().notNull().default([]),
  taskCount: integer("task_count").notNull().default(0),
  errors: text("errors").array().notNull().default([]),
  lastActivity: text("last_activity").notNull().default("پڕۆژەکە دروستکرا"),
  ...timestamps,
});

export const memoriesTable = pgTable("hamaumin_memories", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("گشتی"),
  enabled: boolean("enabled").notNull().default(true),
  ...timestamps,
});

export const themesTable = pgTable("hamaumin_themes", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  mode: text("mode").notNull().default("custom"),
  isApplied: boolean("is_applied").notNull().default(false),
  tokens: jsonb("tokens").$type<Record<string, string>>().notNull(),
  ...timestamps,
});

export const settingsTable = pgTable("hamaumin_settings", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull().unique(),
  language: text("language").notNull().default("ku"),
  themeMode: text("theme_mode").notNull().default("dark"),
  memoryEnabled: boolean("memory_enabled").notNull().default(true),
  voiceEnabled: boolean("voice_enabled").notNull().default(true),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  fontScale: text("font_scale").notNull().default("1"),
  density: text("density").notNull().default("comfortable"),
  ...timestamps,
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMemorySchema = createInsertSchema(memoriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertThemeSchema = createInsertSchema(themesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type Task = typeof tasksTable.$inferSelect;
export type Project = typeof projectsTable.$inferSelect;
export type Memory = typeof memoriesTable.$inferSelect;
export type Theme = typeof themesTable.$inferSelect;
export type Settings = typeof settingsTable.$inferSelect;