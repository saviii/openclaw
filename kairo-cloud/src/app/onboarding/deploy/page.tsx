"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Status = "idle" | "provisioning" | "checking" | "ready" | "error";

export default function DeployPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleDeploy() {
    setStatus("provisioning");
    setError("");

    try {
      const res = await fetch("/api/provision", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Provisioning failed");
        setStatus("error");
        return;
      }

      // Poll for health
      setStatus("checking");
      const domain = data.domain;
      let attempts = 0;
      const maxAttempts = 30; // 30 * 5s = 2.5 minutes

      const interval = setInterval(async () => {
        attempts++;
        try {
          const healthRes = await fetch(`https://${domain}/health`);
          if (healthRes.ok) {
            clearInterval(interval);
            setStatus("ready");
            // Update instance status
            await fetch("/api/instance/status", { method: "POST" });
            setTimeout(() => router.push("/dashboard"), 2000);
          }
        } catch {
          // Container not ready yet
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError("Your instance is taking longer than expected. Check back in a few minutes.");
          setStatus("error");
        }
      }, 5000);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    handleDeploy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-sm text-gray-500 mb-2">Step 3 of 3</div>
        <h1 className="text-3xl font-bold">Deploying Kairo</h1>

        {status === "provisioning" && (
          <div className="mt-8">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
            <p className="mt-4 text-gray-600">Creating your Kairo instance...</p>
          </div>
        )}

        {status === "checking" && (
          <div className="mt-8">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-gray-600">Starting up and connecting to Slack...</p>
            <p className="mt-2 text-sm text-gray-400">This usually takes about a minute.</p>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <span className="text-2xl text-green-600">&#10003;</span>
            </div>
            <p className="mt-4 text-gray-600">Kairo is live! Redirecting to your dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8">
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
            <button
              onClick={handleDeploy}
              className="mt-4 rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
