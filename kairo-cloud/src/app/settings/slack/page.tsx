"use client";

import Link from "next/link";

export default function SlackSettingsPage() {
  function handleReconnect() {
    window.location.href = "/api/auth/slack/start";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">Slack Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-6 py-8">
        <p className="text-gray-600">
          Reconnect Slack to use a different workspace or refresh your connection.
        </p>
        <button
          onClick={handleReconnect}
          className="mt-6 w-full rounded-lg bg-[#4A154B] px-6 py-3 text-white font-medium hover:bg-[#3e1240]"
        >
          Reconnect Slack
        </button>
      </div>
    </main>
  );
}
