"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JiraOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    siteUrl: "",
    email: "",
    apiToken: "",
    projectKey: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/jira/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect to Jira");
        return;
      }

      router.push("/onboarding/github");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-sm text-gray-500 mb-2">Step 2 of 4</div>
        <h1 className="text-3xl font-bold">Connect Jira</h1>
        <p className="mt-3 text-gray-600">
          Kairo creates Jira tickets when bugs are reported in Slack. You'll need an API token from
          your Atlassian account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Jira Site URL</label>
            <input
              type="url"
              placeholder="https://your-team.atlassian.net"
              value={form.siteUrl}
              onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Atlassian Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">API Token</label>
            <input
              type="password"
              placeholder="ATATT3x..."
              value={form.apiToken}
              onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <a
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              Create an API token at id.atlassian.com
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Default Project Key</label>
            <input
              type="text"
              placeholder="PROJ"
              value={form.projectKey}
              onChange={(e) => setForm({ ...form, projectKey: e.target.value.toUpperCase() })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Connect Jira"}
          </button>
        </form>
      </div>
    </main>
  );
}
