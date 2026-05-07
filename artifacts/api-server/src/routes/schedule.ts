import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, customersTable, jobsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { GetScheduleQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/schedule", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetScheduleQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: "startDate and endDate are required" }); return; }

  const profile = await db.query.profilesTable.findFirst({ where: eq(profilesTable.clerkUserId, userId) });
  if (!profile?.organizationId) { res.json([]); return; }

  try {
    const jobs = await db.query.jobsTable.findMany({
      where: and(
        eq(jobsTable.organizationId, profile.organizationId),
        jobsTable.scheduledDate !== null ? gte(jobsTable.scheduledDate, params.data.startDate) : undefined,
      ),
    });

    const filteredJobs = jobs.filter(j => {
      if (!j.scheduledDate) return false;
      return j.scheduledDate >= params.data.startDate && j.scheduledDate <= params.data.endDate;
    });

    const customers = await db.query.customersTable.findMany({ where: eq(customersTable.organizationId, profile.organizationId) });
    const techs = await db.query.profilesTable.findMany({ where: eq(profilesTable.organizationId, profile.organizationId) });
    const custMap = new Map(customers.map(c => [c.id, c]));
    const techMap = new Map(techs.map(t => [t.id, t]));

    let result = filteredJobs.map(j => ({
      jobId: j.id,
      title: j.title,
      customerName: custMap.get(j.customerId)?.name ?? "",
      technicianId: j.technicianId,
      technicianName: j.technicianId
        ? (`${techMap.get(j.technicianId)?.firstName ?? ''} ${techMap.get(j.technicianId)?.lastName ?? ''}`.trim() || techMap.get(j.technicianId)?.email) ?? null
        : null,
      status: j.status,
      priority: j.priority,
      scheduledDate: j.scheduledDate!,
      startTime: j.startTime,
      endTime: j.endTime,
      address: j.address,
    }));

    if (params.data.technicianId) {
      result = result.filter(e => e.technicianId === params.data.technicianId);
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error fetching schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
