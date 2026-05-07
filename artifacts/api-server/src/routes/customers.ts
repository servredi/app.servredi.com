import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, customersTable, jobsTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { CreateCustomerBody, UpdateCustomerBody, ListCustomersQueryParams, GetCustomerParams, UpdateCustomerParams, DeleteCustomerParams, GetCustomerJobsParams } from "@workspace/api-zod";

const router = Router();

async function getOrgId(clerkUserId: string): Promise<number | null> {
  const profile = await db.query.profilesTable.findFirst({
    where: eq(profilesTable.clerkUserId, clerkUserId),
  });
  return profile?.organizationId ?? null;
}

router.get("/customers", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListCustomersQueryParams.safeParse(req.query);
  const orgId = await getOrgId(userId);
  if (!orgId) { res.json([]); return; }

  try {
    let query = db.select({
      id: customersTable.id,
      organizationId: customersTable.organizationId,
      name: customersTable.name,
      company: customersTable.company,
      email: customersTable.email,
      phone: customersTable.phone,
      address: customersTable.address,
      city: customersTable.city,
      state: customersTable.state,
      zip: customersTable.zip,
      notes: customersTable.notes,
      createdAt: customersTable.createdAt,
      updatedAt: customersTable.updatedAt,
      totalJobs: sql<number>`(SELECT COUNT(*) FROM jobs WHERE jobs.customer_id = ${customersTable.id})`.mapWith(Number),
    }).from(customersTable).where(eq(customersTable.organizationId, orgId));

    const rows = await query;

    if (params.success && params.data.search) {
      const search = params.data.search.toLowerCase();
      const filtered = rows.filter(c =>
        c.name.toLowerCase().includes(search) ||
        (c.company?.toLowerCase().includes(search) ?? false) ||
        (c.email?.toLowerCase().includes(search) ?? false)
      );
      res.json(filtered);
      return;
    }

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) { res.status(400).json({ error: "No organization. Update your profile first." }); return; }

  try {
    const [customer] = await db.insert(customersTable).values({
      ...parsed.data,
      organizationId: orgId,
    }).returning();
    res.status(201).json({ ...customer, totalJobs: 0 });
  } catch (err) {
    req.log.error({ err }, "Error creating customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const rows = await db.select({
      id: customersTable.id,
      organizationId: customersTable.organizationId,
      name: customersTable.name,
      company: customersTable.company,
      email: customersTable.email,
      phone: customersTable.phone,
      address: customersTable.address,
      city: customersTable.city,
      state: customersTable.state,
      zip: customersTable.zip,
      notes: customersTable.notes,
      createdAt: customersTable.createdAt,
      updatedAt: customersTable.updatedAt,
      totalJobs: sql<number>`(SELECT COUNT(*) FROM jobs WHERE jobs.customer_id = ${customersTable.id})`.mapWith(Number),
    }).from(customersTable).where(
      and(eq(customersTable.id, params.data.id), orgId ? eq(customersTable.organizationId, orgId) : undefined)
    );

    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Error fetching customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateCustomerParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const [updated] = await db.update(customersTable).set({
      ...parsed.data,
      updatedAt: new Date(),
    }).where(and(eq(customersTable.id, params.data.id), orgId ? eq(customersTable.organizationId, orgId) : undefined))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, totalJobs: 0 });
  } catch (err) {
    req.log.error({ err }, "Error updating customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    await db.delete(customersTable).where(
      and(eq(customersTable.id, params.data.id), orgId ? eq(customersTable.organizationId, orgId) : undefined)
    );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id/jobs", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetCustomerJobsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const jobs = await db.select().from(jobsTable).where(
      and(eq(jobsTable.customerId, params.data.id), orgId ? eq(jobsTable.organizationId, orgId) : undefined)
    );

    const customer = await db.query.customersTable.findFirst({
      where: eq(customersTable.id, params.data.id),
    });

    const techs = await db.query.profilesTable.findMany({
      where: eq(profilesTable.organizationId, orgId ?? 0),
    });
    const techMap = new Map(techs.map(t => [t.id, `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email]));

    res.json(jobs.map(j => ({
      ...j,
      customerName: customer?.name ?? "",
      technicianName: j.technicianId ? techMap.get(j.technicianId) ?? null : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching customer jobs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
