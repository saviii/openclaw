"use client";

import Link from "next/link";
import { useState } from "react";

export default function GitHubSettingsPage() {
  const [loading, setLoading] = useState(false);

  function handleReconnect() {
    setLoading(true);
    window.location.href = "/api/auth/github/start?from=settings";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">GitHub Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-8">
        <p className="text-gray-600">
          Reconnect GitHub to use a different account or change the tracked repository.
        </p>

        <button
          onClick={handleReconnect}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Reconnect GitHub"}
        </button>
      </div>
    </main>
  );
}
