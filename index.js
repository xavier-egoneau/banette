"use strict";
process.stderr.write("[DBG] start\n");
const electron = require("electron");
process.stderr.write("[DBG] electron loaded, app=" + typeof electron.app + "\n");
const fs = require("fs");
process.stderr.write("[DBG] fs loaded\n");
const path = require("path");
process.stderr.write("[DBG] path loaded\n");
const matter = require("gray-matter");
process.stderr.write("[DBG] gray-matter loaded\n");
const uuid = require("uuid");
process.stderr.write("[DBG] uuid loaded\n");
const http = require("http");
process.stderr.write("[DBG] http loaded\n");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const DEFAULT_SETTINGS = {
  darkMode: false,
  storagePath: null,
  apiPort: null,
  workHours: {
    enabled: false,
    days: ["mon", "tue", "wed", "thu", "fri"],
    lunchBreak: { enabled: true, time: "12:30" },
    endOfDay: { enabled: true, time: "18:00" },
    alertMinutes: 15
  }
};
function getSettingsPath() {
  return path__namespace.join(electron.app.getPath("userData"), "settings.json");
}
function getSettings() {
  try {
    const raw = fs__namespace.readFileSync(getSettingsPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      workHours: { ...DEFAULT_SETTINGS.workHours, ...parsed.workHours ?? {} }
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function setSettings(updates) {
  const current = getSettings();
  const updated = {
    ...current,
    ...updates,
    workHours: updates.workHours ? { ...current.workHours, ...updates.workHours } : current.workHours
  };
  fs__namespace.writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
function getBasePath() {
  const { storagePath } = getSettings();
  return storagePath ?? path__namespace.join(electron.app.getPath("documents"), "Banette");
}
function getNotesDir() {
  return path__namespace.join(getBasePath(), "notes");
}
function getTodosDir() {
  return path__namespace.join(getBasePath(), "todos");
}
function getTimersDir() {
  return path__namespace.join(getBasePath(), "timers");
}
function ensureDirectories() {
  const dirs = [getBasePath(), getNotesDir(), getTodosDir(), getTimersDir()];
  for (const dir of dirs) {
    if (!fs__namespace.existsSync(dir)) {
      fs__namespace.mkdirSync(dir, { recursive: true });
    }
  }
}
function readMarkdownFile(filePath) {
  const raw = fs__namespace.readFileSync(filePath, "utf-8");
  return matter(raw);
}
function writeMarkdownFile(filePath, data, content) {
  const fileContent = matter.stringify(content, data);
  fs__namespace.writeFileSync(filePath, fileContent, "utf-8");
}
function parseTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}
function sortByPinnedThenOrder(items) {
  return items.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.order - b.order || new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}
function getNotePath(id) {
  return path__namespace.join(getNotesDir(), `${id}.md`);
}
function getTodoPath(id) {
  return path__namespace.join(getTodosDir(), `${id}.md`);
}
function getTimerPath(id) {
  return path__namespace.join(getTimersDir(), `${id}.md`);
}
function getCurrentStoragePath() {
  return getBasePath();
}
function listNotes() {
  ensureDirectories();
  const dir = getNotesDir();
  const files = fs__namespace.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const notes = [];
  for (const file of files) {
    try {
      const filePath = path__namespace.join(dir, file);
      const parsed = readMarkdownFile(filePath);
      const data = parsed.data;
      notes.push({
        id: String(data.id ?? ""),
        title: String(data.title ?? ""),
        created: String(data.created ?? ""),
        updated: String(data.updated ?? ""),
        order: typeof data.order === "number" ? data.order : Infinity,
        content: parsed.content.trim(),
        tags: parseTags(data.tags),
        pinned: Boolean(data.pinned ?? false)
      });
    } catch {
    }
  }
  return sortByPinnedThenOrder(notes);
}
function getNote(id) {
  ensureDirectories();
  const filePath = getNotePath(id);
  if (!fs__namespace.existsSync(filePath)) return null;
  try {
    const parsed = readMarkdownFile(filePath);
    const data = parsed.data;
    return {
      id: String(data.id ?? ""),
      title: String(data.title ?? ""),
      created: String(data.created ?? ""),
      updated: String(data.updated ?? ""),
      order: typeof data.order === "number" ? data.order : Infinity,
      content: parsed.content.trim(),
      tags: parseTags(data.tags),
      pinned: Boolean(data.pinned ?? false)
    };
  } catch {
    return null;
  }
}
function createNote(title, content = "") {
  ensureDirectories();
  const id = uuid.v4();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const order = 0;
  const note = { id, title, created: now, updated: now, order, content, tags: [], pinned: false };
  writeMarkdownFile(getNotePath(id), { id, title, created: now, updated: now, order, tags: [], pinned: false }, content);
  return note;
}
function updateNote(id, updates) {
  ensureDirectories();
  const existing = getNote(id);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = { ...existing, ...updates, id, updated: now };
  writeMarkdownFile(
    getNotePath(id),
    { id, title: updated.title, created: updated.created, updated: now, order: updated.order, tags: updated.tags, pinned: updated.pinned },
    updated.content
  );
  return updated;
}
function reorderNotes(orderedIds) {
  ensureDirectories();
  for (const [index, id] of orderedIds.entries()) {
    const filePath = getNotePath(id);
    if (!fs__namespace.existsSync(filePath)) continue;
    try {
      const parsed = readMarkdownFile(filePath);
      writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content);
    } catch {
    }
  }
}
function deleteNote(id) {
  ensureDirectories();
  const filePath = getNotePath(id);
  if (!fs__namespace.existsSync(filePath)) return false;
  fs__namespace.unlinkSync(filePath);
  return true;
}
function listTodos() {
  ensureDirectories();
  const dir = getTodosDir();
  const files = fs__namespace.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const todos = [];
  for (const file of files) {
    try {
      const filePath = path__namespace.join(dir, file);
      const parsed = readMarkdownFile(filePath);
      const data = parsed.data;
      todos.push({
        id: String(data.id ?? ""),
        title: String(data.title ?? ""),
        created: String(data.created ?? ""),
        updated: String(data.updated ?? ""),
        order: typeof data.order === "number" ? data.order : Infinity,
        priority: data.priority ?? "normale",
        completed: Boolean(data.completed ?? false),
        content: parsed.content.trim(),
        tags: parseTags(data.tags),
        pinned: Boolean(data.pinned ?? false)
      });
    } catch {
    }
  }
  return sortByPinnedThenOrder(todos);
}
function getTodo(id) {
  ensureDirectories();
  const filePath = getTodoPath(id);
  if (!fs__namespace.existsSync(filePath)) return null;
  try {
    const parsed = readMarkdownFile(filePath);
    const data = parsed.data;
    return {
      id: String(data.id ?? ""),
      title: String(data.title ?? ""),
      created: String(data.created ?? ""),
      updated: String(data.updated ?? ""),
      order: typeof data.order === "number" ? data.order : Infinity,
      priority: data.priority ?? "normale",
      completed: Boolean(data.completed ?? false),
      content: parsed.content.trim(),
      tags: parseTags(data.tags),
      pinned: Boolean(data.pinned ?? false)
    };
  } catch {
    return null;
  }
}
function createTodo(title, content = "", priority = "normale") {
  ensureDirectories();
  const id = uuid.v4();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const order = 0;
  const todo = { id, title, created: now, updated: now, order, priority, completed: false, content, tags: [], pinned: false };
  writeMarkdownFile(
    getTodoPath(id),
    { id, title, created: now, updated: now, order, priority, completed: false, tags: [], pinned: false },
    content
  );
  return todo;
}
function updateTodo(id, updates) {
  ensureDirectories();
  const existing = getTodo(id);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = { ...existing, ...updates, id, updated: now };
  writeMarkdownFile(
    getTodoPath(id),
    {
      id,
      title: updated.title,
      created: updated.created,
      updated: now,
      order: updated.order,
      priority: updated.priority,
      completed: updated.completed,
      tags: updated.tags,
      pinned: updated.pinned
    },
    updated.content
  );
  return updated;
}
function reorderTodos(orderedIds) {
  ensureDirectories();
  for (const [index, id] of orderedIds.entries()) {
    const filePath = getTodoPath(id);
    if (!fs__namespace.existsSync(filePath)) continue;
    try {
      const parsed = readMarkdownFile(filePath);
      writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content);
    } catch {
    }
  }
}
function deleteTodo(id) {
  ensureDirectories();
  const filePath = getTodoPath(id);
  if (!fs__namespace.existsSync(filePath)) return false;
  fs__namespace.unlinkSync(filePath);
  return true;
}
function parseSessions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((s) => s && typeof s === "object").map((s) => ({
    id: String(s.id ?? uuid.v4()),
    date: String(s.date ?? ""),
    seconds: typeof s.seconds === "number" ? s.seconds : 0
  }));
}
function listTimers() {
  ensureDirectories();
  const dir = getTimersDir();
  const files = fs__namespace.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const timers = [];
  for (const file of files) {
    try {
      const filePath = path__namespace.join(dir, file);
      const parsed = readMarkdownFile(filePath);
      const data = parsed.data;
      timers.push({
        id: String(data.id ?? ""),
        title: String(data.title ?? ""),
        created: String(data.created ?? ""),
        updated: String(data.updated ?? ""),
        order: typeof data.order === "number" ? data.order : Infinity,
        content: parsed.content.trim(),
        tags: parseTags(data.tags),
        pinned: Boolean(data.pinned ?? false),
        sessions: parseSessions(data.sessions),
        running_since: data.running_since ? String(data.running_since) : null,
        total_seconds: typeof data.total_seconds === "number" ? data.total_seconds : 0
      });
    } catch {
    }
  }
  return sortByPinnedThenOrder(timers);
}
function getTimer(id) {
  ensureDirectories();
  const filePath = getTimerPath(id);
  if (!fs__namespace.existsSync(filePath)) return null;
  try {
    const parsed = readMarkdownFile(filePath);
    const data = parsed.data;
    return {
      id: String(data.id ?? ""),
      title: String(data.title ?? ""),
      created: String(data.created ?? ""),
      updated: String(data.updated ?? ""),
      order: typeof data.order === "number" ? data.order : Infinity,
      content: parsed.content.trim(),
      tags: parseTags(data.tags),
      pinned: Boolean(data.pinned ?? false),
      sessions: parseSessions(data.sessions),
      running_since: data.running_since ? String(data.running_since) : null,
      total_seconds: typeof data.total_seconds === "number" ? data.total_seconds : 0
    };
  } catch {
    return null;
  }
}
function createTimer(title) {
  ensureDirectories();
  const id = uuid.v4();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const order = 0;
  writeMarkdownFile(
    getTimerPath(id),
    { id, title, created: now, updated: now, order, tags: [], pinned: false, sessions: [], running_since: null, total_seconds: 0 },
    ""
  );
  return { id, title, created: now, updated: now, order, content: "", tags: [], pinned: false, sessions: [], running_since: null, total_seconds: 0 };
}
function updateTimer(id, updates) {
  ensureDirectories();
  const existing = getTimer(id);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = { ...existing, ...updates, id, updated: now };
  writeMarkdownFile(
    getTimerPath(id),
    {
      id,
      title: updated.title,
      created: updated.created,
      updated: now,
      order: updated.order,
      tags: updated.tags,
      pinned: updated.pinned,
      sessions: updated.sessions,
      running_since: updated.running_since,
      total_seconds: updated.total_seconds
    },
    updated.content
  );
  return updated;
}
function reorderTimers(orderedIds) {
  ensureDirectories();
  for (const [index, id] of orderedIds.entries()) {
    const filePath = getTimerPath(id);
    if (!fs__namespace.existsSync(filePath)) continue;
    try {
      const parsed = readMarkdownFile(filePath);
      writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content);
    } catch {
    }
  }
}
function deleteTimer(id) {
  ensureDirectories();
  const filePath = getTimerPath(id);
  if (!fs__namespace.existsSync(filePath)) return false;
  fs__namespace.unlinkSync(filePath);
  return true;
}
function stopAllRunningTimers() {
  const timers = listTimers();
  const now = /* @__PURE__ */ new Date();
  for (const timer of timers) {
    if (!timer.running_since) continue;
    const elapsedSeconds = Math.floor((now.getTime() - new Date(timer.running_since).getTime()) / 1e3);
    if (elapsedSeconds < 1) continue;
    const date = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const newSessions = [
      ...timer.sessions,
      { id: uuid.v4(), date, seconds: elapsedSeconds }
    ];
    updateTimer(timer.id, {
      sessions: newSessions,
      running_since: null,
      total_seconds: newSessions.reduce((sum, s) => sum + s.seconds, 0)
    });
  }
}
function importMarkdownFiles(filePaths) {
  ensureDirectories();
  const imported = [];
  for (const filePath of filePaths) {
    try {
      const raw = fs__namespace.readFileSync(filePath, "utf-8");
      const parsed = matter(raw);
      const data = parsed.data;
      const title = String(data.title ?? path__namespace.basename(filePath, ".md"));
      const content = parsed.content.trim();
      const tags = parseTags(data.tags);
      const hasTodoFields = "priority" in data || "completed" in data;
      if (hasTodoFields) {
        const priority = ["haute", "normale", "basse"].includes(String(data.priority)) ? data.priority : "normale";
        const todo = createTodo(title, content, priority);
        updateTodo(todo.id, { tags, completed: Boolean(data.completed ?? false) });
        imported.push({ ...todo, tags, completed: Boolean(data.completed ?? false) });
      } else {
        const note = createNote(title, content);
        if (tags.length) updateNote(note.id, { tags });
        imported.push({ ...note, tags });
      }
    } catch {
    }
  }
  return imported;
}
const API_HOST = "127.0.0.1";
const DEFAULT_API_PORT = 3210;
const MAX_BODY_SIZE = 1024 * 1024;
const VALID_PRIORITIES = ["haute", "normale", "basse"];
let apiServer = null;
let apiInfo = null;
function normalizePort(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 65535 ? value : null;
}
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}
function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end();
}
function normalizeTitle(value, fallback) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
function normalizeContent(value) {
  return typeof value === "string" ? value : "";
}
function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => String(tag).trim()).filter(Boolean);
}
function normalizePinned(value) {
  return Boolean(value);
}
function normalizeCompleted(value) {
  return Boolean(value);
}
function normalizePriority(value, fallback = "normale") {
  return typeof value === "string" && VALID_PRIORITIES.includes(value) ? value : fallback;
}
function parseId(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 3 ? decodeURIComponent(parts[2]) : null;
}
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
function getPreferredPort() {
  const portFromEnv = normalizePort(Number(process.env.BANETTE_API_PORT));
  if (portFromEnv) return portFromEnv;
  const portFromSettings = normalizePort(getSettings().apiPort);
  return portFromSettings ?? DEFAULT_API_PORT;
}
function buildApiInfo(port, preferredPort) {
  return {
    enabled: true,
    host: API_HOST,
    port,
    baseUrl: `http://${API_HOST}:${port}`,
    storagePath: getCurrentStoragePath(),
    preferredPort,
    usingFallbackPort: port !== preferredPort
  };
}
async function listenWithFallback(server, preferredPort) {
  let portToTry = preferredPort;
  for (let attempts = 0; attempts < 10; attempts += 1) {
    try {
      await new Promise((resolve, reject) => {
        const handleError = (error) => {
          server.off("listening", handleListening);
          reject(error);
        };
        const handleListening = () => {
          server.off("error", handleError);
          resolve();
        };
        server.once("error", handleError);
        server.once("listening", handleListening);
        server.listen(portToTry, API_HOST);
      });
      return portToTry;
    } catch (error) {
      const err = error;
      if (err.code !== "EADDRINUSE") throw err;
      portToTry += 1;
    }
  }
  await new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };
    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(0, API_HOST);
  });
  const address = server.address();
  return address?.port ?? preferredPort;
}
async function handleNotes(req, res, pathname) {
  if (pathname === "/api/notes" && req.method === "GET") {
    sendJson(res, 200, { data: listNotes() });
    return;
  }
  if (pathname === "/api/notes" && req.method === "POST") {
    const body = await readJsonBody(req);
    const note = createNote(
      normalizeTitle(body.title, "Nouvelle note"),
      normalizeContent(body.content)
    );
    const updates = {
      tags: normalizeTags(body.tags),
      pinned: normalizePinned(body.pinned)
    };
    const saved = updateNote(note.id, updates) ?? note;
    sendJson(res, 201, { data: saved });
    return;
  }
  const id = parseId(pathname);
  if (!id) {
    sendJson(res, 404, { error: "Route introuvable" });
    return;
  }
  if (req.method === "GET") {
    const note = getNote(id);
    if (!note) {
      sendJson(res, 404, { error: "Note introuvable" });
      return;
    }
    sendJson(res, 200, { data: note });
    return;
  }
  if (req.method === "PATCH") {
    const existing = getNote(id);
    if (!existing) {
      sendJson(res, 404, { error: "Note introuvable" });
      return;
    }
    const body = await readJsonBody(req);
    const updates = {};
    if ("title" in body) updates.title = normalizeTitle(body.title, existing.title);
    if ("content" in body) updates.content = normalizeContent(body.content);
    if ("tags" in body) updates.tags = normalizeTags(body.tags);
    if ("pinned" in body) updates.pinned = normalizePinned(body.pinned);
    const updated = updateNote(id, updates);
    sendJson(res, 200, { data: updated });
    return;
  }
  if (req.method === "DELETE") {
    const deleted = deleteNote(id);
    if (!deleted) {
      sendJson(res, 404, { error: "Note introuvable" });
      return;
    }
    sendNoContent(res);
    return;
  }
  sendJson(res, 405, { error: "Méthode non autorisée" });
}
async function handleTodos(req, res, pathname) {
  if (pathname === "/api/todos" && req.method === "GET") {
    sendJson(res, 200, { data: listTodos() });
    return;
  }
  if (pathname === "/api/todos" && req.method === "POST") {
    const body = await readJsonBody(req);
    const todo = createTodo(
      normalizeTitle(body.title, "Nouvelle todo"),
      normalizeContent(body.content),
      normalizePriority(body.priority)
    );
    const updates = {
      tags: normalizeTags(body.tags),
      pinned: normalizePinned(body.pinned),
      completed: normalizeCompleted(body.completed)
    };
    const saved = updateTodo(todo.id, updates) ?? todo;
    sendJson(res, 201, { data: saved });
    return;
  }
  const id = parseId(pathname);
  if (!id) {
    sendJson(res, 404, { error: "Route introuvable" });
    return;
  }
  if (req.method === "GET") {
    const todo = getTodo(id);
    if (!todo) {
      sendJson(res, 404, { error: "Todo introuvable" });
      return;
    }
    sendJson(res, 200, { data: todo });
    return;
  }
  if (req.method === "PATCH") {
    const existing = getTodo(id);
    if (!existing) {
      sendJson(res, 404, { error: "Todo introuvable" });
      return;
    }
    const body = await readJsonBody(req);
    const updates = {};
    if ("title" in body) updates.title = normalizeTitle(body.title, existing.title);
    if ("content" in body) updates.content = normalizeContent(body.content);
    if ("tags" in body) updates.tags = normalizeTags(body.tags);
    if ("pinned" in body) updates.pinned = normalizePinned(body.pinned);
    if ("completed" in body) updates.completed = normalizeCompleted(body.completed);
    if ("priority" in body) updates.priority = normalizePriority(body.priority, existing.priority);
    const updated = updateTodo(id, updates);
    sendJson(res, 200, { data: updated });
    return;
  }
  if (req.method === "DELETE") {
    const deleted = deleteTodo(id);
    if (!deleted) {
      sendJson(res, 404, { error: "Todo introuvable" });
      return;
    }
    sendNoContent(res);
    return;
  }
  sendJson(res, 405, { error: "Méthode non autorisée" });
}
async function handleTimers(req, res, pathname) {
  if (pathname === "/api/timers" && req.method === "GET") {
    sendJson(res, 200, { data: listTimers() });
    return;
  }
  if (pathname === "/api/timers" && req.method === "POST") {
    const body = await readJsonBody(req);
    const timer = createTimer(normalizeTitle(body.title, "Nouveau projet"));
    const updates = {
      tags: normalizeTags(body.tags),
      pinned: normalizePinned(body.pinned)
    };
    const saved = updateTimer(timer.id, updates) ?? timer;
    sendJson(res, 201, { data: saved });
    return;
  }
  const id = parseId(pathname);
  if (!id) {
    sendJson(res, 404, { error: "Route introuvable" });
    return;
  }
  if (req.method === "GET") {
    const timer = getTimer(id);
    if (!timer) {
      sendJson(res, 404, { error: "Timer introuvable" });
      return;
    }
    sendJson(res, 200, { data: timer });
    return;
  }
  if (req.method === "PATCH") {
    const existing = getTimer(id);
    if (!existing) {
      sendJson(res, 404, { error: "Timer introuvable" });
      return;
    }
    const body = await readJsonBody(req);
    const updates = {};
    if ("title" in body) updates.title = normalizeTitle(body.title, existing.title);
    if ("tags" in body) updates.tags = normalizeTags(body.tags);
    if ("pinned" in body) updates.pinned = normalizePinned(body.pinned);
    if ("sessions" in body && Array.isArray(body.sessions)) updates.sessions = body.sessions;
    if ("running_since" in body) updates.running_since = body.running_since ? String(body.running_since) : null;
    if ("total_seconds" in body && typeof body.total_seconds === "number") updates.total_seconds = body.total_seconds;
    const updated = updateTimer(id, updates);
    sendJson(res, 200, { data: updated });
    return;
  }
  if (req.method === "DELETE") {
    const deleted = deleteTimer(id);
    if (!deleted) {
      sendJson(res, 404, { error: "Timer introuvable" });
      return;
    }
    sendNoContent(res);
    return;
  }
  sendJson(res, 405, { error: "Méthode non autorisée" });
}
async function requestListener(req, res) {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }
    if (pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, {
        data: {
          status: "ok",
          api: getApiInfo()
        }
      });
      return;
    }
    if (pathname === "/api/info" && req.method === "GET") {
      sendJson(res, 200, { data: getApiInfo() });
      return;
    }
    if (pathname === "/api/notes" || pathname.startsWith("/api/notes/")) {
      await handleNotes(req, res, pathname);
      return;
    }
    if (pathname === "/api/todos" || pathname.startsWith("/api/todos/")) {
      await handleTodos(req, res, pathname);
      return;
    }
    if (pathname === "/api/timers" || pathname.startsWith("/api/timers/")) {
      await handleTimers(req, res, pathname);
      return;
    }
    sendJson(res, 404, { error: "Route introuvable" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    const statusCode = message === "Payload too large" ? 413 : 400;
    sendJson(res, statusCode, { error: message });
  }
}
async function startApiServer() {
  if (apiInfo) return apiInfo;
  const preferredPort = getPreferredPort();
  apiServer = http.createServer((req, res) => {
    void requestListener(req, res);
  });
  const actualPort = await listenWithFallback(apiServer, preferredPort);
  const address = apiServer.address();
  apiInfo = buildApiInfo(address?.port ?? actualPort, preferredPort);
  return apiInfo;
}
function getApiInfo() {
  if (apiInfo && apiServer?.listening) {
    apiInfo = {
      ...apiInfo,
      storagePath: getCurrentStoragePath()
    };
  }
  return apiInfo;
}
async function stopApiServer() {
  if (!apiServer) return;
  await new Promise((resolve, reject) => {
    apiServer?.close((error) => {
      if (error) {
        if (error.code === "ERR_SERVER_NOT_RUNNING") {
          resolve();
          return;
        }
        reject(error);
        return;
      }
      resolve();
    });
  });
  apiServer = null;
  apiInfo = null;
}
async function restartApiServer() {
  if (apiServer) {
    await stopApiServer();
  }
  return startApiServer();
}
const LOG = `${process.env.HOME}/.config/banette/debug.log`;
try {
  fs__namespace.writeFileSync(LOG, `[${(/* @__PURE__ */ new Date()).toISOString()}] main.ts start
`);
} catch {
}
const log = (msg) => {
  try {
    fs__namespace.appendFileSync(LOG, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
  } catch {
  }
};
if (process.platform === "linux") {
  try {
    electron.app.commandLine.appendSwitch("no-sandbox");
    log("no-sandbox switched OK");
  } catch (e) {
    log(`no-sandbox FAILED: ${e}`);
  }
}
let mainWindow = null;
const notifiedSlots = /* @__PURE__ */ new Set();
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}
function getWindowIconPath() {
  if (process.platform !== "win32") return void 0;
  if (electron.app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico");
  }
  return path.join(__dirname, "../../build/icon.ico");
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 700,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    resizable: true,
    frame: false,
    transparent: false,
    show: false,
    autoHideMenuBar: true,
    center: true,
    backgroundColor: "#FFF8E7",
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    showMainWindow();
  });
  mainWindow.webContents.on("did-finish-load", () => {
    showMainWindow();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[Banette Window] renderer process gone", details);
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("[Banette Window] failed to load", { errorCode, errorDescription, validatedURL });
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (!electron.app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  setTimeout(() => {
    showMainWindow();
  }, 1500);
}
function pruneNotifiedSlots() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  for (const key of notifiedSlots) {
    if (!key.startsWith(today)) notifiedSlots.delete(key);
  }
}
function checkWorkHoursAlerts() {
  pruneNotifiedSlots();
  const { workHours } = getSettings();
  if (!workHours.enabled) return;
  const timers = listTimers();
  const running = timers.filter((t) => t.running_since);
  if (running.length === 0) return;
  const now = /* @__PURE__ */ new Date();
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = dayNames[now.getDay()];
  if (!workHours.days.includes(today)) return;
  const todayStr = now.toISOString().split("T")[0];
  const alertMs = (workHours.alertMinutes ?? 15) * 60 * 1e3;
  const slots = [
    { key: "lunch", slot: workHours.lunchBreak, label: "pause déjeuner" },
    { key: "end", slot: workHours.endOfDay, label: "fin de journée" }
  ].filter(({ slot }) => slot.enabled && slot.time);
  for (const { key, slot, label } of slots) {
    const [h, m] = slot.time.split(":").map(Number);
    const slotDate = new Date(now);
    slotDate.setHours(h, m, 0, 0);
    const diffMs = slotDate.getTime() - now.getTime();
    const notifKey = `${todayStr}-${key}`;
    if (diffMs >= 0 && diffMs <= alertMs && !notifiedSlots.has(notifKey)) {
      notifiedSlots.add(notifKey);
      const diffMin = Math.round(diffMs / 6e4);
      const names = running.map((t) => `"${t.title}"`).join(", ");
      const timeStr = diffMin <= 1 ? "maintenant" : `dans ${diffMin} min`;
      const notification = new electron.Notification({
        title: "Banette — Timer en cours",
        body: `${names} tourne encore. ${label} ${timeStr}.`,
        silent: false
      });
      notification.on("click", () => {
        mainWindow?.show();
        mainWindow?.focus();
      });
      notification.show();
    }
  }
}
function wrapHandler(fn) {
  try {
    return fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[IPC Error]", message);
    return { error: message };
  }
}
function registerIpcHandlers() {
  electron.ipcMain.handle("notes:list", () => wrapHandler(() => listNotes()));
  electron.ipcMain.handle("notes:get", (_e, id) => wrapHandler(() => getNote(id)));
  electron.ipcMain.handle("notes:create", (_e, title, content) => wrapHandler(() => createNote(title, content)));
  electron.ipcMain.handle("notes:update", (_e, id, updates) => wrapHandler(() => updateNote(id, updates)));
  electron.ipcMain.handle("notes:delete", (_e, id) => wrapHandler(() => deleteNote(id)));
  electron.ipcMain.handle("notes:reorder", (_e, ids) => wrapHandler(() => reorderNotes(ids)));
  electron.ipcMain.handle("todos:list", () => wrapHandler(() => listTodos()));
  electron.ipcMain.handle("todos:get", (_e, id) => wrapHandler(() => getTodo(id)));
  electron.ipcMain.handle("todos:create", (_e, title, content, priority) => wrapHandler(() => createTodo(title, content, priority)));
  electron.ipcMain.handle("todos:update", (_e, id, updates) => wrapHandler(() => updateTodo(id, updates)));
  electron.ipcMain.handle("todos:delete", (_e, id) => wrapHandler(() => deleteTodo(id)));
  electron.ipcMain.handle("todos:reorder", (_e, ids) => wrapHandler(() => reorderTodos(ids)));
  electron.ipcMain.handle("timers:list", () => wrapHandler(() => listTimers()));
  electron.ipcMain.handle("timers:get", (_e, id) => wrapHandler(() => getTimer(id)));
  electron.ipcMain.handle("timers:create", (_e, title) => wrapHandler(() => createTimer(title)));
  electron.ipcMain.handle("timers:update", (_e, id, updates) => wrapHandler(() => updateTimer(id, updates)));
  electron.ipcMain.handle("timers:delete", (_e, id) => wrapHandler(() => deleteTimer(id)));
  electron.ipcMain.handle("timers:reorder", (_e, ids) => wrapHandler(() => reorderTimers(ids)));
  electron.ipcMain.handle("item:export", async (_e, type, id) => {
    try {
      const item = type === "notes" ? getNote(id) : getTodo(id);
      if (!item) return { error: "Introuvable" };
      const sourcePath = type === "notes" ? getNotePath(id) : getTodoPath(id);
      const result = await electron.dialog.showSaveDialog(mainWindow, {
        title: "Exporter",
        defaultPath: `${item.title || "sans-titre"}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }]
      });
      if (!result.canceled && result.filePath) {
        fs__namespace.copyFileSync(sourcePath, result.filePath);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
  electron.ipcMain.handle("item:import", async () => {
    try {
      const result = await electron.dialog.showOpenDialog(mainWindow, {
        title: "Importer des fichiers Markdown",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Markdown", extensions: ["md"] }]
      });
      if (result.canceled || result.filePaths.length === 0) return [];
      return importMarkdownFiles(result.filePaths);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
  electron.ipcMain.handle("settings:get", () => wrapHandler(() => ({
    ...getSettings(),
    storagePath: getCurrentStoragePath()
  })));
  electron.ipcMain.handle("settings:set", async (_e, updates) => {
    try {
      const previous = getSettings();
      const next = setSettings(updates);
      if (updates.apiPort !== void 0 && updates.apiPort !== previous.apiPort) {
        const api = await restartApiServer();
        return { ...next, api };
      }
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[IPC Error]", message);
      return { error: message };
    }
  });
  electron.ipcMain.handle("api:get-info", () => wrapHandler(() => getApiInfo()));
  electron.ipcMain.handle("folder:choose", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      title: "Choisir le dossier de stockage",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
  electron.ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  electron.ipcMain.handle("window:maximize", () => {
    if (process.platform === "darwin") {
      mainWindow?.setFullScreen(!mainWindow.isFullScreen());
    } else {
      if (mainWindow?.isMaximized()) mainWindow.unmaximize();
      else mainWindow?.maximize();
    }
  });
  electron.ipcMain.handle("window:close", () => mainWindow?.close());
}
electron.app.on("will-finish-launching", () => log("will-finish-launching"));
electron.app.on("ready", () => log("ready event"));
electron.app.whenReady().then(() => {
  log("whenReady resolved");
  if (process.platform === "win32") {
    electron.app.setAppUserModelId(electron.app.isPackaged ? "com.banette.app" : process.execPath);
  }
  electron.app.on("browser-window-created", (_, window) => {
    window.webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (electron.app.isPackaged) {
          if (input.code === "KeyR" && (input.control || input.meta)) event.preventDefault();
          if (input.code === "KeyI" && (input.alt && input.meta || input.control && input.shift)) event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (window.webContents.isDevToolsOpened()) window.webContents.closeDevTools();
            else window.webContents.openDevTools({ mode: "undocked" });
          }
        }
      }
    });
  });
  electron.globalShortcut.register("CommandOrControl+Shift+B", () => {
    showMainWindow();
  });
  void startApiServer().then((info) => {
    const suffix = info.usingFallbackPort ? ` (fallback from ${info.preferredPort})` : "";
    console.log(`[Banette API] listening on ${info.baseUrl}${suffix}`);
  }).catch((error) => {
    console.error("[Banette API] failed to start", error);
  });
  setInterval(checkWorkHoursAlerts, 60 * 1e3);
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
  stopAllRunningTimers();
  void stopApiServer().catch((error) => {
    console.error("[Banette API] failed to stop cleanly", error);
  });
});
