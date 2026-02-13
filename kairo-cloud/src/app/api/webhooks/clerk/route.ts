import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteService } from "@/lib/railway";
import { users, instances } from "@/lib/schema";

export async function POST(request: NextRequest) {
  // In production, verify the Clerk webhook signature here
  const body = await request.json();

  if (body.type === "user.deleted") {
    const userId = body.data?.id;
    if (!userId) {
      return NextResponse.json({ ok: true });
    }

    // Clean up Railway instance
    const instance = await db.select().from(instances).where(eq(instances.userId, userId)).get();

    if (instance?.railwayServiceId) {
      try {
        await deleteService(instance.railwayServiceId);
      } catch (err) {
        console.error("Failed to delete Railway service on user deletion:", err);
      }
    }

    // Cascade delete handles integrations and instances
    await db.delete(users).where(eq(users.id, userId));
  }

  return NextResponse.json({ ok: true });
}
