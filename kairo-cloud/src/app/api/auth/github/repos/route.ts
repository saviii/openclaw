import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { fetchUserRepos } from "@/lib/github-oauth";
import { integrations } from "@/lib/schema";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "github")))
    .get();

  if (!integration) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const creds = JSON.parse(decrypt(integration.credentialsEncrypted));

  if (!creds.token) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 400 });
  }

  try {
    const repos = await fetchUserRepos(creds.token);
    return NextResponse.json({ repos });
  } catch (err) {
    console.error("Failed to fetch GitHub repos:", err);
    return NextResponse.json({ error: "Failed to load repositories" }, { status: 500 });
  }
}
