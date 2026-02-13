"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JiraSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    siteUrl: "",
    email: "",
    apiToken: "",
    projectKey: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
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

      setSuccess(true);
      setTimeout(() => router.push("/settings"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <p className="text-gray-600">Update your Jira connection.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Jira Site URL</label>
            <input
              type="url"
              placeholder="https://your-team.atlassian.net"
              value={form.siteUrl}
              onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Key</label>
            <input
              type="text"
              placeholder="PROJ"
              value={form.projectKey}
              onChange={(e) => setForm({ ...form, projectKey: e.target.value.toUpperCase() })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Jira connected! Redirecting...
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Update Jira"}
          </button>
        </form>
      </div>
    </main>
  );
}
