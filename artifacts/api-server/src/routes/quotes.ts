import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, customersTable, quotesTable, quoteItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateQuoteBody, UpdateQuoteBody, ListQuotesQueryParams,
  GetQuoteParams, UpdateQuoteParams, DeleteQuoteParams,
  AddQuoteItemParams, AddQuoteItemBody,
  UpdateQuoteItemParams, UpdateQuoteItemBody, DeleteQuoteItemParams,
} from "@workspace/api-zod";

const router = Router();

async function getOrgId(clerkUserId: string): Promise<number | null> {
  const profile = await db.query.profilesTable.findFirst({ where: eq(profilesTable.clerkUserId, clerkUserId) });
  return profile?.organizationId ?? null;
}

async function recalcQuote(quoteId: number) {
  const items = await db.query.quoteItemsTable.findMany({ where: eq(quoteItemsTable.quoteId, quoteId) });
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const quote = await db.query.quotesTable.findFirst({ where: eq(quotesTable.id, quoteId) });
  if (!quote) return;
  const taxAmount = subtotal * (quote.taxRate / 100);
  const total = subtotal + taxAmount;
  await db.update(quotesTable).set({ subtotal, taxAmount, total, updatedAt: new Date() }).where(eq(quotesTable.id, quoteId));
}

function calcLineTotal(item: { quantity: number; unitCost: number; laborHours?: number | null; laborRate?: number | null; materialCost?: number | null }) {
  const labor = (item.laborHours ?? 0) * (item.laborRate ?? 0);
  const material = item.materialCost ?? 0;
  return item.quantity * item.unitCost + labor + material;
}

router.get("/quotes", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) { res.json([]); return; }

  const params = ListQuotesQueryParams.safeParse(req.query);

  try {
    let quotes = await db.query.quotesTable.findMany({ where: eq(quotesTable.organizationId, orgId) });

    if (params.success) {
      if (params.data.status) quotes = quotes.filter(q => q.status === params.data.status);
      if (params.data.customerId) quotes = quotes.filter(q => q.customerId === params.data.customerId);
    }

    const customers = await db.query.customersTable.findMany({ where: eq(customersTable.organizationId, orgId) });
    const custMap = new Map(customers.map(c => [c.id, c]));

    res.json(quotes.map(q => ({ ...q, customerName: custMap.get(q.customerId)?.name ?? "" })));
  } catch (err) {
    req.log.error({ err }, "Error listing quotes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = CreateQuoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) { res.status(400).json({ error: "No organization" }); return; }

  try {
    const [quote] = await db.insert(quotesTable).values({ ...parsed.data, organizationId: orgId, taxRate: parsed.data.taxRate ?? 0 }).returning();
    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, quote.customerId) });
    res.status(201).json({ ...quote, customerName: customer?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "Error creating quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quotes/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const [quote, items] = await Promise.all([
      db.query.quotesTable.findFirst({ where: and(eq(quotesTable.id, params.data.id), orgId ? eq(quotesTable.organizationId, orgId) : undefined) }),
      db.query.quoteItemsTable.findMany({ where: eq(quoteItemsTable.quoteId, params.data.id) }),
    ]);
    if (!quote) { res.status(404).json({ error: "Not found" }); return; }
    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, quote.customerId) });
    res.json({ ...quote, customerName: customer?.name ?? "", items });
  } catch (err) {
    req.log.error({ err }, "Error fetching quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/quotes/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateQuoteParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateQuoteBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const [quote] = await db.update(quotesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(quotesTable.id, params.data.id), orgId ? eq(quotesTable.organizationId, orgId) : undefined))
      .returning();
    if (!quote) { res.status(404).json({ error: "Not found" }); return; }

    if (parsed.data.taxRate !== undefined) await recalcQuote(params.data.id);
    const updated = await db.query.quotesTable.findFirst({ where: eq(quotesTable.id, params.data.id) });
    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, quote.customerId) });
    res.json({ ...updated, customerName: customer?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "Error updating quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/quotes/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    await db.delete(quotesTable).where(and(eq(quotesTable.id, params.data.id), orgId ? eq(quotesTable.organizationId, orgId) : undefined));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes/:id/items", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = AddQuoteItemParams.safeParse({ id: Number(req.params.id) });
  const parsed = AddQuoteItemBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  try {
    const lineTotal = calcLineTotal(parsed.data);
    const [item] = await db.insert(quoteItemsTable).values({ ...parsed.data, quoteId: params.data.id, lineTotal }).returning();
    await recalcQuote(params.data.id);
    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Error adding quote item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/quotes/:id/items/:itemId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateQuoteItemParams.safeParse({ id: Number(req.params.id), itemId: Number(req.params.itemId) });
  const parsed = UpdateQuoteItemBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  try {
    const existing = await db.query.quoteItemsTable.findFirst({ where: eq(quoteItemsTable.id, params.data.itemId) });
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const merged = { ...existing, ...parsed.data };
    const lineTotal = calcLineTotal(merged);
    const [item] = await db.update(quoteItemsTable).set({ ...parsed.data, lineTotal, updatedAt: new Date() }).where(eq(quoteItemsTable.id, params.data.itemId)).returning();
    await recalcQuote(params.data.id);
    res.json(item);
  } catch (err) {
    req.log.error({ err }, "Error updating quote item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/quotes/:id/items/:itemId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteQuoteItemParams.safeParse({ id: Number(req.params.id), itemId: Number(req.params.itemId) });
  if (!params.success) { res.status(400).json({ error: "Invalid request" }); return; }

  try {
    await db.delete(quoteItemsTable).where(eq(quoteItemsTable.id, params.data.itemId));
    await recalcQuote(params.data.id);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting quote item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
