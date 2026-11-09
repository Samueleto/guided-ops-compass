import { describe, expect, it } from "vitest";
import {
  clampQuantity,
  exclusionReason,
  isRotatable,
  landingUrl,
  nextRuns,
  pickNextDomain,
  sequentialNames,
} from "./rules";
import type { Domain } from "./api/types";

const d = (name: string, status: Domain["status"], usedAt?: string): Domain => ({
  name,
  status,
  usedAt,
  verified: true,
  workerAttached: true,
  sslActive: true,
  zoneActive: true,
  usageHistory: [],
});

describe("purchase rules", () => {
  it("quantity is limited to 1-10", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(14)).toBe(10);
    expect(clampQuantity(4)).toBe(4);
  });
  it("names are sequential .shop domains", () => {
    expect(sequentialNames("simi", 84, 3)).toEqual(["simi84.shop", "simi85.shop", "simi86.shop"]);
  });
  it("rejects domains over $2", () => {
    expect(exclusionReason({ domain: "simi84.shop", available: true, premium: false, price: 2.01 }, new Set())).toMatch(/limit/);
    expect(exclusionReason({ domain: "simi84.shop", available: true, premium: false, price: 2 }, new Set())).toBeNull();
  });
  it("rejects non-.shop, premium and previously purchased domains", () => {
    expect(exclusionReason({ domain: "simi84.com", available: true, premium: false, price: 1 }, new Set())).not.toBeNull();
    expect(exclusionReason({ domain: "simi84.shop", available: true, premium: true, price: 1 }, new Set())).not.toBeNull();
    expect(exclusionReason({ domain: "simi84.shop", available: true, premium: false, price: 1 }, new Set(["simi84.shop"]))).not.toBeNull();
  });
});

describe("rotation rules", () => {
  it("landing URL uses /adultp/ exactly", () => {
    expect(landingUrl("simi84.shop")).toBe("https://simi84.shop/adultp/");
  });
  it("a used domain is never rotatable again", () => {
    expect(isRotatable(d("a1.shop", "READY", "2026-01-01"))).toBe(false);
    expect(isRotatable(d("a1.shop", "USED"))).toBe(false);
    expect(isRotatable(d("a1.shop", "READY"))).toBe(true);
  });
  it("auto-picks the lowest-numbered never-used READY domain", () => {
    const list = [d("simi90.shop", "READY"), d("simi80.shop", "USED"), d("simi85.shop", "READY")];
    expect(pickNextDomain(list)?.name).toBe("simi85.shop");
    expect(pickNextDomain(list, "simi90.shop")?.name).toBe("simi90.shop");
  });
  it("interval schedule runs every 30 minutes", () => {
    const from = new Date("2026-11-09T10:00:00Z");
    const runs = nextRuns({ mode: "interval", intervalMinutes: 30, timezone: "UTC" }, from, 2);
    expect(runs.map((r) => r.toISOString())).toEqual(["2026-11-09T10:30:00.000Z", "2026-11-09T11:00:00.000Z"]);
  });
  it("daily schedule respects timezone", () => {
    const from = new Date("2026-11-09T10:00:00Z");
    const [run] = nextRuns({ mode: "daily", time: "09:00", timezone: "Africa/Lagos" }, from, 1);
    expect(run.toISOString()).toBe("2026-11-10T08:00:00.000Z");
  });
  it("weekly schedule lands on the chosen weekday", () => {
    const from = new Date("2026-11-09T10:00:00Z"); // Monday
    const [run] = nextRuns({ mode: "weekly", weekday: 5, time: "18:30", timezone: "UTC" }, from, 1);
    expect(run.toISOString()).toBe("2026-11-13T18:30:00.000Z");
  });
});
