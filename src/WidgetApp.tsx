import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, FileText, Plus, X } from "lucide-react";
import { loadWebState, saveWebState } from "./services/webStorage";
import "./widget.css";

type Todo = { id: string; text: string; completed: boolean };
type Note = { id: string; title: string; body: string; updatedAt: string; todos: Todo[]; isFavorite?: boolean; deletedAt?: string };
type NoteTab = { id: string; name: string; todosEnabled: boolean; notes: Note[] };
type AppState = { tabs: NoteTab[] };

const initialState: AppState = { tabs: [{ id: "inbox", name: "메모", todosEnabled: true, notes: [] }] };
const makeId = () => crypto.randomUUID();

export default function WidgetApp() {
  const [state, setState] = useState<AppState>(initialState);
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    let alive = true;
    loadWebState<AppState>(initialState).then((value) => {
      if (!alive) return;
      const safe = value && Array.isArray(value.tabs) && value.tabs.length ? value : initialState;
      setState(safe);
      const first = safe.tabs.flatMap((tab) => tab.notes).find((note) => !note.deletedAt);
      setActiveId(first?.id ?? "");
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      saveWebState(state).then(() => setSaved(true)).catch(() => setSaved(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, loaded]);

  const notes = useMemo(() => state.tabs.flatMap((tab) => tab.notes
    .filter((note) => !note.deletedAt).map((note) => ({ note, tab })))
    .sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt)), [state]);
  const selected = notes.find(({ note }) => note.id === activeId) ?? notes[0];
  const updateNote = (tabId: string, noteId: string, patch: Partial<Note>) => {
    setState((current) => ({ tabs: current.tabs.map((tab) => tab.id !== tabId ? tab : ({
      ...tab, notes: tab.notes.map((note) => note.id === noteId ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note)
    })) }));
  };
  const createNote = () => {
    const note: Note = { id: makeId(), title: "", body: "", updatedAt: new Date().toISOString(), todos: [] };
    setState((current) => ({ tabs: current.tabs.map((item, index) => index === 0 ? { ...item, notes: [note, ...item.notes] } : item) }));
    setActiveId(note.id);
  };
  const addTodo = () => {
    if (!selected || !draft.trim()) return;
    updateNote(selected.tab.id, selected.note.id, { todos: [...selected.note.todos, { id: makeId(), text: draft.trim(), completed: false }] });
    setDraft("");
  };

  if (!loaded) return <main className="widget-shell"><div className="widget-loading">Memo Tab 불러오는 중...</div></main>;

  return <main className="widget-shell">
    <header className="widget-header">
      <div className="widget-brand"><span className="widget-logo"><FileText size={15}/></span><div><strong>Memo Tab</strong><small>{saved ? "저장됨" : "저장 중…"}</small></div></div>
      <div className="widget-header-actions">
        <a href="./index.html" title="전체 메모 열기" aria-label="전체 메모 열기"><ExternalLink size={15}/></a>
        <button onClick={createNote} title="새 메모" aria-label="새 메모"><Plus size={16}/></button>
      </div>
    </header>
    <section className="widget-content">
      <div className="widget-note-picker">
        {notes.slice(0, 8).map(({ note, tab }) => <button key={note.id} className={selected?.note.id === note.id ? "active" : ""} onClick={() => setActiveId(note.id)}>
          <span>{note.title || note.body.split("\n")[0] || "새 메모"}</span><small>{tab.name}</small>
        </button>)}
        {!notes.length && <p className="widget-empty">아직 메모가 없어요. + 버튼으로 시작해 보세요.</p>}
      </div>
      {selected && <article className="widget-editor">
        <input value={selected.note.title} onChange={(event) => updateNote(selected.tab.id, selected.note.id, { title: event.target.value })} placeholder="메모 제목"/>
        <textarea value={selected.note.body} onChange={(event) => updateNote(selected.tab.id, selected.note.id, { body: event.target.value })} placeholder="빠르게 메모하세요…"/>
        {selected.tab.todosEnabled && <div className="widget-todos">
          <div className="widget-todo-title">할 일 체크리스트</div>
          {selected.note.todos.map((todo) => <label key={todo.id} className={todo.completed ? "done" : ""}>
            <input type="checkbox" checked={todo.completed} onChange={() => updateNote(selected.tab.id, selected.note.id, { todos: selected.note.todos.map((item) => item.id === todo.id ? { ...item, completed: !item.completed } : item) })}/>
            <span>{todo.text}</span>
            <button onClick={() => updateNote(selected.tab.id, selected.note.id, { todos: selected.note.todos.filter((item) => item.id !== todo.id) })} aria-label="할 일 삭제"><X size={12}/></button>
          </label>)}
          <form onSubmit={(event) => { event.preventDefault(); addTodo(); }}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="할 일 추가…"/>
            <button type="submit" disabled={!draft.trim()}><Plus size={14}/></button>
          </form>
        </div>}
      </article>}
    </section>
    <footer className="widget-footer"><span>이 브라우저에 자동 저장됩니다.</span><a href="./index.html">전체 메모 관리 <Check size={12}/></a></footer>
  </main>;
}
