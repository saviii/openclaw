"use client";

import { useState } from "react";

export default function SlackOnboardingPage() {
  const [loading, setLoading] = useState(false);

  function handleConnect() {
    setLoading(true);
    // Redirect to Slack OAuth — the server-side redirect handles state generation
    window.location.href = "/api/auth/slack/start";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-sm text-gray-500 mb-2">Step 1 of 3</div>
        <h1 className="text-3xl font-bold">Connect Slack</h1>
        <p className="mt-3 text-gray-600">
          Kairo lives in your Slack workspace. When someone reports a bug, Kairo automatically
          creates a Jira ticket and responds in the thread.
        </p>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">What Kairo can do in Slack:</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-green-600">&#10003;</span>
              Read messages when @mentioned
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">&#10003;</span>
              Respond in threads with Jira ticket links
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">&#10003;</span>
              React to messages to acknowledge bugs
            </li>
          </ul>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#4A154B] px-6 py-3 text-white font-medium hover:bg-[#3e1240] disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Add to Slack"}
        </button>
      </div>
    </main>
  );
}
