import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getJiraOAuthUrl } from "@/lib/jira-oauth";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  const url = getJiraOAuthUrl(userId);
  return NextResponse.redirect(url);
}
