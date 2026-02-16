import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getGitHubOAuthUrl } from "@/lib/github-oauth";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const from = request.nextUrl.searchParams.get("from");
  const state = from ? `${userId}:${from}` : userId;

  const url = getGitHubOAuthUrl(state);
  return NextResponse.redirect(url);
}
