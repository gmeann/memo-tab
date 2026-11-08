import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import initSqlJs, { Database } from "sql.js";
import fs from "node:fs";
import path from "node:path";

const isDev = !app.isPackaged;
let database: Database | null = null;
let databasePath = "";

type Todo = { id: string; text: string; completed: boolean };
type Note = { id: string; title: string; body: string; updatedAt: string; todos: Todo[] };
type NoteTab = { id: string; name: string; todosEnabled: boolean; notes: Note[] };
type AppState = { tabs: NoteTab[] };

function persistDatabase() {
  if (!database || !databasePath) return;
  const bytes = database.export();
  fs.writeFileSync(databasePath, Buffer.from(bytes));
}

async function initializeDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist", file)
      : path.join(app.getAppPath(), "node_modules", "sql.js", "dist", file)
  });

  databasePath = path.join(app.getPath("userData"), "memo-tab.sqlite");
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  if (fs.existsSync(databasePath)) {
    const file = fs.readFileSync(databasePath);
    database = new SQL.Database(new Uint8Array(file));
  } else {
    database = new SQL.Database();
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const existing = database.exec("SELECT id FROM app_state WHERE id = 1");
  if (existing.length === 0) {
    const initialState: AppState = {
      tabs: [
        {
          id: "inbox",
          name: "메모",
          todosEnabled: false,
          notes: [
            {
              id: "welcome",
              title: "Memo Tab에 오신 걸 환영해요",
              body: "복잡한 메모 창 대신, 탭 하나로 깔끔하게 정리해 보세요.\n\n왼쪽에서 메모를 선택하고 이곳에서 바로 편집할 수 있어요.",
              updatedAt: new Date().toISOString(),
              todos: []
            },
            {
              id: "sample",
              title: "이번 주 할 일",
              body: "수업 자료 정리\n가정통신문 확인\n다음 주 준비물 체크",
              updatedAt: new Date().toISOString(),
              todos: []
            }
          ]
        },
        { id: "class", name: "학급 운영", todosEnabled: true, notes: [] },
        { id: "lesson", name: "수업 준비", todosEnabled: false, notes: [] },
        { id: "personal", name: "개인", todosEnabled: false, notes: [] }
      ]
    };
    saveState(initialState);
  }
}

function loadState(): AppState {
  if (!database) throw new Error("Database is not initialized");
  const result = database.exec("SELECT payload FROM app_state WHERE id = 1");
  if (!result.length || !result[0].values.length) return { tabs: [] };
  return JSON.parse(String(result[0].values[0][0])) as AppState;
}

function saveState(state: AppState) {
  if (!database) throw new Error("Database is not initialized");
  const safeState: AppState = {
    tabs: Array.isArray(state?.tabs) ? state.tabs : []
  };
  database.run(
    "INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
    [JSON.stringify(safeState), new Date().toISOString()]
  );
  persistDatabase();
}

function registerIpcHandlers() {
  ipcMain.handle("memo-tab:load-state", () => loadState());
  ipcMain.handle("memo-tab:save-state", (_event, state: AppState) => {
    saveState(state);
    return { success: true };
  });
  ipcMain.handle("memo-tab:get-storage-path", () => databasePath);
  ipcMain.handle("memo-tab:set-always-on-top", (_event, enabled: boolean) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!window) return false;
    window.setAlwaysOnTop(Boolean(enabled));
    return window.isAlwaysOnTop();
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 760,
    minHeight: 560,
    title: "Memo Tab",
    backgroundColor: "#f5f5f7",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    void window.loadURL("http://127.0.0.1:5173");
  } else {
    void window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  await initializeDatabase();
  registerIpcHandlers();
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+M", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());

app.on("before-quit", () => {
  persistDatabase();
  database?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});