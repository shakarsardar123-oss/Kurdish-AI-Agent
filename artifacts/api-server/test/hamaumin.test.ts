import { describe, expect, it } from "vitest";
import {
  CreateTaskBody,
  CreateThemeBody,
  UpdateTaskBody,
} from "@workspace/api-zod";
import { agentSteps, agentSystemPrompt, transitionAgentTask } from "../src/lib/agent";
import { webSearch } from "../src/lib/tools";

describe("HAMAUMIN API contracts", () => {
  it("rejects malformed task input instead of accepting silent defaults", () => {
    expect(CreateTaskBody.safeParse({ title: "" }).success).toBe(false);
    expect(CreateTaskBody.safeParse({ title: "پلانێکی نوێ", priority: "High" }).success).toBe(true);
    expect(UpdateTaskBody.safeParse({ progress: 101 }).success).toBe(false);
  });

  it("validates custom theme tokens before persistence", () => {
    expect(
      CreateThemeBody.safeParse({
        name: "شەوی هێمن",
        mode: "custom",
        tokens: { primary: "#a978f2", accent: "#f4a34d" },
      }).success,
    ).toBe(true);
    expect(
      CreateThemeBody.safeParse({
        name: "ڕووکارێکی خراپ",
        mode: "custom",
        tokens: { primary: 42 },
      }).success,
    ).toBe(false);
  });
});

describe("agent task transitions", () => {
  const base = {
    status: "Failed",
    progress: 58,
    currentStep: 3,
    errors: ["کۆد هەڵەی هەبوو"],
  };

  it("retries from a failed state with a clean planning state", () => {
    expect(transitionAgentTask(base, "retry")).toEqual({
      status: "Planning",
      progress: 5,
      currentStep: 1,
      errors: [],
    });
  });

  it("cancels without discarding the task's progress history", () => {
    expect(transitionAgentTask(base, "cancel")).toEqual({
      ...base,
      status: "Cancelled",
    });
  });

  it("completes the final step without exceeding the workflow", () => {
    const completed = transitionAgentTask(
      { ...base, status: "In Progress", currentStep: agentSteps.length - 1 },
      "complete-step",
    );
    expect(completed.status).toBe("Completed");
    expect(completed.progress).toBe(100);
    expect(completed.currentStep).toBe(agentSteps.length);
  });
});

describe("truthful AI/tool errors", () => {
  it("always includes the Kurdish assistant contract and memory context", () => {
    const prompt = agentSystemPrompt("حەزم لە وەڵامی کورتە");
    expect(prompt).toContain("هەمیشە وەڵامەکانت بە کوردی سۆرانی بن");
    expect(prompt).toContain("حەزم لە وەڵامی کورتە");
    expect(prompt).toContain("هیچ کاتێک سەرکەوتن مەفەرمووە");
  });

  it("returns a configuration error when web search is unavailable", async () => {
    const previousKey = process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
    await expect(webSearch("Kurdish technology")).rejects.toThrow("BRAVE_SEARCH_API_KEY");
    if (previousKey) process.env.BRAVE_SEARCH_API_KEY = previousKey;
  });
});