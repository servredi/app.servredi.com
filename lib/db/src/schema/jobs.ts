import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { customersTable } from "./customers";
import { profilesTable } from "./profiles";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  technicianId: integer("technician_id").references(() => profilesTable.id),
  status: text("status", { enum: ["scheduled", "in_progress", "completed", "cancelled", "on_hold"] }).notNull().default("scheduled"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  scheduledDate: text("scheduled_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours"),
  notes: text("notes"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
