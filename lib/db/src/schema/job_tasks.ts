import { pgTable, serial, text, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobsTable } from "./jobs";

export const jobTasksTable = pgTable("job_tasks", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobTaskSchema = createInsertSchema(jobTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobTask = z.infer<typeof insertJobTaskSchema>;
export type JobTask = typeof jobTasksTable.$inferSelect;
