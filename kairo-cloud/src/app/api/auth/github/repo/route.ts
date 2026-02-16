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

  const { owner, repo } = await request.json();
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
  }

  const integration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "github")))
    .get();

  if (!integration) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const meta = JSON.parse(integration.metadata || "{}");
  meta.owner = owner;
  meta.repo = repo;

  await db
    .update(integrations)
    .set({ metadata: JSON.stringify(meta) })
    .where(eq(integrations.id, integration.id));

  return NextResponse.json({ ok: true });
}
