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
  const { token, owner, repo } = body;

  if (!token || !owner || !repo) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Validate token by calling GitHub API
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return NextResponse.json({ error: "Invalid personal access token" }, { status: 400 });
      }
      return NextResponse.json(
        { error: `GitHub returned status ${userRes.status}` },
        { status: 400 },
      );
    }

    // Verify repo access
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!repoRes.ok) {
      return NextResponse.json(
        {
          error: `Repository "${owner}/${repo}" not found or not accessible with this token.`,
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not connect to GitHub. Check your network connection." },
      { status: 400 },
    );
  }

  // Ensure user exists
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

  const credentials = encrypt(JSON.stringify({ token }));
  const metadata = JSON.stringify({ owner, repo });

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

  return NextResponse.json({ ok: true });
}
