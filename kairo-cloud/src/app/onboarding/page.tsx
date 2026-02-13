import { currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { integrations, instances } from "@/lib/schema";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Check what's already connected
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

  const githubIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.type, "github")))
    .get();

  const instance = await db.select().from(instances).where(eq(instances.userId, user.id)).get();

  // Route to the right step
  if (!slackIntegration) {
    redirect("/onboarding/slack");
  }
  if (!jiraIntegration) {
    redirect("/onboarding/jira");
  }
  if (!githubIntegration) {
    redirect("/onboarding/github");
  }
  if (!instance) {
    redirect("/onboarding/deploy");
  }
  redirect("/dashboard");
}
