import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { instances } from "@/lib/schema";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const instance = await db.select().from(instances).where(eq(instances.userId, user.id)).get();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Integrations</h2>
          <div className="mt-4 space-y-3">
            <Link
              href="/settings/slack"
              className="block rounded-lg border px-4 py-3 hover:bg-gray-50"
            >
              <div className="font-medium">Slack</div>
              <div className="text-sm text-gray-500">Reconnect or change workspace</div>
            </Link>
            <Link
              href="/settings/jira"
              className="block rounded-lg border px-4 py-3 hover:bg-gray-50"
            >
              <div className="font-medium">Jira</div>
              <div className="text-sm text-gray-500">Update credentials or change project</div>
            </Link>
            <Link
              href="/settings/github"
              className="block rounded-lg border px-4 py-3 hover:bg-gray-50"
            >
              <div className="font-medium">GitHub</div>
              <div className="text-sm text-gray-500">Update token or change repository</div>
            </Link>
          </div>
        </div>

        {instance && instance.status !== "deleted" && (
          <div className="rounded-lg border border-red-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
            <p className="mt-2 text-sm text-gray-600">
              Delete your Kairo instance. This will stop the bot and remove all data.
            </p>
            <DeleteButton />
          </div>
        )}
      </div>
    </main>
  );
}

function DeleteButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { auth } = await import("@clerk/nextjs/server");
        const { userId } = await auth();
        if (!userId) {
          return;
        }
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/instance/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      }}
    >
      <button
        type="submit"
        className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
      >
        Delete Instance
      </button>
    </form>
  );
}
