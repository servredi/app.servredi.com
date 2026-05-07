import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateMyProfileBody } from "@workspace/api-zod";

const router = Router();

async function ensureProfile(clerkUserId: string, email: string) {
  let profile = await db.query.profilesTable.findFirst({
    where: eq(profilesTable.clerkUserId, clerkUserId),
    with: { organization: true },
  });

  if (!profile) {
    const [newProfile] = await db
      .insert(profilesTable)
      .values({ clerkUserId, email, role: "admin" })
      .returning();
    profile = { ...newProfile, organization: null };
  }

  return profile;
}

router.get("/profile/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const email = (req as any).auth?.sessionClaims?.email as string ?? "";
    const profile = await ensureProfile(userId, email);

    let organizationName: string | null = null;
    if (profile.organizationId) {
      const org = await db.query.organizationsTable.findFirst({
        where: eq(organizationsTable.id, profile.organizationId),
      });
      organizationName = org?.name ?? null;
    }

    res.json({
      ...profile,
      organizationName,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const email = (req as any).auth?.sessionClaims?.email as string ?? "";
    const existing = await ensureProfile(userId, email);
    const { organizationName, ...profileFields } = parsed.data;

    let organizationId = existing.organizationId;

    if (organizationName !== undefined) {
      if (organizationId) {
        await db
          .update(organizationsTable)
          .set({ name: organizationName, updatedAt: new Date() })
          .where(eq(organizationsTable.id, organizationId));
      } else {
        const [org] = await db
          .insert(organizationsTable)
          .values({ name: organizationName })
          .returning();
        organizationId = org.id;
      }
    }

    const [updated] = await db
      .update(profilesTable)
      .set({ ...profileFields, organizationId, updatedAt: new Date() })
      .where(eq(profilesTable.clerkUserId, userId))
      .returning();

    let orgName: string | null = null;
    if (organizationId) {
      const org = await db.query.organizationsTable.findFirst({
        where: eq(organizationsTable.id, organizationId),
      });
      orgName = org?.name ?? null;
    }

    res.json({ ...updated, organizationName: orgName });
  } catch (err) {
    req.log.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
