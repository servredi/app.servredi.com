import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { customersTable } from "./customers";

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  status: text("status", { enum: ["draft", "sent", "approved", "rejected"] }).notNull().default("draft"),
  notes: text("notes"),
  taxRate: real("tax_rate").notNull().default(0),
  subtotal: real("subtotal").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const quoteItemsTable = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  quantity: real("quantity").notNull().default(1),
  unitCost: real("unit_cost").notNull().default(0),
  laborHours: real("labor_hours"),
  laborRate: real("labor_rate"),
  materialCost: real("material_cost"),
  lineTotal: real("line_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;

export const insertQuoteItemSchema = createInsertSchema(quoteItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItemsTable.$inferSelect;
