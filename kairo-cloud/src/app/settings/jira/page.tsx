"use client";

import Link from "next/link";
import { useState } from "react";

export default function JiraSettingsPage() {
  const [loading, setLoading] = useState(false);

  function handleReconnect() {
    setLoading(true);
    window.location.href = "/api/auth/jira/start";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">Jira Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-8">
        <p className="text-gray-600">
          Reconnect Jira to use a different Atlassian account or update permissions.
        </p>

        <button
          onClick={handleReconnect}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Reconnect Jira"}
        </button>
      </div>
    </main>
  );
}
