import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, jobsTable, timeEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetEmployeeHoursReportQueryParams, GetJobsSummaryReportQueryParams } from "@workspace/api-zod";

const router = Router();

async function getOrgId(clerkUserId: string): Promise<number | null> {
  const profile = await db.query.profilesTable.findFirst({ where: eq(profilesTable.clerkUserId, clerkUserId) });
  return profile?.organizationId ?? null;
}

router.get("/reports/employee-hours", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetEmployeeHoursReportQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: "startDate and endDate required" }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) { res.json([]); return; }

  try {
    const entries = await db.query.timeEntriesTable.findMany({ where: eq(timeEntriesTable.organizationId, orgId) });
    const filtered = entries.filter(e => {
      const d = new Date(e.clockInAt).toISOString().split("T")[0];
      return d >= params.data.startDate && d <= params.data.endDate;
    });

    const techs = await db.query.profilesTable.findMany({ where: eq(profilesTable.organizationId, orgId) });
    const techMap = new Map(techs.map(t => [t.id, t]));

    const byTech = new Map<number, { totalHours: number; breakHours: number; jobsWorked: Set<number>; entries: number }>();

    for (const e of filtered) {
      if (!byTech.has(e.technicianId)) byTech.set(e.technicianId, { totalHours: 0, breakHours: 0, jobsWorked: new Set(), entries: 0 });
      const rec = byTech.get(e.technicianId)!;
      const clockIn = new Date(e.clockInAt).getTime();
      const clockOut = e.clockOutAt ? new Date(e.clockOutAt).getTime() : Date.now();
      rec.totalHours += (clockOut - clockIn) / 3600000;
      rec.breakHours += e.breakMinutes / 60;
      if (e.jobId) rec.jobsWorked.add(e.jobId);
      rec.entries++;
    }

    const result = Array.from(byTech.entries()).map(([techId, data]) => {
      const tech = techMap.get(techId);
      return {
        technicianId: techId,
        technicianName: tech ? `${tech.firstName ?? ''} ${tech.lastName ?? ''}`.trim() || tech.email : `Tech #${techId}`,
        totalHours: Math.round(data.totalHours * 100) / 100,
        breakHours: Math.round(data.breakHours * 100) / 100,
        netHours: Math.round((data.totalHours - data.breakHours) * 100) / 100,
        jobsWorked: data.jobsWorked.size,
        entries: data.entries,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error generating employee hours report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/jobs-summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetJobsSummaryReportQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: "startDate and endDate required" }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) {
    res.json({ totalJobs: 0, completedJobs: 0, cancelledJobs: 0, inProgressJobs: 0, scheduledJobs: 0, completionRate: 0, statusBreakdown: [], priorityBreakdown: [] });
    return;
  }

  try {
    const jobs = await db.query.jobsTable.findMany({ where: eq(jobsTable.organizationId, orgId) });
    const filtered = jobs.filter(j => {
      if (!j.scheduledDate) return true;
      return j.scheduledDate >= params.data.startDate && j.scheduledDate <= params.data.endDate;
    });

    const statusCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();

    for (const j of filtered) {
      statusCounts.set(j.status, (statusCounts.get(j.status) ?? 0) + 1);
      priorityCounts.set(j.priority, (priorityCounts.get(j.priority) ?? 0) + 1);
    }

    const total = filtered.length;
    const completed = statusCounts.get("completed") ?? 0;

    res.json({
      totalJobs: total,
      completedJobs: completed,
      cancelledJobs: statusCounts.get("cancelled") ?? 0,
      inProgressJobs: statusCounts.get("in_progress") ?? 0,
      scheduledJobs: statusCounts.get("scheduled") ?? 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
      priorityBreakdown: Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority, count })),
    });
  } catch (err) {
    req.log.error({ err }, "Error generating jobs summary report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/technicians", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) { res.json([]); return; }

  try {
    const techs = await db.query.profilesTable.findMany({ where: eq(profilesTable.organizationId, orgId) });
    res.json(techs.map(t => ({ ...t, organizationName: null })));
  } catch (err) {
    req.log.error({ err }, "Error fetching technicians");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
