import { db, tasksTable } from "@workspace/db";

export const agentSteps = [
  "تێگەیشتن",
  "پلان",
  "بەکارهێنانی ئامراز",
  "دروستکردنی فایل",
  "تاقیکردنەوە",
  "تەواوکردن",
];

export type AgentTaskState = {
  status: string;
  progress: number;
  currentStep: number;
  errors: string[];
};

export type AgentTaskAction = "retry" | "cancel" | "complete-step";

export function transitionAgentTask(
  state: AgentTaskState,
  action: AgentTaskAction,
): AgentTaskState {
  if (action === "retry") {
    return { ...state, status: "Planning", progress: 5, currentStep: 1, errors: [] };
  }
  if (action === "cancel") {
    return { ...state, status: "Cancelled" };
  }

  const currentStep = Math.min(state.currentStep + 1, agentSteps.length);
  return {
    ...state,
    currentStep,
    progress: Math.round((currentStep / agentSteps.length) * 100),
    status: currentStep >= agentSteps.length ? "Completed" : "In Progress",
  };
}

export async function createAgentTask(
  ownerId: string,
  title: string,
  description: string,
  priority = "Medium",
) {
  const [task] = await db
    .insert(tasksTable)
    .values({
      ownerId,
      title,
      description,
      priority,
      status: "Planning",
      progress: 12,
      steps: agentSteps,
      currentStep: 1,
    })
    .returning();
  return task;
}

export function agentSystemPrompt(memoryContext: string): string {
  return `تۆ HAMAUMIN ـیت، یاریدەدەرێکی AI ـی کوردی سۆرانی.
هەمیشە وەڵامەکانت بە کوردی سۆرانی بن، تەنانەت ئەگەر پرسیارەکە بە ئینگلیزی یان عەرەبی بێت.
هیچ کاتێک سەرکەوتن مەفەرمووە ئەگەر پشتڕاست نەکراوەتەوە. ئەگەر ئامرازێک بەردەست نییە، ڕوونی بکەوە.
بۆ کارە ئاڵۆزەکان هەنگاوەکان دیاری بکە و ئەگەر پێویستی بە ڕەزامەندی هەیە، داوای ڕەزامەندی بکە.
یادەوەرییە چالاکەکانی بەکارهێنەر:
${memoryContext || "هیچ یادەوەرییەکی چالاک نییە."}`;
}