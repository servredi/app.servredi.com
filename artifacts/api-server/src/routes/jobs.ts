import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, customersTable, jobsTable, jobTasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateJobBody, UpdateJobBody, UpdateJobStatusBody,
  ListJobsQueryParams, GetJobParams, UpdateJobParams, DeleteJobParams,
  ListJobTasksParams, CreateJobTaskParams, CreateJobTaskBody,
  UpdateJobTaskParams, UpdateJobTaskBody, DeleteJobTaskParams,
} from "@workspace/api-zod";

const router = Router();

async function getOrgId(clerkUserId: string): Promise<number | null> {
  const profile = await db.query.profilesTable.findFirst({
    where: eq(profilesTable.clerkUserId, clerkUserId),
  });
  return profile?.organizationId ?? null;
}

function buildJobResponse(job: any, customer: any, tech: any) {
  return {
    ...job,
    customerName: customer?.name ?? "",
    technicianName: tech ? `${tech.firstName ?? ''} ${tech.lastName ?? ''}`.trim() || tech.email : null,
  };
}

router.get("/jobs", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListJobsQueryParams.safeParse(req.query);
  const orgId = await getOrgId(userId);
  if (!orgId) { res.json([]); return; }

  try {
    const jobs = await db.query.jobsTable.findMany({
      where: eq(jobsTable.organizationId, orgId),
    });

    const customers = await db.query.customersTable.findMany({ where: eq(customersTable.organizationId, orgId) });
    const techs = await db.query.profilesTable.findMany({ where: eq(profilesTable.organizationId, orgId) });
    const custMap = new Map(customers.map(c => [c.id, c]));
    const techMap = new Map(techs.map(t => [t.id, t]));

    let result = jobs.map(j => buildJobResponse(j, custMap.get(j.customerId), j.technicianId ? techMap.get(j.technicianId) : null));

    if (params.success) {
      if (params.data.status) result = result.filter(j => j.status === params.data.status);
      if (params.data.technicianId) result = result.filter(j => j.technicianId === params.data.technicianId);
      if (params.data.date) result = result.filter(j => j.scheduledDate === params.data.date);
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing jobs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/jobs", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const orgId = await getOrgId(userId);
  if (!orgId) { res.status(400).json({ error: "No organization" }); return; }

  try {
    const [job] = await db.insert(jobsTable).values({ ...parsed.data, organizationId: orgId }).returning();
    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, job.customerId) });
    const tech = job.technicianId ? await db.query.profilesTable.findFirst({ where: eq(profilesTable.id, job.technicianId) }) : null;
    res.status(201).json(buildJobResponse(job, customer, tech));
  } catch (err) {
    req.log.error({ err }, "Error creating job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetJobParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const job = await db.query.jobsTable.findFirst({
      where: and(eq(jobsTable.id, params.data.id), orgId ? eq(jobsTable.organizationId, orgId) : undefined),
    });
    if (!job) { res.status(404).json({ error: "Not found" }); return; }

    const [customer, tech, tasks] = await Promise.all([
      db.query.customersTable.findFirst({ where: eq(customersTable.id, job.customerId) }),
      job.technicianId ? db.query.profilesTable.findFirst({ where: eq(profilesTable.id, job.technicianId) }) : Promise.resolve(null),
      db.query.jobTasksTable.findMany({ where: eq(jobTasksTable.jobId, job.id) }),
    ]);

    res.json({ ...buildJobResponse(job, customer, tech), tasks });
  } catch (err) {
    req.log.error({ err }, "Error fetching job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/jobs/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateJobParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const [job] = await db.update(jobsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(jobsTable.id, params.data.id), orgId ? eq(jobsTable.organizationId, orgId) : undefined))
      .returning();
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const [customer, tech] = await Promise.all([
      db.query.customersTable.findFirst({ where: eq(customersTable.id, job.customerId) }),
      job.technicianId ? db.query.profilesTable.findFirst({ where: eq(profilesTable.id, job.technicianId) }) : Promise.resolve(null),
    ]);
    res.json(buildJobResponse(job, customer, tech));
  } catch (err) {
    req.log.error({ err }, "Error updating job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteJobParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const orgId = await getOrgId(userId);
  try {
    await db.delete(jobsTable).where(
      and(eq(jobsTable.id, params.data.id), orgId ? eq(jobsTable.organizationId, orgId) : undefined)
    );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/jobs/:id/status", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetJobParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateJobStatusBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const orgId = await getOrgId(userId);
  try {
    const [job] = await db.update(jobsTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(eq(jobsTable.id, params.data.id), orgId ? eq(jobsTable.organizationId, orgId) : undefined))
      .returning();
    if (!job) { res.status(404).json({ error: "Not found" }); return; }
    const [customer, tech] = await Promise.all([
      db.query.customersTable.findFirst({ where: eq(customersTable.id, job.customerId) }),
      job.technicianId ? db.query.profilesTable.findFirst({ where: eq(profilesTable.id, job.technicianId) }) : Promise.resolve(null),
    ]);
    res.json(buildJobResponse(job, customer, tech));
  } catch (err) {
    req.log.error({ err }, "Error updating job status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Job Tasks ───────────────────────────────────────────────────────────────

router.get("/jobs/:jobId/tasks", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListJobTasksParams.safeParse({ jobId: Number(req.params.jobId) });
  if (!params.success) { res.status(400).json({ error: "Invalid jobId" }); return; }

  try {
    const tasks = await db.query.jobTasksTable.findMany({
      where: eq(jobTasksTable.jobId, params.data.jobId),
    });
    res.json(tasks);
  } catch (err) {
    req.log.error({ err }, "Error listing tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/jobs/:jobId/tasks", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = CreateJobTaskParams.safeParse({ jobId: Number(req.params.jobId) });
  const parsed = CreateJobTaskBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  try {
    const [task] = await db.insert(jobTasksTable).values({
      ...parsed.data,
      jobId: params.data.jobId,
    }).returning();
    res.status(201).json(task);
  } catch (err) {
    req.log.error({ err }, "Error creating task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/jobs/:jobId/tasks/:taskId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateJobTaskParams.safeParse({ jobId: Number(req.params.jobId), taskId: Number(req.params.taskId) });
  const parsed = UpdateJobTaskBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  try {
    const [task] = await db.update(jobTasksTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(jobTasksTable.id, params.data.taskId), eq(jobTasksTable.jobId, params.data.jobId)))
      .returning();
    if (!task) { res.status(404).json({ error: "Not found" }); return; }
    res.json(task);
  } catch (err) {
    req.log.error({ err }, "Error updating task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/jobs/:jobId/tasks/:taskId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteJobTaskParams.safeParse({ jobId: Number(req.params.jobId), taskId: Number(req.params.taskId) });
  if (!params.success) { res.status(400).json({ error: "Invalid request" }); return; }

  try {
    await db.delete(jobTasksTable).where(
      and(eq(jobTasksTable.id, params.data.taskId), eq(jobTasksTable.jobId, params.data.jobId))
    );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
