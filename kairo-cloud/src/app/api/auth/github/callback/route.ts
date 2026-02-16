import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { exchangeGitHubCode } from "@/lib/github-oauth";
import { users, integrations } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/onboarding/github?error=denied", request.url));
  }

  try {
    const tokenResponse = await exchangeGitHubCode(code);

    // Ensure user exists in our database
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();

    if (!existingUser) {
      await db.insert(users).values({ id: userId, email: "" });
    }

    // Upsert GitHub integration
    const existing = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.type, "github")))
      .get();

    // Store as { token } to match provision route's githubCreds.token usage
    const credentials = encrypt(JSON.stringify({ token: tokenResponse.access_token }));

    const metadata = JSON.stringify({
      authMode: "oauth",
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
        type: "github",
        credentialsEncrypted: credentials,
        metadata,
      });
    }

    // Parse "from" from the OAuth state to handle settings reconnect flow
    const state = request.nextUrl.searchParams.get("state") || "";
    const from = state.includes(":") ? state.split(":")[1] : null;
    const redirectUrl = from
      ? `/onboarding/github/repo?from=${from}`
      : "/onboarding/github/repo";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    return NextResponse.redirect(new URL("/onboarding/github?error=server_error", request.url));
  }
}
