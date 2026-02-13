import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instances } from "@/lib/schema";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const instance = await db.select().from(instances).where(eq(instances.userId, userId)).get();

  if (!instance) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  return NextResponse.json({
    status: instance.status,
    domain: instance.domain,
    errorMessage: instance.errorMessage,
  });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Mark instance as running (called after health check succeeds)
  await db.update(instances).set({ status: "running" }).where(eq(instances.userId, userId));

  return NextResponse.json({ ok: true });
}
