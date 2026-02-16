import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { integrations, instances } from "@/lib/schema";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const instance = await db.select().from(instances).where(eq(instances.userId, user.id)).get();

  const slackIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.type, "slack")))
    .get();

  const jiraIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.type, "jira")))
    .get();

  if (!instance || !slackIntegration || !jiraIntegration) {
    redirect("/onboarding");
  }

  const slackMeta = slackIntegration.metadata ? JSON.parse(slackIntegration.metadata) : {};
  const jiraMeta = jiraIntegration.metadata ? JSON.parse(jiraIntegration.metadata) : {};

  const isRunning = instance.status === "running";

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Kairo</h1>
        <UserButton />
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Instance Status */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Instance</h2>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${isRunning ? "bg-green-500" : "bg-yellow-500"}`}
                />
                <span className="text-sm text-gray-600 capitalize">{instance.status}</span>
              </div>
            </div>
            {instance.domain && isRunning && (
              <a
                href={`https://${instance.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800"
              >
                Open Kairo Dashboard
              </a>
            )}
          </div>
          {instance.errorMessage && (
            <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {instance.errorMessage}
            </div>
          )}
        </div>

        {/* Integrations */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Integrations</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-green-600">&#10003;</span>
                <div>
                  <div className="font-medium">Slack</div>
                  <div className="text-sm text-gray-500">{slackMeta.teamName || "Connected"}</div>
                </div>
              </div>
              <Link href="/settings/slack" className="text-sm text-blue-600 hover:underline">
                Reconnect
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-green-600">&#10003;</span>
                <div>
                  <div className="font-medium">Jira</div>
                  <div className="text-sm text-gray-500">
                    {jiraMeta.siteUrl
                      ? `${jiraMeta.siteUrl} / ${jiraMeta.projectKey}`
                      : "Connected"}
                  </div>
                </div>
              </div>
              <Link href="/settings/jira" className="text-sm text-blue-600 hover:underline">
                Reconnect
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Quick Start</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p>
              1. Go to your Slack workspace and <strong>@mention Kairo</strong> in any channel.
            </p>
            <p>2. Describe a bug — Kairo will create a Jira ticket and respond with the link.</p>
            <p>3. You can also DM Kairo directly to triage bugs or search Jira.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
