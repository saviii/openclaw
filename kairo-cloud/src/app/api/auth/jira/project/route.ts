import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/schema";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectKey } = await request.json();
  if (!projectKey) {
    return NextResponse.json({ error: "projectKey is required" }, { status: 400 });
  }

  const integration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "jira")))
    .get();

  if (!integration) {
    return NextResponse.json({ error: "Jira not connected" }, { status: 400 });
  }

  const meta = JSON.parse(integration.metadata || "{}");
  meta.projectKey = projectKey;
  meta.defaultIssueType = "Bug";

  await db
    .update(integrations)
    .set({ metadata: JSON.stringify(meta) })
    .where(eq(integrations.id, integration.id));

  return NextResponse.json({ ok: true });
}
