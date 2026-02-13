"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GitHubOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    token: "",
    owner: "",
    repo: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/github/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect to GitHub");
        return;
      }

      router.push("/onboarding/deploy");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Personal Access Token</label>
            <input
              type="password"
              placeholder="ghp_..."
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              Create a fine-grained token at github.com
            </a>
            <p className="mt-1 text-xs text-gray-400">
              Recommended scopes: Issues (read), Pull requests (read), Contents (read)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Repository Owner</label>
            <input
              type="text"
              placeholder="your-org"
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Repository Name</label>
            <input
              type="text"
              placeholder="your-repo"
              value={form.repo}
              onChange={(e) => setForm({ ...form, repo: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="w-full rounded-lg bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Connect GitHub"}
          </button>
        </form>
      </div>
    </main>
  );
}
