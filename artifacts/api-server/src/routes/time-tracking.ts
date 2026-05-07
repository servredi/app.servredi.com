import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, timeEntriesTable, jobsTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import {
  CreateTimeEntryBody, ClockOutBody, ClockOutParams, UpdateBreakBody, UpdateBreakParams,
  ListTimeEntriesQueryParams,
} from "@workspace/api-zod";

const router = Router();

async function getProfile(clerkUserId: string) {
  return db.query.profilesTable.findFirst({ where: eq(profilesTable.clerkUserId, clerkUserId) });
}

function buildEntryResponse(entry: any, tech: any, job: any) {
  const clockIn = new Date(entry.clockInAt).getTime();
  const clockOut = entry.clockOutAt ? new Date(entry.clockOutAt).getTime() : null;
  const totalMinutes = clockOut ? Math.floor((clockOut - clockIn) / 60000) - entry.breakMinutes : null;

  return {
    ...entry,
    clockInAt: entry.clockInAt instanceof Date ? entry.clockInAt.toISOString() : entry.clockInAt,
    clockOutAt: entry.clockOutAt instanceof Date ? entry.clockOutAt.toISOString() : entry.clockOutAt,
    technicianName: tech ? `${tech.firstName ?? ''} ${tech.lastName ?? ''}`.trim() || tech.email : "",
    jobTitle: job?.title ?? null,
    totalMinutes,
    isActive: !entry.clockOutAt,
  };
}

router.get("/time-entries", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const profile = await getProfile(userId);
  if (!profile?.organizationId) { res.json([]); return; }

  const params = ListTimeEntriesQueryParams.safeParse(req.query);

  try {
    let entries = await db.query.timeEntriesTable.findMany({
      where: eq(timeEntriesTable.organizationId, profile.organizationId),
      orderBy: [desc(timeEntriesTable.clockInAt)],
    });

    if (params.success) {
      if (params.data.technicianId) entries = entries.filter(e => e.technicianId === params.data.technicianId);
      if (params.data.jobId) entries = entries.filter(e => e.jobId === params.data.jobId);
    }

    const techIds = [...new Set(entries.map(e => e.technicianId))];
    const jobIds = [...new Set(entries.map(e => e.jobId).filter(Boolean))] as number[];

    const [techs, jobs] = await Promise.all([
      db.query.profilesTable.findMany({ where: eq(profilesTable.organizationId, profile.organizationId) }),
      jobIds.length > 0 ? db.query.jobsTable.findMany({ where: eq(jobsTable.organizationId, profile.organizationId) }) : Promise.resolve([]),
    ]);

    const techMap = new Map(techs.map(t => [t.id, t]));
    const jobMap = new Map(jobs.map(j => [j.id, j]));

    res.json(entries.map(e => buildEntryResponse(e, techMap.get(e.technicianId), e.jobId ? jobMap.get(e.jobId) : null)));
  } catch (err) {
    req.log.error({ err }, "Error listing time entries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/time-entries", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const profile = await getProfile(userId);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  if (!profile.organizationId) { res.status(400).json({ error: "No organization" }); return; }

  try {
    const [entry] = await db.insert(timeEntriesTable).values({
      ...parsed.data,
      organizationId: profile.organizationId,
      technicianId: profile.id,
      clockInAt: new Date(),
    }).returning();

    const job = entry.jobId ? await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, entry.jobId) }) : null;
    res.status(201).json(buildEntryResponse(entry, profile, job));
  } catch (err) {
    req.log.error({ err }, "Error creating time entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/time-entries/active", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const profile = await getProfile(userId);
  if (!profile) { res.json({ entry: null }); return; }

  try {
    const entry = await db.query.timeEntriesTable.findFirst({
      where: and(eq(timeEntriesTable.technicianId, profile.id), isNull(timeEntriesTable.clockOutAt)),
      orderBy: [desc(timeEntriesTable.clockInAt)],
    });

    if (!entry) { res.json({ entry: null }); return; }

    const job = entry.jobId ? await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, entry.jobId) }) : null;
    res.json({ entry: buildEntryResponse(entry, profile, job) });
  } catch (err) {
    req.log.error({ err }, "Error fetching active entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/time-entries/:id/clock-out", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ClockOutParams.safeParse({ id: Number(req.params.id) });
  const parsed = ClockOutBody.safeParse(req.body);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const profile = await getProfile(userId);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  try {
    const [entry] = await db.update(timeEntriesTable)
      .set({ clockOutAt: new Date(), ...(parsed.success ? { notes: parsed.data.notes } : {}), updatedAt: new Date() })
      .where(and(eq(timeEntriesTable.id, params.data.id), eq(timeEntriesTable.technicianId, profile.id)))
      .returning();
    if (!entry) { res.status(404).json({ error: "Not found" }); return; }

    const job = entry.jobId ? await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, entry.jobId) }) : null;
    res.json(buildEntryResponse(entry, profile, job));
  } catch (err) {
    req.log.error({ err }, "Error clocking out");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/time-entries/:id/break", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateBreakParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateBreakBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const profile = await getProfile(userId);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  try {
    const existing = await db.query.timeEntriesTable.findFirst({
      where: and(eq(timeEntriesTable.id, params.data.id), eq(timeEntriesTable.technicianId, profile.id)),
    });
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    let newBreakMinutes = existing.breakMinutes;
    if (parsed.data.action === "end" && parsed.data.breakMinutes) {
      newBreakMinutes += parsed.data.breakMinutes;
    }

    const [entry] = await db.update(timeEntriesTable)
      .set({ breakMinutes: newBreakMinutes, updatedAt: new Date() })
      .where(eq(timeEntriesTable.id, params.data.id))
      .returning();

    const job = entry.jobId ? await db.query.jobsTable.findFirst({ where: eq(jobsTable.id, entry.jobId) }) : null;
    res.json(buildEntryResponse(entry, profile, job));
  } catch (err) {
    req.log.error({ err }, "Error updating break");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
