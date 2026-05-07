import { relations } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { profilesTable } from "./profiles";
import { customersTable } from "./customers";
import { jobsTable } from "./jobs";
import { jobTasksTable } from "./job_tasks";
import { timeEntriesTable } from "./time_entries";
import { quotesTable } from "./quotes";
import { quoteItemsTable } from "./quotes";

export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
  profiles: many(profilesTable),
  customers: many(customersTable),
  jobs: many(jobsTable),
  timeEntries: many(timeEntriesTable),
  quotes: many(quotesTable),
}));

export const profilesRelations = relations(profilesTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [profilesTable.organizationId],
    references: [organizationsTable.id],
  }),
  assignedJobs: many(jobsTable),
  timeEntries: many(timeEntriesTable),
}));

export const customersRelations = relations(customersTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [customersTable.organizationId],
    references: [organizationsTable.id],
  }),
  jobs: many(jobsTable),
  quotes: many(quotesTable),
}));

export const jobsRelations = relations(jobsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [jobsTable.organizationId],
    references: [organizationsTable.id],
  }),
  customer: one(customersTable, {
    fields: [jobsTable.customerId],
    references: [customersTable.id],
  }),
  technician: one(profilesTable, {
    fields: [jobsTable.technicianId],
    references: [profilesTable.id],
  }),
  tasks: many(jobTasksTable),
  timeEntries: many(timeEntriesTable),
}));

export const jobTasksRelations = relations(jobTasksTable, ({ one }) => ({
  job: one(jobsTable, {
    fields: [jobTasksTable.jobId],
    references: [jobsTable.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntriesTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [timeEntriesTable.organizationId],
    references: [organizationsTable.id],
  }),
  technician: one(profilesTable, {
    fields: [timeEntriesTable.technicianId],
    references: [profilesTable.id],
  }),
  job: one(jobsTable, {
    fields: [timeEntriesTable.jobId],
    references: [jobsTable.id],
  }),
  task: one(jobTasksTable, {
    fields: [timeEntriesTable.taskId],
    references: [jobTasksTable.id],
  }),
}));

export const quotesRelations = relations(quotesTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [quotesTable.organizationId],
    references: [organizationsTable.id],
  }),
  customer: one(customersTable, {
    fields: [quotesTable.customerId],
    references: [customersTable.id],
  }),
  items: many(quoteItemsTable),
}));

export const quoteItemsRelations = relations(quoteItemsTable, ({ one }) => ({
  quote: one(quotesTable, {
    fields: [quoteItemsTable.quoteId],
    references: [quotesTable.id],
  }),
}));
