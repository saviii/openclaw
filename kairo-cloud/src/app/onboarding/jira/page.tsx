"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Authorization was denied. Please try again.",
  no_sites: "No Jira Cloud sites found for your account.",
  server_error: "Something went wrong. Please try again.",
  exchange_failed: "Failed to complete authorization. Please try again.",
};

export default function JiraOnboardingPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const errorCode = searchParams.get("error");

  function handleConnect() {
    setLoading(true);
    window.location.href = "/api/auth/jira/start";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-sm text-gray-500 mb-2">Step 2 of 4</div>
        <h1 className="text-3xl font-bold">Connect Jira</h1>
        <p className="mt-3 text-gray-600">
          Kairo creates Jira tickets when bugs are reported in Slack. Click below to authorize
          access to your Atlassian account.
        </p>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">What Kairo can do in Jira:</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-green-600">&#10003;</span>
              Create bug tickets from Slack reports
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">&#10003;</span>
              Search existing issues to avoid duplicates
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">&#10003;</span>
              Update issue status and add comments
            </li>
          </ul>
        </div>

        {errorCode && ERROR_MESSAGES[errorCode] && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {ERROR_MESSAGES[errorCode]}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Connect to Jira"}
        </button>
      </div>
    </main>
  );
}
