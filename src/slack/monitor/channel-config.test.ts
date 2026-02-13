import { describe, expect, it } from "vitest";
import { resolveSlackChannelConfig } from "./channel-config.js";

describe("resolveSlackChannelConfig", () => {
  it("uses defaultRequireMention when channels config is empty", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C1",
      channels: {},
      defaultRequireMention: false,
    });
    expect(res).toEqual({ allowed: true, requireMention: false });
  });

  it("defaults defaultRequireMention to true when not provided", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C1",
      channels: {},
    });
    expect(res).toEqual({ allowed: true, requireMention: true });
  });

  it("prefers explicit channel/fallback requireMention over defaultRequireMention", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C1",
      channels: { "*": { requireMention: true } },
      defaultRequireMention: false,
    });
    expect(res).toMatchObject({ requireMention: true });
  });

  it("uses wildcard entries when no direct channel config exists", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C1",
      channels: { "*": { allow: true, requireMention: false } },
      defaultRequireMention: true,
    });
    expect(res).toMatchObject({
      allowed: true,
      requireMention: false,
      matchKey: "*",
      matchSource: "wildcard",
    });
  });

  it("uses direct match metadata when channel config exists", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C1",
      channels: { C1: { allow: true, requireMention: false } },
      defaultRequireMention: true,
    });
    expect(res).toMatchObject({
      matchKey: "C1",
      matchSource: "direct",
    });
  });

  it("passes skills array from channel config", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C_BUGS",
      channels: { C_BUGS: { enabled: true, requireMention: false, skills: ["bug-triage"] } },
    });
    expect(res).toMatchObject({ allowed: true, skills: ["bug-triage"], requireMention: false });
  });

  it("inherits skills from wildcard when no direct match", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C_OTHER",
      channels: { "*": { skills: ["bug-triage"], requireMention: true } },
    });
    expect(res).toMatchObject({ skills: ["bug-triage"], requireMention: true });
  });

  it("does not include skills when none configured", () => {
    const res = resolveSlackChannelConfig({
      channelId: "C1",
      channels: { C1: { enabled: true } },
    });
    expect(res?.skills).toBeUndefined();
  });
});
