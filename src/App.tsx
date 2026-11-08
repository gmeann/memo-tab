import { useEffect, useMemo, useState } from "react";
import {
  Archive, Check, ChevronDown, FileText, Menu, MoreHorizontal,
  Plus, Search, Settings2, Star, Trash2, ListTodo, X
} from "lucide-react";

type Todo = { id: string; text: string; completed: boolean };
type Note = { id: string; title: string; body: string; updatedAt: string; todos: Todo[] };
type NoteTab = { id: string; name: string; todosEnabled: boolean; notes: Note[] };
type AppState = { tabs: NoteTab[] };

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
      platform: string;
      version: string;
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

export default function App() {
  const [tabs, setTabs] = useState<NoteTab[]>(fallbackState.tabs);
  const [activeTabId, setActiveTabId] = useState("inbox");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("불러오는 중");
  const [storagePath, setStoragePath] = useState("");
  const [todoInput, setTodoInput] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!window.memoTab) {
        setSaveStatus("데스크톱 앱에서 실행해 주세요");
        setLoading(false);
        return;
      }
      try {
        const [state, location] = await Promise.all([
          window.memoTab.loadState(),
          window.memoTab.getStoragePath()
        ]);
        if (!mounted) return;
        const loadedTabs = Array.isArray(state.tabs) ? state.tabs : fallbackState.tabs;
        setTabs(loadedTabs);
        setActiveTabId(loadedTabs[0]?.id ?? "inbox");
        setActiveNoteId(loadedTabs[0]?.notes[0]?.id ?? "");
        setStoragePath(location);
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
  const activeNote = activeTab?.notes.find((note) => note.id === activeNoteId) ?? activeTab?.notes[0];

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q || !activeTab) return activeTab?.notes ?? [];
    return activeTab.notes.filter((note) =>
      (note.title + " " + note.body + " " + note.todos.map((todo) => todo.text).join(" ")).toLocaleLowerCase().includes(q)
    );
  }, [activeTab, query]);

  function updateTab(tabId: string, updater: (tab: NoteTab) => NoteTab) {
    setTabs((current) => current.map((tab) => tab.id === tabId ? updater(tab) : tab));
  }

  function updateNote(noteId: string, patch: Partial<Note>) {
    if (!activeTab) return;
    updateTab(activeTab.id, (tab) => ({
      ...tab,
      notes: tab.notes.map((note) => note.id === noteId
        ? { ...note, ...patch, updatedAt: new Date().toISOString() }
        : note)
    }));
  }

  function addNote() {
    if (!activeTab) return;
    const note: Note = {
      id: crypto.randomUUID(),
      title: "",
      body: "",
      updatedAt: new Date().toISOString(),
      todos: []
    };
    updateTab(activeTab.id, (tab) => ({ ...tab, notes: [note, ...tab.notes] }));
    setActiveNoteId(note.id);
    setQuery("");
  }

  function deleteNote(noteId: string) {
    if (!activeTab) return;
    const remaining = activeTab.notes.filter((note) => note.id !== noteId);
    updateTab(activeTab.id, (tab) => ({ ...tab, notes: remaining }));
    setActiveNoteId(remaining[0]?.id ?? "");
  }

  function addTab() {
    const name = window.prompt("새 탭 이름을 입력하세요.");
    if (!name?.trim()) return;
    const tab: NoteTab = { id: crypto.randomUUID(), name: name.trim(), todosEnabled: false, notes: [] };
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
    setActiveNoteId("");
    setQuery("");
  }

  function renameTab() {
    if (!activeTab) return;
    const name = window.prompt("탭 이름을 수정하세요.", activeTab.name);
    if (!name?.trim()) return;
    updateTab(activeTab.id, (tab) => ({ ...tab, name: name.trim() }));
  }

  function deleteTab() {
    if (!activeTab || tabs.length <= 1) return;
    if (!window.confirm(`'${activeTab.name}' 탭과 안의 메모를 모두 삭제할까요?`)) return;
    const remaining = tabs.filter((tab) => tab.id !== activeTab.id);
    setTabs(remaining);
    setActiveTabId(remaining[0].id);
    setActiveNoteId(remaining[0].notes[0]?.id ?? "");
  }

  function selectTab(id: string) {
    setActiveTabId(id);
    const next = tabs.find((tab) => tab.id === id);
    setActiveNoteId(next?.notes[0]?.id ?? "");
    setQuery("");
  }

  function addTodo() {
    if (!activeNote || !todoInput.trim()) return;
    const todos = [...activeNote.todos, { id: crypto.randomUUID(), text: todoInput.trim(), completed: false }];
    updateNote(activeNote.id, { todos });
    setTodoInput("");
  }

  function toggleTodo(todoId: string) {
    if (!activeNote) return;
    updateNote(activeNote.id, {
      todos: activeNote.todos.map((todo) => todo.id === todoId ? { ...todo, completed: !todo.completed } : todo)
    });
  }

  function deleteTodo(todoId: string) {
    if (!activeNote) return;
    updateNote(activeNote.id, { todos: activeNote.todos.filter((todo) => todo.id !== todoId) });
  }

  if (loading) {
    return <main className="loading-screen"><div className="brand-mark"><FileText size={17} /></div><span>Memo Tab 불러오는 중...</span></main>;
  }

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div className="traffic-lights"><i /><i /><i /></div>
        <div className="titlebar-title">Memo Tab</div>
        <button className="icon-button titlebar-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="사이드바 전환"><Menu size={17} /></button>
      </header>

      <div className="workspace">
        {sidebarOpen && <aside className="sidebar">
          <div className="brand-row">
            <div className="brand-mark"><FileText size={17} /></div>
            <span>Memo Tab</span>
            <button className="icon-button small" aria-label="탭 설정" onClick={renameTab}><Settings2 size={16} /></button>
          </div>

          <div className="section-label">내 공간 <button className="icon-button tiny" onClick={addTab} aria-label="탭 추가"><Plus size={15} /></button></div>
          <nav className="tab-nav">
            {tabs.map((tab) => (
              <button key={tab.id} className={`tab-nav-item ${activeTabId === tab.id ? "active" : ""}`} onClick={() => selectTab(tab.id)}>
                <span className="tab-dot" />
                <span>{tab.name}</span>
                <span className="tab-count">{tab.notes.length || ""}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-actions">
            <button onClick={renameTab}><Settings2 size={13} /> 현재 탭 이름 변경</button>
            <button onClick={deleteTab} disabled={tabs.length <= 1}><Trash2 size={13} /> 현재 탭 삭제</button>
          </div>

          <div className="sidebar-bottom">
            <div className="storage-status"><span className={`status-dot ${saveStatus === "저장됨" ? "online" : ""}`} /> {saveStatus}</div>
            <div className="version-label">MEMO TAB · 0.2.0</div>
          </div>
        </aside>}

        <section className="note-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">WORKSPACE</div><h1>{activeTab?.name ?? "메모"}</h1></div>
            <button className="primary-button" onClick={addNote}><Plus size={16} /> 새 메모</button>
          </div>
          <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="현재 탭 메모 검색" /><kbd>⌘ K</kbd></div>
          <div className="note-list">
            {visibleNotes.map((note) => (
              <button key={note.id} className={`note-card ${activeNote?.id === note.id ? "selected" : ""}`} onClick={() => setActiveNoteId(note.id)}>
                <div className="note-card-top"><FileText size={14} /><span>{formatDate(note.updatedAt)}</span></div>
                <strong>{note.title || "제목 없는 메모"}</strong>
                <p>{note.body || (note.todos.length ? note.todos.map((todo) => todo.text).join(" · ") : "내용 없음")}</p>
              </button>
            ))}
            {visibleNotes.length === 0 && <div className="empty-list">{query ? "검색 결과가 없어요." : "아직 메모가 없어요."}</div>}
          </div>
          <div className="list-footer">{activeTab?.notes.length ?? 0}개의 메모</div>
        </section>

        <section className="editor-panel">
          {activeNote ? <>
            <div className="editor-toolbar">
              <div className="breadcrumb">{activeTab.name}<ChevronDown size={13} /><span>메모</span></div>
              <div className="toolbar-actions">
                <span className="saved-label"><Check size={13} /> {saveStatus}</span>
                <button className="icon-button" aria-label="메모 삭제" onClick={() => deleteNote(activeNote.id)}><Trash2 size={16} /></button>
                <button className="icon-button" aria-label="더 보기"><MoreHorizontal size={18} /></button>
              </div>
            </div>
            <article className="editor">
              <input className="title-input" value={activeNote.title} onChange={(event) => updateNote(activeNote.id, { title: event.target.value })} placeholder="제목 없는 메모" />
              <div className="editor-meta">마지막 수정 {formatDate(activeNote.updatedAt)}</div>
              <textarea className="body-input" value={activeNote.body} onChange={(event) => updateNote(activeNote.id, { body: event.target.value })} placeholder="메모를 입력하세요..." />

              <section className="todo-section">
                <div className="todo-section-heading">
                  <div><ListTodo size={15} /><strong>체크리스트</strong></div>
                  <label className="toggle-control">
                    <input type="checkbox" checked={activeTab.todosEnabled} onChange={(event) => updateTab(activeTab.id, (tab) => ({ ...tab, todosEnabled: event.target.checked }))} />
                    <span className="toggle-track" />
                    <span>{activeTab.todosEnabled ? "켜짐" : "꺼짐"}</span>
                  </label>
                </div>
                {activeTab.todosEnabled && <>
                  <form className="todo-form" onSubmit={(event) => { event.preventDefault(); addTodo(); }}>
                    <input value={todoInput} onChange={(event) => setTodoInput(event.target.value)} placeholder="할 일을 입력하고 Enter" />
                    <button type="submit" disabled={!todoInput.trim()}><Plus size={15} /></button>
                  </form>
                  <div className="todo-items">
                    {activeNote.todos.map((todo) => (
                      <div className={`todo-item ${todo.completed ? "completed" : ""}`} key={todo.id}>
                        <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
                        <span>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} aria-label="할 일 삭제"><X size={13} /></button>
                      </div>
                    ))}
                    {activeNote.todos.length === 0 && <p className="todo-empty">아직 등록한 할 일이 없어요.</p>}
                  </div>
                  {activeNote.todos.length > 0 && <div className="todo-progress">{activeNote.todos.filter((todo) => todo.completed).length} / {activeNote.todos.length} 완료</div>}
                </>}
              </section>
            </article>
            <div className="editor-footer"><span>변경 사항은 이 기기에 자동 저장됩니다.</span><button className="icon-button" aria-label="보관"><Archive size={15} /></button></div>
          </> : <div className="editor-empty"><div className="empty-icon"><FileText size={24} /></div><h2>첫 메모를 만들어 보세요</h2><p>이 탭에 아직 메모가 없어요.</p><button className="primary-button" onClick={addNote}><Plus size={16} /> 새 메모</button></div>}
        </section>
      </div>
    </main>
  );
}