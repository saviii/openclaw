import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { users, integrations } from "@/lib/schema";
import { exchangeSlackCode } from "@/lib/slack-oauth";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/onboarding/slack?error=denied", request.url));
  }

  try {
    const slackResponse = await exchangeSlackCode(code);

    if (!slackResponse.ok) {
      console.error("Slack OAuth error:", slackResponse.error);
      return NextResponse.redirect(new URL("/onboarding/slack?error=exchange_failed", request.url));
    }

    // Ensure user exists in our database
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();

    if (!existingUser) {
      await db.insert(users).values({ id: userId, email: "" });
    }

    // Upsert Slack integration
    const existing = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.type, "slack")))
      .get();

    const credentials = encrypt(JSON.stringify({ botToken: slackResponse.access_token }));
    const metadata = JSON.stringify({
      teamId: slackResponse.team.id,
      teamName: slackResponse.team.name,
      botUserId: slackResponse.bot_user_id,
      appId: slackResponse.app_id,
      scopes: slackResponse.scope,
    });

    if (existing) {
      await db
        .update(integrations)
        .set({ credentialsEncrypted: credentials, metadata })
        .where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values({
        userId,
        type: "slack",
        credentialsEncrypted: credentials,
        metadata,
      });
    }

    return NextResponse.redirect(new URL("/onboarding/jira", request.url));
  } catch (err) {
    console.error("Slack OAuth callback error:", err);
    return NextResponse.redirect(new URL("/onboarding/slack?error=server_error", request.url));
  }
}
