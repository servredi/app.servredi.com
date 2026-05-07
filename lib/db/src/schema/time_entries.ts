import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { profilesTable } from "./profiles";
import { jobsTable } from "./jobs";
import { jobTasksTable } from "./job_tasks";

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id),
  technicianId: integer("technician_id").notNull().references(() => profilesTable.id),
  jobId: integer("job_id").references(() => jobsTable.id),
  taskId: integer("task_id").references(() => jobTasksTable.id),
  clockInAt: timestamp("clock_in_at", { withTimezone: true }).notNull().defaultNow(),
  clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
  breakMinutes: integer("break_minutes").notNull().default(0),
  notes: text("notes"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;
