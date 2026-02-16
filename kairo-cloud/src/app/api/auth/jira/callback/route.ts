import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeJiraCode, getAccessibleResources } from "@/lib/jira-oauth";
import { users, integrations } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/onboarding/jira?error=denied", request.url));
  }

  try {
    const tokenResponse = await exchangeJiraCode(code);
    const resources = await getAccessibleResources(tokenResponse.access_token);

    if (resources.length === 0) {
      return NextResponse.redirect(new URL("/onboarding/jira?error=no_sites", request.url));
    }

    // Use the first accessible Jira Cloud site
    const site = resources[0];

    // Ensure user exists in our database
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();

    if (!existingUser) {
      await db.insert(users).values({ id: userId, email: "" });
    }

    // Upsert Jira integration
    const existing = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.type, "jira")))
      .get();

    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

    const credentials = encrypt(
      JSON.stringify({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      }),
    );

    const metadata = JSON.stringify({
      authMode: "oauth",
      cloudId: site.id,
      siteUrl: site.url,
      siteName: site.name,
      scopes: tokenResponse.scope,
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

    return NextResponse.redirect(new URL("/onboarding/jira/project", request.url));
  } catch (err) {
    console.error("Jira OAuth callback error:", err);
    return NextResponse.redirect(new URL("/onboarding/jira?error=server_error", request.url));
  }
}
