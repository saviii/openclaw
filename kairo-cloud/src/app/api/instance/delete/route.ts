import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteService } from "@/lib/railway";
import { instances } from "@/lib/schema";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const instance = await db.select().from(instances).where(eq(instances.userId, userId)).get();

  if (!instance) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  try {
    if (instance.railwayServiceId) {
      await deleteService(instance.railwayServiceId);
    }

    await db.update(instances).set({ status: "deleted" }).where(eq(instances.id, instance.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete instance error:", err);
    return NextResponse.json({ error: "Failed to delete instance" }, { status: 500 });
  }
}
