"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Authorization was denied. Please try again.",
  server_error: "Something went wrong. Please try again.",
  exchange_failed: "Failed to complete authorization. Please try again.",
};

export default function GitHubOnboardingPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const errorCode = searchParams.get("error");

  function handleConnect() {
    setLoading(true);
    window.location.href = "/api/auth/github/start";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-sm text-gray-500 mb-2">Step 3 of 4</div>
        <h1 className="text-3xl font-bold">Connect GitHub</h1>
        <p className="mt-3 text-gray-600">
          Kairo uses GitHub to understand your codebase — tracking PRs, issues, and branches so you
          always know what's shipping and what's blocked.
        </p>

        {errorCode && ERROR_MESSAGES[errorCode] && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {ERROR_MESSAGES[errorCode]}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Connect to GitHub"}
        </button>
      </div>
    </main>
  );
}
