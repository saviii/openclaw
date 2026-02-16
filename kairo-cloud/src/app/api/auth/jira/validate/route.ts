import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { users, integrations } from "@/lib/schema";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { siteUrl, email, apiToken, projectKey } = body;

  if (!siteUrl || !email || !apiToken || !projectKey) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Normalize site URL
  const normalizedUrl = siteUrl.replace(/\/+$/, "");

  // Validate credentials by calling Jira API
  try {
    const authHeader = Buffer.from(`${email}:${apiToken}`).toString("base64");
    const res = await fetch(`${normalizedUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: "Invalid email or API token" }, { status: 400 });
      }
      return NextResponse.json({ error: `Jira returned status ${res.status}` }, { status: 400 });
    }

    // Verify the project exists
    const projectRes = await fetch(`${normalizedUrl}/rest/api/3/project/${projectKey}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (!projectRes.ok) {
      return NextResponse.json(
        {
          error: `Project "${projectKey}" not found. Check the project key and try again.`,
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not connect to Jira. Check the site URL." },
      { status: 400 },
    );
  }

  // Ensure user exists
  const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();

  if (!existingUser) {
    await db.insert(users).values({ id: userId, email });
  }

  // Upsert Jira integration
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "jira")))
    .get();

  const credentials = encrypt(JSON.stringify({ email, apiToken }));
  const metadata = JSON.stringify({
    siteUrl: normalizedUrl,
    projectKey,
    defaultIssueType: "Bug",
  });

  if (existing) {
    await db
      .update(integrations)
      .set({ credentialsEncrypted: credentials, metadata })
      .where(eq(integrations.id, existing.id));
  } else {
    await db.insert(integrations).values({
      userId,
      type: "jira",
      credentialsEncrypted: credentials,
      metadata,
    });
  }

  return NextResponse.json({ ok: true });
}
