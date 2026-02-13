import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createService, setServiceVariables, createServiceDomain } from "@/lib/railway";
import { integrations, instances } from "@/lib/schema";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if instance already exists
  const existing = await db.select().from(instances).where(eq(instances.userId, userId)).get();

  if (existing && existing.status !== "error" && existing.status !== "deleted") {
    return NextResponse.json(
      { error: "Instance already exists", domain: existing.domain },
      { status: 409 },
    );
  }

  // Get integrations
  const slackIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "slack")))
    .get();

  const jiraIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "jira")))
    .get();

  const githubIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "github")))
    .get();

  if (!slackIntegration || !jiraIntegration || !githubIntegration) {
    return NextResponse.json(
      { error: "Please connect Slack, Jira, and GitHub first" },
      { status: 400 },
    );
  }

  // Decrypt credentials
  const slackCreds = JSON.parse(decrypt(slackIntegration.credentialsEncrypted));
  const jiraCreds = JSON.parse(decrypt(jiraIntegration.credentialsEncrypted));
  const jiraMeta = JSON.parse(jiraIntegration.metadata || "{}");
  const githubCreds = JSON.parse(decrypt(githubIntegration.credentialsEncrypted));
  const githubMeta = JSON.parse(githubIntegration.metadata || "{}");

  const gatewayToken = randomBytes(32).toString("hex");
  const serviceName = `kairo-${userId.slice(0, 12).toLowerCase()}`;

  try {
    // 1. Create Railway service
    const serviceId = await createService(serviceName);

    // 2. Set environment variables
    await setServiceVariables(serviceId, {
      SLACK_BOT_TOKEN: slackCreds.botToken,
      SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN!,
      JIRA_BASE_URL: jiraMeta.siteUrl,
      JIRA_EMAIL: jiraCreds.email,
      JIRA_API_TOKEN: jiraCreds.apiToken,
      JIRA_PROJECT_KEY: jiraMeta.projectKey,
      JIRA_DEFAULT_ISSUE_TYPE: jiraMeta.defaultIssueType || "Bug",
      GITHUB_TOKEN: githubCreds.token,
      GITHUB_OWNER: githubMeta.owner,
      GITHUB_REPO: githubMeta.repo,
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
      OPENCLAW_GATEWAY_PORT: "3000",
      OPENCLAW_STATE_DIR: "/home/node/.openclaw",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
      NODE_ENV: "production",
    });

    // 3. Create domain
    const domain = await createServiceDomain(serviceId);

    // 4. Save instance
    if (existing) {
      await db
        .update(instances)
        .set({
          railwayServiceId: serviceId,
          domain,
          gatewayToken,
          status: "provisioning",
          errorMessage: null,
        })
        .where(eq(instances.id, existing.id));
    } else {
      await db.insert(instances).values({
        userId,
        railwayServiceId: serviceId,
        domain,
        gatewayToken,
        status: "provisioning",
      });
    }

    return NextResponse.json({ ok: true, domain, serviceId });
  } catch (err) {
    console.error("Provisioning error:", err);

    // Save error state
    await db.insert(instances).values({
      userId,
      gatewayToken,
      status: "error",
      errorMessage: String(err),
    });

    return NextResponse.json({ error: "Failed to provision instance" }, { status: 500 });
  }
}
