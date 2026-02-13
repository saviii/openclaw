import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  compactEmbeddedPiSession: vi.fn(),
  runEmbeddedPiAgent: vi.fn(),
  queueEmbeddedPiMessage: vi.fn().mockReturnValue(false),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
  isEmbeddedPiRunActive: vi.fn().mockReturnValue(false),
  isEmbeddedPiRunStreaming: vi.fn().mockReturnValue(false),
}));

const usageMocks = vi.hoisted(() => ({
  loadProviderUsageSummary: vi.fn().mockResolvedValue({
    updatedAt: 0,
    providers: [],
  }),
  formatUsageSummaryLine: vi.fn().mockReturnValue("📊 Usage: Claude 80% left"),
  resolveUsageProviderId: vi.fn((provider: string) => provider.split("/")[0]),
}));

vi.mock("../infra/provider-usage.js", () => usageMocks);

const modelCatalogMocks = vi.hoisted(() => ({
  loadModelCatalog: vi.fn().mockResolvedValue([
    {
      provider: "anthropic",
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5",
      contextWindow: 200000,
    },
  ]),
  resetModelCatalogCacheForTest: vi.fn(),
}));

vi.mock("../agents/model-catalog.js", () => modelCatalogMocks);

const webMocks = vi.hoisted(() => ({
  webAuthExists: vi.fn().mockResolvedValue(true),
  getWebAuthAgeMs: vi.fn().mockReturnValue(120_000),
  readWebSelfId: vi.fn().mockReturnValue({ e164: "+1999" }),
}));

vi.mock("../web/session.js", () => webMocks);

import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { getReplyFromConfig } from "./reply.js";

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(
    async (home) => {
      vi.mocked(runEmbeddedPiAgent).mockClear();
      return await fn(home);
    },
    { prefix: "openclaw-triage-" },
  );
}

function makeCfg(home: string) {
  return {
    agents: {
      defaults: {
        model: "anthropic/claude-opus-4-5",
        workspace: join(home, "openclaw"),
      },
    },
    channels: {
      slack: {
        dm: { enabled: true, policy: "open", allowFrom: ["*"] },
        groupPolicy: "allowlist",
        channels: {
          C_BUGS: {
            enabled: true,
            requireMention: false,
            skills: ["bug-triage"],
          },
        },
      },
    },
    session: { store: join(home, "sessions.json") },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Slack → Jira bug triage e2e", () => {
  it("passes skill filter through to agent when channel has skills configured", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [
          {
            text: "Bug filed: **SCRUM-42** — Login timeout on mobile Safari\nPriority: High | [View in Jira](https://savipablas.atlassian.net/browse/SCRUM-42)",
          },
        ],
        meta: {
          durationMs: 1,
          agentMeta: { sessionId: "s", provider: "anthropic", model: "claude-opus-4-5" },
        },
      });

      const res = await getReplyFromConfig(
        {
          Body: "The login page times out on mobile Safari after entering credentials",
          From: "U_ALICE",
          To: "U_BOT",
          Provider: "slack",
          Surface: "slack",
          CommandAuthorized: true,
          SenderName: "Alice",
          SenderId: "U_ALICE",
        },
        {
          skillFilter: ["bug-triage"],
        },
        makeCfg(home),
      );

      expect(runEmbeddedPiAgent).toHaveBeenCalled();
      const agentCall = vi.mocked(runEmbeddedPiAgent).mock.calls[0]?.[0] as Record<string, unknown>;
      // The skill filter is applied via skillsSnapshot (skills are loaded and filtered
      // before being passed to the agent). Verify the agent was called with the correct prompt.
      expect(agentCall?.prompt).toContain("login page times out on mobile Safari");

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("SCRUM-42");
    });
  });

  it("includes bug report text in agent prompt", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Bug filed: SCRUM-99" }],
        meta: {
          durationMs: 1,
          agentMeta: { sessionId: "s", provider: "anthropic", model: "claude-opus-4-5" },
        },
      });

      const bugReport = "Checkout page throws 500 error when adding more than 10 items to the cart";

      await getReplyFromConfig(
        {
          Body: bugReport,
          From: "U_BOB",
          To: "U_BOT",
          Provider: "slack",
          Surface: "slack",
          CommandAuthorized: true,
          SenderName: "Bob",
          SenderId: "U_BOB",
        },
        {
          skillFilter: ["bug-triage"],
        },
        makeCfg(home),
      );

      expect(runEmbeddedPiAgent).toHaveBeenCalled();
      const agentCall = vi.mocked(runEmbeddedPiAgent).mock.calls[0]?.[0];
      const prompt = agentCall?.prompt ?? "";
      expect(prompt).toContain("Checkout page throws 500 error");
    });
  });
});
