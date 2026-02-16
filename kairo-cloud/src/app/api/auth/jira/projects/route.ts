import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { encrypt } from "@/lib/encryption";
import { fetchJiraProjects, refreshJiraToken } from "@/lib/jira-oauth";
import { integrations } from "@/lib/schema";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "jira")))
    .get();

  if (!integration) {
    return NextResponse.json({ error: "Jira not connected" }, { status: 400 });
  }

  const creds = JSON.parse(decrypt(integration.credentialsEncrypted));
  const meta = JSON.parse(integration.metadata || "{}");

  if (!meta.cloudId || !creds.accessToken) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 400 });
  }

  // Refresh token if expiring within 5 minutes
  let accessToken = creds.accessToken;
  const BUFFER_MS = 5 * 60 * 1000;
  if (creds.expiresAt && creds.expiresAt < Date.now() + BUFFER_MS) {
    try {
      const newTokens = await refreshJiraToken(creds.refreshToken);
      const newExpiresAt = Date.now() + newTokens.expires_in * 1000;
      accessToken = newTokens.access_token;

      await db
        .update(integrations)
        .set({
          credentialsEncrypted: encrypt(
            JSON.stringify({
              accessToken: newTokens.access_token,
              refreshToken: newTokens.refresh_token,
              expiresAt: newExpiresAt,
            }),
          ),
        })
        .where(eq(integrations.id, integration.id));
    } catch (err) {
      console.error("Token refresh failed:", err);
      return NextResponse.json({ error: "Token expired, please reconnect Jira" }, { status: 401 });
    }
  }

  try {
    const projects = await fetchJiraProjects(accessToken, meta.cloudId);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Failed to fetch Jira projects:", err);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}
