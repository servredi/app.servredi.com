import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, jobsTable, quotesTable, timeEntriesTable, customersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

async function getOrgIdAndProfile(clerkUserId: string) {
  const profile = await db.query.profilesTable.findFirst({ where: eq(profilesTable.clerkUserId, clerkUserId) });
  return { profile, orgId: profile?.organizationId ?? null };
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { orgId } = await getOrgIdAndProfile(userId);
  if (!orgId) {
    res.json({ jobsToday: 0, jobsInProgress: 0, jobsCompleted: 0, activeTechnicians: 0, openQuotes: 0, openQuotesValue: 0, hoursToday: 0, pendingJobs: 0 });
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const [allJobs, allQuotes, activeEntries] = await Promise.all([
      db.query.jobsTable.findMany({ where: eq(jobsTable.organizationId, orgId) }),
      db.query.quotesTable.findMany({ where: eq(quotesTable.organizationId, orgId) }),
      db.query.timeEntriesTable.findMany({ where: and(eq(timeEntriesTable.organizationId, orgId), isNull(timeEntriesTable.clockOutAt)) }),
    ]);

    const jobsToday = allJobs.filter(j => j.scheduledDate === today).length;
    const jobsInProgress = allJobs.filter(j => j.status === "in_progress").length;
    const jobsCompleted = allJobs.filter(j => j.status === "completed").length;
    const pendingJobs = allJobs.filter(j => j.status === "scheduled").length;
    const activeTechnicians = new Set(activeEntries.map(e => e.technicianId)).size;

    const openQuotes = allQuotes.filter(q => q.status === "draft" || q.status === "sent");
    const openQuotesValue = openQuotes.reduce((s, q) => s + q.total, 0);

    const todayEntries = activeEntries.filter(e => {
      const d = new Date(e.clockInAt).toISOString().split("T")[0];
      return d === today;
    });
    const hoursToday = todayEntries.reduce((s, e) => {
      const ms = Date.now() - new Date(e.clockInAt).getTime();
      return s + ms / 3600000;
    }, 0);

    res.json({
      jobsToday,
      jobsInProgress,
      jobsCompleted,
      activeTechnicians,
      openQuotes: openQuotes.length,
      openQuotesValue,
      hoursToday: Math.round(hoursToday * 10) / 10,
      pendingJobs,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { orgId } = await getOrgIdAndProfile(userId);
  if (!orgId) { res.json([]); return; }

  try {
    const [recentJobs, recentCustomers, recentQuotes] = await Promise.all([
      db.query.jobsTable.findMany({ where: eq(jobsTable.organizationId, orgId) }),
      db.query.customersTable.findMany({ where: eq(customersTable.organizationId, orgId) }),
      db.query.quotesTable.findMany({ where: eq(quotesTable.organizationId, orgId) }),
    ]);

    const activity: Array<{
      id: string;
      type: "job_created" | "job_updated" | "job_completed" | "customer_created" | "quote_created" | "clock_in" | "clock_out";
      description: string;
      relatedId: number | null;
      relatedType: string | null;
      timestamp: string;
    }> = [];

    for (const job of recentJobs.slice(-5)) {
      activity.push({
        id: `job-${job.id}`,
        type: job.status === "completed" ? "job_completed" : "job_created",
        description: job.status === "completed" ? `Job completed: ${job.title}` : `Job created: ${job.title}`,
        relatedId: job.id,
        relatedType: "job",
        timestamp: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt),
      });
    }

    for (const customer of recentCustomers.slice(-3)) {
      activity.push({
        id: `customer-${customer.id}`,
        type: "customer_created",
        description: `New customer: ${customer.name}`,
        relatedId: customer.id,
        relatedType: "customer",
        timestamp: customer.createdAt instanceof Date ? customer.createdAt.toISOString() : String(customer.createdAt),
      });
    }

    for (const quote of recentQuotes.slice(-3)) {
      activity.push({
        id: `quote-${quote.id}`,
        type: "quote_created",
        description: `Quote ${quote.status}: $${quote.total.toFixed(2)}`,
        relatedId: quote.id,
        relatedType: "quote",
        timestamp: quote.updatedAt instanceof Date ? quote.updatedAt.toISOString() : String(quote.updatedAt),
      });
    }

    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(activity.slice(0, 10));
  } catch (err) {
    req.log.error({ err }, "Error fetching activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/jobs-today", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { orgId } = await getOrgIdAndProfile(userId);
  if (!orgId) { res.json([]); return; }

  try {
    const today = new Date().toISOString().split("T")[0];
    const jobs = await db.query.jobsTable.findMany({ where: eq(jobsTable.organizationId, orgId) });
    const todayJobs = jobs.filter(j => j.scheduledDate === today);

    const customers = await db.query.customersTable.findMany({ where: eq(customersTable.organizationId, orgId) });
    const techs = await db.query.profilesTable.findMany({ where: eq(profilesTable.organizationId, orgId) });
    const custMap = new Map(customers.map(c => [c.id, c]));
    const techMap = new Map(techs.map(t => [t.id, t]));

    res.json(todayJobs.map(j => ({
      ...j,
      customerName: custMap.get(j.customerId)?.name ?? "",
      technicianName: j.technicianId
        ? (`${techMap.get(j.technicianId)?.firstName ?? ''} ${techMap.get(j.technicianId)?.lastName ?? ''}`.trim() || techMap.get(j.technicianId)?.email) ?? null
        : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching today's jobs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
