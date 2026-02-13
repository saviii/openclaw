import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSlackOAuthUrl } from "@/lib/slack-oauth";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  const url = getSlackOAuthUrl(userId);
  return NextResponse.redirect(url);
}
