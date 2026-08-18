import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, conversationsTable, memoriesTable, messagesTable, projectsTable, settingsTable, tasksTable, themesTable } from "@workspace/db";
import {
  ApplyThemeParams,
  ApplyThemeResponse,
  CancelTaskParams,
  CancelTaskResponse,
  CreateConversationBody,
  CreateConversationResponse,
  CreateMemoryBody,
  CreateMemoryResponse,
  CreateProjectBody,
  CreateProjectResponse,
  CreateTaskBody,
  CreateTaskResponse,
  CreateThemeBody,
  CreateThemeResponse,
  DeleteMemoryParams,
  DeleteThemeParams,
  GetDashboardResponse,
  GetProjectParams,
  GetProjectResponse,
  GetSettingsResponse,
  ListConversationsResponse,
  ListMemoriesResponse,
  ListMessagesParams,
  ListMessagesResponse,
  ListProjectsResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  ListToolsResponse,
  ListThemesResponse,
  RetryTaskParams,
  RetryTaskResponse,
  SendMessageBody,
  SendMessageParams,
  SendMessageResponse,
  UpdateMemoryBody,
  UpdateMemoryParams,
  UpdateMemoryResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
  UpdateThemeBody,
  UpdateThemeParams,
  UpdateThemeResponse,
} from "@workspace/api-zod";
import { currentUserId, requireUser } from "../middlewares/auth";
import { agentSystemPrompt, createAgentTask, transitionAgentTask } from "../lib/agent";
import { listTools, webSearch } from "../lib/tools";

const router: IRouter = Router();

const dateToString = (date: Date | string): string =>
  date instanceof Date ? date.toISOString() : new Date(date).toISOString();

const toConversation = (row: typeof conversationsTable.$inferSelect) => ({
  id: row.id,
  title: row.title,
  createdAt: dateToString(row.createdAt),
  updatedAt: dateToString(row.updatedAt),
});

const toMessage = (row: typeof messagesTable.$inferSelect) => ({
  id: row.id,
  role: row.role as "user" | "assistant" | "system",
  content: row.content,
  createdAt: dateToString(row.createdAt),
});

const toTask = (row: typeof tasksTable.$inferSelect) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status as "New" | "Planning" | "In Progress" | "Waiting" | "Completed" | "Failed" | "Cancelled",
  progress: row.progress,
  steps: row.steps,
  currentStep: row.currentStep,
  errors: row.errors,
  priority: row.priority as "Low" | "Medium" | "High",
  createdAt: dateToString(row.createdAt),
  updatedAt: dateToString(row.updatedAt),
});

const toProject = (row: typeof projectsTable.$inferSelect) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  progress: row.progress,
  buildStatus: row.buildStatus as "Ready" | "Building" | "Failed" | "Not started",
  files: row.files,
  taskCount: row.taskCount,
  errors: row.errors,
  lastActivity: row.lastActivity,
  createdAt: dateToString(row.createdAt),
});

const toMemory = (row: typeof memoriesTable.$inferSelect) => ({
  id: row.id,
  content: row.content,
  category: row.category,
  enabled: row.enabled,
  createdAt: dateToString(row.createdAt),
  updatedAt: dateToString(row.updatedAt),
});

const toTheme = (row: typeof themesTable.$inferSelect) => ({
  id: row.id,
  name: row.name,
  mode: row.mode as "light" | "dark" | "system" | "custom",
  isApplied: row.isApplied,
  tokens: row.tokens,
  createdAt: dateToString(row.createdAt),
  updatedAt: dateToString(row.updatedAt),
});

async function ensureUserData(ownerId: string): Promise<void> {
  const [existing] = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.ownerId, ownerId))
    .limit(1);
  if (existing) return;

  await db.insert(conversationsTable).values({
    ownerId,
    title: "گفتوگۆی سەرەکی",
  });
  await db.insert(tasksTable).values({
    ownerId,
    title: "دروستکردنی workspace ـێکی نوێ",
    description: "ئەرکێکی نموونەیی بۆ پیشاندانی بەڕێوەبردنی ئەجێنت",
    status: "In Progress",
    progress: 58,
    steps: ["تێگەیشتن", "پلان", "بەکارهێنانی ئامراز", "دروستکردنی فایل", "تاقیکردنەوە", "تەواوکردن"],
    currentStep: 2,
    priority: "High",
  });
  await db.insert(projectsTable).values({
    ownerId,
    name: "HAMAUMIN Core",
    description: "بنەمای یاریدەدەری کوردی و ئەجێنتی کۆد",
    progress: 72,
    buildStatus: "Building",
    files: ["agent.ts", "tools.ts", "memory.ts", "README.md"],
    taskCount: 3,
    lastActivity: "ئەمڕۆ، ١٠:٤٢",
  });
  await db.insert(memoriesTable).values({
    ownerId,
    content: "من حەزم لە وەڵامی کورت و ڕوون بە کوردی سۆرانییە.",
    category: "پەسەندکراوەکان",
  });
  await db.insert(themesTable).values({
    ownerId,
    name: "شەوی هەڵمەت",
    mode: "custom",
    isApplied: true,
    tokens: {
      primary: "#f49b45",
      secondary: "#8f6cff",
      accent: "#46d6a1",
      background: "#0d0d18",
      card: "#17172a",
      foreground: "#f6f2ff",
    },
  });
  await db.insert(settingsTable).values({ ownerId });
}

async function generateKurdishReply(
  ownerId: string,
  conversationId: number,
  content: string,
): Promise<string> {
  const memoryRows = await db
    .select({ content: memoriesTable.content })
    .from(memoriesTable)
    .where(and(eq(memoriesTable.ownerId, ownerId), eq(memoriesTable.enabled, true)));
  const history = await db
    .select({ role: messagesTable.role, content: messagesTable.content })
    .from(messagesTable)
    .where(and(eq(messagesTable.ownerId, ownerId), eq(messagesTable.conversationId, conversationId)))
    .orderBy(messagesTable.createdAt);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY دانەنراوە؛ خزمەتگوزاری AI ئامادە نییە.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: 1200,
      messages: [
        { role: "system", content: agentSystemPrompt(memoryRows.map((row) => row.content).join("\n")) },
        ...history.slice(-20).map((row) => ({
          role: row.role as "user" | "assistant",
          content: row.content,
        })),
        { role: "user", content },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("AI وەڵامێکی بەتاڵی گەڕاندەوە.");
  return reply;
}

router.use(requireUser);

router.get("/dashboard", async (req, res): Promise<void> => {
  const ownerId = currentUserId(req);
  await ensureUserData(ownerId);
  const [taskRows, projectRows, memoryRows] = await Promise.all([
    db.select().from(tasksTable).where(eq(tasksTable.ownerId, ownerId)).orderBy(desc(tasksTable.updatedAt)),
    db.select().from(projectsTable).where(eq(projectsTable.ownerId, ownerId)).orderBy(desc(projectsTable.updatedAt)),
    db.select().from(memoriesTable).where(eq(memoriesTable.ownerId, ownerId)),
  ]);
  const tools = listTools();
  res.json(
    GetDashboardResponse.parse({
      greeting: "بەیانی باش، بەخێربێیتەوە",
      stats: {
        tasks: taskRows.length,
        projects: projectRows.length,
        memories: memoryRows.length,
        tools: tools.length,
      },
      currentTask: taskRows[0] ? toTask(taskRows[0]) : null,
      recentActivity: [
        projectRows[0] ? `پڕۆژەی ${projectRows[0].name} نوێکرایەوە` : "هیچ چالاکییەک نییە",
        taskRows[0] ? `ئەرکی ${taskRows[0].title} لە ${taskRows[0].progress}% ـە` : "ئەرکێک زیاد بکە",
        "HAMAUMIN ئامادەیە بۆ یارمەتیدان",
      ],
    }),
  );
});

router.get("/conversations", async (req, res): Promise<void> => {
  const rows = await db.select().from(conversationsTable).where(eq(conversationsTable.ownerId, currentUserId(req))).orderBy(desc(conversationsTable.updatedAt));
  res.json(ListConversationsResponse.parse(rows.map(toConversation)));
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(conversationsTable).values({
    ownerId: currentUserId(req),
    title: parsed.data.title,
  }).returning();
  res.status(201).json(CreateConversationResponse.parse(toConversation(row)));
});

router.get("/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db.select().from(messagesTable).where(and(
    eq(messagesTable.ownerId, currentUserId(req)),
    eq(messagesTable.conversationId, params.data.conversationId),
  )).orderBy(messagesTable.createdAt);
  res.json(ListMessagesResponse.parse(rows.map(toMessage)));
});

router.post("/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  const body = SendMessageBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const ownerId = currentUserId(req);
  const [conversation] = await db.select().from(conversationsTable).where(and(
    eq(conversationsTable.id, params.data.conversationId),
    eq(conversationsTable.ownerId, ownerId),
  ));
  if (!conversation) {
    res.status(404).json({ error: "گفتوگۆکە نەدۆزرایەوە" });
    return;
  }
  const [userMessage] = await db.insert(messagesTable).values({
    conversationId: conversation.id,
    ownerId,
    role: "user",
    content: body.data.content,
    attachmentName: body.data.attachmentName ?? null,
  }).returning();
  try {
    const reply = await generateKurdishReply(ownerId, conversation.id, body.data.content);
    const [assistantMessage] = await db.insert(messagesTable).values({
      conversationId: conversation.id,
      ownerId,
      role: "assistant",
      content: reply,
    }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversation.id));
    res.status(201).json(SendMessageResponse.parse({
      user: toMessage(userMessage),
      assistant: toMessage(assistantMessage),
    }));
  } catch (error) {
    req.log.error({ err: error }, "AI response failed");
    res.status(502).json({
      error: error instanceof Error ? `وەڵامی AI نەگەیشت: ${error.message}` : "وەڵامی AI نەگەیشت.",
    });
  }
});

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(tasksTable.ownerId, currentUserId(req))];
  if (query.data.status) conditions.push(eq(tasksTable.status, query.data.status));
  const rows = await db.select().from(tasksTable).where(and(...conditions)).orderBy(desc(tasksTable.updatedAt));
  res.json(ListTasksResponse.parse(rows.map(toTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const task = await createAgentTask(
    currentUserId(req),
    body.data.title,
    body.data.description ?? "",
    body.data.priority ?? "Medium",
  );
  res.status(201).json(CreateTaskResponse.parse(toTask(task)));
});

router.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db.select().from(tasksTable).where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.ownerId, currentUserId(req))));
  if (!existing) {
    res.status(404).json({ error: "ئەرکەکە نەدۆزرایەوە" });
    return;
  }
  const nextErrors = body.data.error ? [...existing.errors, body.data.error] : existing.errors;
  const [updated] = await db.update(tasksTable).set({
    status: body.data.status ?? existing.status,
    progress: body.data.progress ?? existing.progress,
    currentStep: body.data.currentStep ?? existing.currentStep,
    errors: nextErrors,
    updatedAt: new Date(),
  }).where(eq(tasksTable.id, existing.id)).returning();
  res.json(UpdateTaskResponse.parse(toTask(updated)));
});

router.post("/tasks/:taskId/retry", async (req, res): Promise<void> => {
  const params = RetryTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(tasksTable).where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.ownerId, currentUserId(req))));
  if (!existing) {
    res.status(404).json({ error: "ئەرکەکە نەدۆزرایەوە" });
    return;
  }
  const [updated] = await db.update(tasksTable).set({
    ...transitionAgentTask(existing, "retry"),
    updatedAt: new Date(),
  }).where(eq(tasksTable.id, existing.id)).returning();
  res.json(RetryTaskResponse.parse(toTask(updated)));
});

router.post("/tasks/:taskId/cancel", async (req, res): Promise<void> => {
  const params = CancelTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(tasksTable).where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.ownerId, currentUserId(req))));
  if (!existing) {
    res.status(404).json({ error: "ئەرکەکە نەدۆزرایەوە" });
    return;
  }
  const [updated] = await db.update(tasksTable).set({
    ...transitionAgentTask(existing, "cancel"),
    updatedAt: new Date(),
  }).where(eq(tasksTable.id, existing.id)).returning();
  res.json(CancelTaskResponse.parse(toTask(updated)));
});

router.get("/projects", async (req, res): Promise<void> => {
  const rows = await db.select().from(projectsTable).where(eq(projectsTable.ownerId, currentUserId(req))).orderBy(desc(projectsTable.updatedAt));
  res.json(ListProjectsResponse.parse(rows.map(toProject)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db.insert(projectsTable).values({
    ownerId: currentUserId(req),
    name: body.data.name,
    description: body.data.description ?? "",
  }).returning();
  res.status(201).json(CreateProjectResponse.parse(toProject(row)));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.ownerId, currentUserId(req))));
  if (!row) {
    res.status(404).json({ error: "پڕۆژەکە نەدۆزرایەوە" });
    return;
  }
  res.json(GetProjectResponse.parse(toProject(row)));
});

router.get("/memory", async (req, res): Promise<void> => {
  const rows = await db.select().from(memoriesTable).where(eq(memoriesTable.ownerId, currentUserId(req))).orderBy(desc(memoriesTable.updatedAt));
  res.json(ListMemoriesResponse.parse(rows.map(toMemory)));
});

router.post("/memory", async (req, res): Promise<void> => {
  const body = CreateMemoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db.insert(memoriesTable).values({
    ownerId: currentUserId(req),
    content: body.data.content,
    category: body.data.category ?? "گشتی",
  }).returning();
  res.status(201).json(CreateMemoryResponse.parse(toMemory(row)));
});

router.patch("/memory/:memoryId", async (req, res): Promise<void> => {
  const params = UpdateMemoryParams.safeParse(req.params);
  const body = UpdateMemoryBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db.update(memoriesTable).set({
    content: body.data.content,
    category: body.data.category,
    enabled: body.data.enabled,
    updatedAt: new Date(),
  }).where(and(eq(memoriesTable.id, params.data.memoryId), eq(memoriesTable.ownerId, currentUserId(req)))).returning();
  if (!row) {
    res.status(404).json({ error: "یادەوەرییەکە نەدۆزرایەوە" });
    return;
  }
  res.json(UpdateMemoryResponse.parse(toMemory(row)));
});

router.delete("/memory/:memoryId", async (req, res): Promise<void> => {
  const params = DeleteMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(memoriesTable).where(and(eq(memoriesTable.id, params.data.memoryId), eq(memoriesTable.ownerId, currentUserId(req))));
  res.sendStatus(204);
});

router.get("/tools", async (_req, res): Promise<void> => {
  res.json(ListToolsResponse.parse(listTools()));
});

router.get("/themes", async (req, res): Promise<void> => {
  const rows = await db.select().from(themesTable).where(eq(themesTable.ownerId, currentUserId(req))).orderBy(desc(themesTable.updatedAt));
  res.json(ListThemesResponse.parse(rows.map(toTheme)));
});

router.post("/themes", async (req, res): Promise<void> => {
  const body = CreateThemeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db.insert(themesTable).values({
    ownerId: currentUserId(req),
    name: body.data.name,
    mode: body.data.mode,
    tokens: body.data.tokens,
  }).returning();
  res.status(201).json(CreateThemeResponse.parse(toTheme(row)));
});

router.patch("/themes/:themeId", async (req, res): Promise<void> => {
  const params = UpdateThemeParams.safeParse(req.params);
  const body = UpdateThemeBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db.update(themesTable).set({
    name: body.data.name,
    mode: body.data.mode,
    tokens: body.data.tokens,
    isApplied: body.data.isApplied,
    updatedAt: new Date(),
  }).where(and(eq(themesTable.id, params.data.themeId), eq(themesTable.ownerId, currentUserId(req)))).returning();
  if (!row) {
    res.status(404).json({ error: "تێمکە نەدۆزرایەوە" });
    return;
  }
  res.json(UpdateThemeResponse.parse(toTheme(row)));
});

router.delete("/themes/:themeId", async (req, res): Promise<void> => {
  const params = DeleteThemeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(themesTable).where(and(eq(themesTable.id, params.data.themeId), eq(themesTable.ownerId, currentUserId(req))));
  res.sendStatus(204);
});

router.post("/themes/:themeId/apply", async (req, res): Promise<void> => {
  const params = ApplyThemeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ownerId = currentUserId(req);
  await db.update(themesTable).set({ isApplied: false }).where(eq(themesTable.ownerId, ownerId));
  const [row] = await db.update(themesTable).set({ isApplied: true, updatedAt: new Date() }).where(and(eq(themesTable.id, params.data.themeId), eq(themesTable.ownerId, ownerId))).returning();
  if (!row) {
    res.status(404).json({ error: "تێمکە نەدۆزرایەوە" });
    return;
  }
  res.json(ApplyThemeResponse.parse(toTheme(row)));
});

router.get("/settings", async (req, res): Promise<void> => {
  const ownerId = currentUserId(req);
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.ownerId, ownerId));
  const settings = row ?? (await db.insert(settingsTable).values({ ownerId }).returning())[0];
  res.json(GetSettingsResponse.parse({
    ...settings,
    fontScale: Number(settings.fontScale),
  }));
});

router.put("/settings", async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const ownerId = currentUserId(req);
  const [row] = await db.insert(settingsTable).values({
    ownerId,
    ...body.data,
    fontScale: body.data.fontScale == null ? undefined : String(body.data.fontScale),
  }).onConflictDoUpdate({
    target: settingsTable.ownerId,
    set: {
      ...body.data,
      fontScale: body.data.fontScale == null ? undefined : String(body.data.fontScale),
      updatedAt: new Date(),
    },
  }).returning();
  res.json(UpdateSettingsResponse.parse({
    ...row,
    fontScale: Number(row.fontScale),
  }));
});

router.post("/agent/search", async (req, res): Promise<void> => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  if (!query) {
    res.status(400).json({ error: "پرسیارێک بنووسە" });
    return;
  }
  try {
    const results = await webSearch(query);
    res.json({ results });
  } catch (error) {
    req.log.error({ err: error }, "Web search failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "گەڕانی وێب سەرکەوتوو نەبوو" });
  }
});

export default router;