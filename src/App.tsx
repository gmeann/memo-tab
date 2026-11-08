import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronDown, FileText, Menu, Plus, Search, Settings2,
  Trash2, ListTodo, X, Star, RotateCcw, Download, Upload, Heart,
  MoreHorizontal
} from "lucide-react";

type Todo = { id: string; text: string; completed: boolean };
type Note = {
  id: string; title: string; body: string; updatedAt: string; todos: Todo[];
  isFavorite?: boolean; deletedAt?: string;
};
type NoteTab = { id: string; name: string; todosEnabled: boolean; notes: Note[] };
type AppState = { tabs: NoteTab[] };
type View = "notes" | "favorites" | "trash";
type ListedNote = { note: Note; tab: NoteTab };

const fallbackState: AppState = {
  tabs: [
    { id: "inbox", name: "메모", todosEnabled: false, notes: [] },
    { id: "class", name: "학급 운영", todosEnabled: true, notes: [] },
    { id: "lesson", name: "수업 준비", todosEnabled: false, notes: [] },
    { id: "personal", name: "개인", todosEnabled: false, notes: [] }
  ]
};

declare global {
  interface Window {
    memoTab?: {
      platform: string; version: string;
      loadState: () => Promise<AppState>;
      saveState: (state: AppState) => Promise<{ success: boolean }>;
      getStoragePath: () => Promise<string>;
    };
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금 전";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "방금 전";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function isValidState(value: unknown): value is AppState {
  if (!value || typeof value !== "object" || !Array.isArray((value as AppState).tabs)) return false;
  return (value as AppState).tabs.every((tab) =>
    tab && typeof tab.id === "string" && typeof tab.name === "string" &&
    Array.isArray(tab.notes) && tab.notes.every((note) =>
      note && typeof note.id === "string" && typeof note.title === "string" &&
      typeof note.body === "string" && Array.isArray(note.todos)
    )
  );
}

export default function App() {
  const [tabs, setTabs] = useState<NoteTab[]>(fallbackState.tabs);
  const [activeTabId, setActiveTabId] = useState("inbox");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("불러오는 중");
  const [todoInput, setTodoInput] = useState("");
  const [view, setView] = useState<View>("notes");
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!window.memoTab) {
        setSaveStatus("데스크톱 앱에서 실행해 주세요");
        setLoading(false);
        return;
      }
      try {
        const state = await window.memoTab.loadState();
        if (!mounted) return;
        const loadedTabs = isValidState(state) ? state.tabs : fallbackState.tabs;
        setTabs(loadedTabs);
        setActiveTabId(loadedTabs[0]?.id ?? "inbox");
        setActiveNoteId(loadedTabs[0]?.notes.find((note) => !note.deletedAt)?.id ?? "");
        setSaveStatus("저장됨");
      } catch (error) {
        console.error("Failed to load Memo Tab data", error);
        setSaveStatus("불러오기 실패");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading || !window.memoTab) return;
    setSaveStatus("저장 중");
    const timeout = window.setTimeout(async () => {
      try {
        await window.memoTab?.saveState({ tabs });
        setSaveStatus("저장됨");
      } catch (error) {
        console.error("Failed to save Memo Tab data", error);
        setSaveStatus("저장 실패");
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [tabs, loading]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const allNotes = useMemo<ListedNote[]>(() =>
    tabs.flatMap((tab) => tab.notes.map((note) => ({ note, tab }))),
  [tabs]);

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return allNotes.filter(({ note, tab }) => {
      const inView = view === "trash" ? Boolean(note.deletedAt)
        : view === "favorites" ? Boolean(note.isFavorite && !note.deletedAt)
        : !note.deletedAt;
      const matches = !q || (note.title + " " + note.body + " " +
        note.todos.map((todo) => todo.text).join(" ") + " " + tab.name)
        .toLocaleLowerCase().includes(q);
      return inView && matches;
    }).sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt));
  }, [allNotes, query, view]);

  function updateTab(tabId: string, updater: (tab: NoteTab) => NoteTab) {
    setTabs((current) => current.map((tab) => tab.id === tabId ? updater(tab) : tab));
  }

  function updateNote(tabId: string, noteId: string, patch: Partial<Note>) {
    updateTab(tabId, (tab) => ({
      ...tab,
      notes: tab.notes.map((note) => note.id === noteId
        ? { ...note, ...patch, updatedAt: new Date().toISOString() }
        : note)
    }));
  }

  function addNote() {
    if (!activeTab) return;
    const note: Note = {
      id: crypto.randomUUID(), title: "", body: "",
      updatedAt: new Date().toISOString(), todos: [], isFavorite: false
    };
    updateTab(activeTab.id, (tab) => ({ ...tab, notes: [note, ...tab.notes] }));
    setActiveNoteId(note.id);
    setView("notes");
    setQuery("");
  }

  function moveToTrash(tabId: string, noteId: string) {
    updateNote(tabId, noteId, { deletedAt: new Date().toISOString() });
    if (activeNoteId === noteId) {
      const next = activeTab?.notes.find((note) => note.id !== noteId && !note.deletedAt);
      setActiveNoteId(next?.id ?? "");
    }
  }

  function restoreNote(tabId: string, noteId: string) {
    updateNote(tabId, noteId, { deletedAt: undefined });
    setView("notes");
    setActiveTabId(tabId);
    setActiveNoteId(noteId);
  }

  function permanentlyDelete(tabId: string, noteId: string) {
    if (!window.confirm("이 메모를 영구 삭제할까요? 이 작업은 되돌릴 수 없어요.")) return;
    updateTab(tabId, (tab) => ({ ...tab, notes: tab.notes.filter((note) => note.id !== noteId) }));
    setActiveNoteId("");
  }

  function emptyTrash() {
    const count = allNotes.filter(({ note }) => note.deletedAt).length;
    if (!count || !window.confirm(`휴지통의 메모 ${count}개를 영구 삭제할까요?`)) return;
    setTabs((current) => current.map((tab) => ({ ...tab, notes: tab.notes.filter((note) => !note.deletedAt) })));
    setActiveNoteId("");
  }

  function addTab() {
    const name = window.prompt("새 탭 이름을 입력하세요.");
    if (!name?.trim()) return;
    const tab: NoteTab = { id: crypto.randomUUID(), name: name.trim(), todosEnabled: false, notes: [] };
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
    setActiveNoteId("");
    setView("notes");
    setQuery("");
  }

  function renameTab() {
    if (!activeTab) return;
    const name = window.prompt("탭 이름을 수정하세요.", activeTab.name);
    if (name?.trim()) updateTab(activeTab.id, (tab) => ({ ...tab, name: name.trim() }));
  }

  function deleteTab() {
    if (!activeTab || tabs.length <= 1) return;
    if (!window.confirm(`'${activeTab.name}' 탭과 안의 메모를 모두 삭제할까요?`)) return;
    const remaining = tabs.filter((tab) => tab.id !== activeTab.id);
    setTabs(remaining);
    setActiveTabId(remaining[0].id);
    setActiveNoteId(remaining[0].notes.find((note) => !note.deletedAt)?.id ?? "");
  }

  function selectTab(id: string) {
    setActiveTabId(id);
    const next = tabs.find((tab) => tab.id === id);
    setActiveNoteId(next?.notes.find((note) => !note.deletedAt)?.id ?? "");
    setView("notes");
    setQuery("");
  }

  function selectListedNote(item: ListedNote) {
    setActiveTabId(item.tab.id);
    setActiveNoteId(item.note.id);
  }

  function addTodo() {
    if (!activeNote || !activeTab || !todoInput.trim()) return;
    const todos = [...activeNote.todos, { id: crypto.randomUUID(), text: todoInput.trim(), completed: false }];
    updateNote(activeTab.id, activeNote.id, { todos });
    setTodoInput("");
  }

  function toggleTodo(todoId: string) {
    if (!activeNote || !activeTab) return;
    updateNote(activeTab.id, activeNote.id, {
      todos: activeNote.todos.map((todo) => todo.id === todoId ? { ...todo, completed: !todo.completed } : todo)
    });
  }

  function deleteTodo(todoId: string) {
    if (!activeNote || !activeTab) return;
    updateNote(activeTab.id, activeNote.id, { todos: activeNote.todos.filter((todo) => todo.id !== todoId) });
  }

  function exportData() {
    const payload = JSON.stringify({ format: "memo-tab-backup", version: 1, exportedAt: new Date().toISOString(), tabs }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `memo-tab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("백업 파일을 내보냈어요.");
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = parsed?.format === "memo-tab-backup" ? { tabs: parsed.tabs } : parsed;
      if (!isValidState(imported)) throw new Error("invalid backup");
      if (!window.confirm("현재 데이터를 백업 파일의 내용으로 교체할까요? 기존 데이터는 백업 후 진행하세요.")) return;
      setTabs(imported.tabs);
      setActiveTabId(imported.tabs[0]?.id ?? "");
      setActiveNoteId(imported.tabs[0]?.notes.find((note: Note) => !note.deletedAt)?.id ?? "");
      setView("notes");
      setQuery("");
      setNotice("백업 데이터를 불러왔어요.");
    } catch {
      window.alert("올바른 Memo Tab 백업 파일이 아니에요.");
    } finally {
      event.target.value = "";
    }
  }

  if (loading) {
    return <main className="loading-screen"><div className="brand-mark"><FileText size={17} /></div><span>Memo Tab 불러오는 중...</span></main>;
  }

  const currentListed = allNotes.find(({ note }) => note.id === activeNoteId);
  const selectedNote = currentListed?.note;
  const selectedTab = currentListed?.tab;
  const isTrashView = view === "trash";

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div className="traffic-lights"><i /><i /><i /></div>
        <div className="titlebar-title">Memo Tab</div>
        <button className="icon-button titlebar-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="사이드바 전환"><Menu size={17} /></button>
      </header>
      <div className="workspace">
        {sidebarOpen && <aside className="sidebar">
          <div className="brand-row"><div className="brand-mark"><FileText size={17} /></div><span>Memo Tab</span><button className="icon-button small" aria-label="탭 설정" onClick={renameTab}><Settings2 size={16} /></button></div>
          <div className="section-label">내 공간 <button className="icon-button tiny" onClick={addTab} aria-label="탭 추가"><Plus size={15} /></button></div>
          <nav className="tab-nav">
            {tabs.map((tab) => <button key={tab.id} className={`tab-nav-item ${activeTabId === tab.id && view === "notes" ? "active" : ""}`} onClick={() => selectTab(tab.id)}>
              <span className="tab-dot" /><span>{tab.name}</span><span className="tab-count">{tab.notes.filter((note) => !note.deletedAt).length || ""}</span>
            </button>)}
          </nav>
          <div className="sidebar-actions">
            <button onClick={() => { setView("favorites"); setQuery(""); }} className={view === "favorites" ? "selected-action" : ""}><Heart size={13} /> 즐겨찾기 <span>{allNotes.filter(({ note }) => note.isFavorite && !note.deletedAt).length || ""}</span></button>
            <button onClick={() => { setView("trash"); setQuery(""); }} className={view === "trash" ? "selected-action" : ""}><Trash2 size={13} /> 휴지통 <span>{allNotes.filter(({ note }) => note.deletedAt).length || ""}</span></button>
            <button onClick={renameTab}><Settings2 size={13} /> 현재 탭 이름 변경</button>
            <button onClick={deleteTab} disabled={tabs.length <= 1}><X size={13} /> 현재 탭 삭제</button>
          </div>
          <div className="sidebar-bottom">
            <div className="storage-status"><span className={`status-dot ${saveStatus === "저장됨" ? "online" : ""}`} /> {saveStatus}</div>
            <div className="version-label">MEMO TAB · 0.3.0</div>
          </div>
        </aside>}

        <section className="note-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">{view === "trash" ? "RECYCLE BIN" : view === "favorites" ? "FAVORITES" : "WORKSPACE"}</div><h1>{view === "trash" ? "휴지통" : view === "favorites" ? "즐겨찾기" : activeTab?.name ?? "메모"}</h1></div>
            {view === "notes" ? <button className="primary-button" onClick={addNote}><Plus size={16} /> 새 메모</button>
              : view === "trash" ? <button className="subtle-button" onClick={emptyTrash} disabled={!visibleNotes.length}>휴지통 비우기</button> : null}
          </div>
          <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="모든 탭에서 메모 검색" /><kbd>⌘ K</kbd></div>
          <div className="note-list">
            {visibleNotes.map((item) => <button key={item.note.id} className={`note-card ${activeNoteId === item.note.id ? "selected" : ""}`} onClick={() => selectListedNote(item)}>
              <div className="note-card-top"><FileText size={14} /><span>{item.tab.name}</span><span className="note-date">{formatDate(item.note.updatedAt)}</span>{item.note.isFavorite && !item.note.deletedAt && <Star size={12} className="favorite-mark" fill="currentColor" />}</div>
              <strong>{item.note.title || "제목 없는 메모"}</strong>
              <p>{item.note.body || (item.note.todos.length ? item.note.todos.map((todo) => todo.text).join(" · ") : "내용 없음")}</p>
            </button>)}
            {visibleNotes.length === 0 && <div className="empty-list">{query ? "검색 결과가 없어요." : view === "trash" ? "휴지통이 비어 있어요." : view === "favorites" ? "즐겨찾기한 메모가 없어요." : "아직 메모가 없어요."}</div>}
          </div>
          <div className="list-footer">{visibleNotes.length}개의 메모</div>
        </section>

        <section className="editor-panel">
          {selectedNote && selectedTab ? <>
            <div className="editor-toolbar">
              <div className="breadcrumb">{selectedTab.name}<ChevronDown size={13} /><span>{isTrashView ? "휴지통" : "메모"}</span></div>
              <div className="toolbar-actions">
                <span className="saved-label"><Check size={13} /> {saveStatus}</span>
                {isTrashView ? <>
                  <button className="icon-button" aria-label="복원" title="복원" onClick={() => restoreNote(selectedTab.id, selectedNote.id)}><RotateCcw size={16} /></button>
                  <button className="icon-button danger-icon" aria-label="영구 삭제" title="영구 삭제" onClick={() => permanentlyDelete(selectedTab.id, selectedNote.id)}><Trash2 size={16} /></button>
                </> : <>
                  <button className={`icon-button ${selectedNote.isFavorite ? "favorite-active" : ""}`} aria-label="즐겨찾기" title="즐겨찾기" onClick={() => updateNote(selectedTab.id, selectedNote.id, { isFavorite: !selectedNote.isFavorite })}><Star size={16} fill={selectedNote.isFavorite ? "currentColor" : "none"} /></button>
                  <button className="icon-button" aria-label="휴지통으로 이동" title="휴지통으로 이동" onClick={() => moveToTrash(selectedTab.id, selectedNote.id)}><Trash2 size={16} /></button>
                  <button className="icon-button" aria-label="더 보기" title="백업 및 복원" onClick={exportData}><MoreHorizontal size={18} /></button>
                </>}
              </div>
            </div>
            <article className="editor">
              <input className="title-input" value={selectedNote.title} readOnly={isTrashView} onChange={(event) => updateNote(selectedTab.id, selectedNote.id, { title: event.target.value })} placeholder="제목 없는 메모" />
              <div className="editor-meta">{isTrashView ? `휴지통으로 이동 ${formatDate(selectedNote.deletedAt ?? selectedNote.updatedAt)}` : `마지막 수정 ${formatDate(selectedNote.updatedAt)}`}</div>
              <textarea className="body-input" value={selectedNote.body} readOnly={isTrashView} onChange={(event) => updateNote(selectedTab.id, selectedNote.id, { body: event.target.value })} placeholder="메모를 입력하세요..." />
              {!isTrashView && <section className="todo-section">
                <div className="todo-section-heading">
                  <div><ListTodo size={15} /><strong>체크리스트</strong></div>
                  <label className="toggle-control">
                    <input type="checkbox" checked={selectedTab.todosEnabled} onChange={(event) => updateTab(selectedTab.id, (tab) => ({ ...tab, todosEnabled: event.target.checked }))} />
                    <span className="toggle-track" /><span>{selectedTab.todosEnabled ? "켜짐" : "꺼짐"}</span>
                  </label>
                </div>
                {selectedTab.todosEnabled && <>
                  <form className="todo-form" onSubmit={(event) => { event.preventDefault(); addTodo(); }}>
                    <input value={todoInput} onChange={(event) => setTodoInput(event.target.value)} placeholder="할 일을 입력하고 Enter" />
                    <button type="submit" disabled={!todoInput.trim()}><Plus size={15} /></button>
                  </form>
                  <div className="todo-items">
                    {selectedNote.todos.map((todo) => <div className={`todo-item ${todo.completed ? "completed" : ""}`} key={todo.id}>
                      <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} /><span>{todo.text}</span><button onClick={() => deleteTodo(todo.id)} aria-label="할 일 삭제"><X size={13} /></button>
                    </div>)}
                    {selectedNote.todos.length === 0 && <p className="todo-empty">아직 등록한 할 일이 없어요.</p>}
                  </div>
                  {selectedNote.todos.length > 0 && <div className="todo-progress">{selectedNote.todos.filter((todo) => todo.completed).length} / {selectedNote.todos.length} 완료</div>}
                </>}
              </section>}
              {isTrashView && <div className="trash-help">휴지통의 메모는 복원하거나 영구 삭제할 수 있어요.</div>}
            </article>
            <div className="editor-footer"><span>변경 사항은 이 기기에 자동 저장됩니다.</span><button className="icon-button" aria-label="백업 내보내기" title="백업 내보내기" onClick={exportData}><Download size={15} /></button></div>
          </> : <div className="editor-empty"><div className="empty-icon"><FileText size={24} /></div><h2>{isTrashView ? "휴지통이 비어 있어요" : "메모를 선택해 주세요"}</h2><p>왼쪽 목록에서 메모를 선택하거나 새 메모를 만들어 보세요.</p>{view === "notes" && <button className="primary-button" onClick={addNote}><Plus size={16} /> 새 메모</button>}</div>}
        </section>
      </div>
      <div className="backup-actions">
        <button onClick={exportData}><Download size={13} /> 백업 내보내기</button>
        <button onClick={() => importRef.current?.click()}><Upload size={13} /> 백업 불러오기</button>
        <input ref={importRef} type="file" accept="application/json,.json" onChange={importData} hidden />
      </div>
      {notice && <button className="notice-toast" onClick={() => setNotice("")}>{notice} <X size={12} /></button>}
    </main>
  );
}