import { useMemo, useState } from "react";
import {
  Archive, Check, ChevronDown, FileText, Menu, MoreHorizontal,
  Plus, Search, Settings2, Star, Trash2
} from "lucide-react";

type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

type NoteTab = {
  id: string;
  name: string;
  todosEnabled: boolean;
  notes: Note[];
};

const initialTabs: NoteTab[] = [
  {
    id: "inbox",
    name: "메모",
    todosEnabled: false,
    notes: [
      { id: "welcome", title: "Memo Tab에 오신 걸 환영해요", body: "복잡한 메모 창 대신, 탭 하나로 깔끔하게 정리해 보세요.\n\n왼쪽에서 메모를 선택하고 이곳에서 바로 편집할 수 있어요.\n\n• 탭별로 메모를 모아 보세요.\n• 자주 쓰는 메모는 별표로 표시해 보세요.\n• 투두 기능은 탭 설정에서 켜고 끌 수 있도록 준비하고 있어요.", updatedAt: "방금 전" },
      { id: "sample", title: "이번 주 할 일", body: "수업 자료 정리\n가정통신문 확인\n다음 주 준비물 체크", updatedAt: "어제" }
    ]
  },
  { id: "class", name: "학급 운영", todosEnabled: true, notes: [] },
  { id: "lesson", name: "수업 준비", todosEnabled: false, notes: [] },
  { id: "personal", name: "개인", todosEnabled: false, notes: [] }
];

export default function App() {
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState("inbox");
  const [activeNoteId, setActiveNoteId] = useState("welcome");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeNote = activeTab.notes.find((note) => note.id === activeNoteId) ?? activeTab.notes[0];

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeTab.notes;
    return activeTab.notes.filter((note) =>
      (note.title + " " + note.body).toLowerCase().includes(q)
    );
  }, [activeTab.notes, query]);

  function updateActiveNote(patch: Partial<Note>) {
    if (!activeNote) return;
    setTabs((current) => current.map((tab) =>
      tab.id !== activeTabId ? tab : {
        ...tab,
        notes: tab.notes.map((note) => note.id === activeNote.id
          ? { ...note, ...patch, updatedAt: "방금 전" }
          : note)
      }
    ));
  }

  function addNote() {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "새 메모",
      body: "",
      updatedAt: "방금 전"
    };
    setTabs((current) => current.map((tab) =>
      tab.id === activeTabId ? { ...tab, notes: [note, ...tab.notes] } : tab
    ));
    setActiveNoteId(note.id);
  }

  function addTab() {
    const name = window.prompt("새 탭 이름을 입력하세요.");
    if (!name?.trim()) return;
    const tab = { id: crypto.randomUUID(), name: name.trim(), todosEnabled: false, notes: [] as Note[] };
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
    setActiveNoteId("");
    setQuery("");
  }

  function selectTab(id: string) {
    setActiveTabId(id);
    const next = tabs.find((tab) => tab.id === id);
    setActiveNoteId(next?.notes[0]?.id ?? "");
    setQuery("");
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
            <button className="icon-button small" aria-label="설정"><Settings2 size={16} /></button>
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

          <div className="sidebar-bottom">
            <div className="storage-status"><span className="status-dot" /> 로컬 저장 준비 중</div>
            <div className="version-label">MEMO TAB · 0.1.0</div>
          </div>
        </aside>}

        <section className="note-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">WORKSPACE</div>
              <h1>{activeTab.name}</h1>
            </div>
            <button className="primary-button" onClick={addNote}><Plus size={16} /> 새 메모</button>
          </div>

          <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="메모 검색" /><kbd>⌘ K</kbd></div>

          <div className="note-list">
            {visibleNotes.map((note) => (
              <button key={note.id} className={`note-card ${activeNote?.id === note.id ? "selected" : ""}`} onClick={() => setActiveNoteId(note.id)}>
                <div className="note-card-top"><FileText size={14} /><span>{note.updatedAt}</span></div>
                <strong>{note.title || "제목 없는 메모"}</strong>
                <p>{note.body || "내용 없음"}</p>
              </button>
            ))}
            {visibleNotes.length === 0 && <div className="empty-list">{query ? "검색 결과가 없어요." : "아직 메모가 없어요."}</div>}
          </div>
          <div className="list-footer">{activeTab.notes.length}개의 메모</div>
        </section>

        <section className="editor-panel">
          {activeNote ? <>
            <div className="editor-toolbar">
              <div className="breadcrumb">{activeTab.name}<ChevronDown size={13} /><span>메모</span></div>
              <div className="toolbar-actions">
                <span className="saved-label"><Check size={13} /> 임시 편집</span>
                <button className="icon-button" aria-label="즐겨찾기"><Star size={16} /></button>
                <button className="icon-button" aria-label="더 보기"><MoreHorizontal size={18} /></button>
              </div>
            </div>
            <article className="editor">
              <input className="title-input" value={activeNote.title} onChange={(event) => updateActiveNote({ title: event.target.value })} placeholder="제목 없는 메모" />
              <div className="editor-meta">마지막 수정 {activeNote.updatedAt}</div>
              <textarea className="body-input" value={activeNote.body} onChange={(event) => updateActiveNote({ body: event.target.value })} placeholder="메모를 입력하세요..." />
              {activeTab.todosEnabled && <div className="todo-hint"><Check size={14} /> 이 탭은 투두리스트 기능이 켜져 있어요. 체크리스트 편집 기능은 다음 단계에서 연결할게요.</div>}
            </article>
            <div className="editor-footer"><span>모든 변경 사항은 저장 기능 연결 후 자동으로 저장돼요.</span><button className="icon-button" aria-label="보관"><Archive size={15} /></button></div>
          </> : <div className="editor-empty"><div className="empty-icon"><FileText size={24} /></div><h2>첫 메모를 만들어 보세요</h2><p>이 탭에 아직 메모가 없어요.</p><button className="primary-button" onClick={addNote}><Plus size={16} /> 새 메모</button></div>}
        </section>
      </div>
    </main>
  );
}