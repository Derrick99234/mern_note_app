import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../Components/NavBar/NavBar";
import axiosInstance from "../../Utils/axiosInstance";
import FullScreenLoader from "../../Components/Loading/FullScreenLoader";
import {
  MdAdd,
  MdFolder,
  MdFolderOpen,
  MdDescription,
  MdDelete,
  MdArrowBack,
  MdAutoAwesome,
  MdCheckCircle,
  MdRule,
  MdChat,
  MdHistory,
  MdDownload,
} from "react-icons/md";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const WritingAssistant = () => {
  const [userData, setUserData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const navigate = useNavigate();

  // New Project/Doc inputs
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [showNewDocInput, setShowNewDocInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState({});

  // Editor content
  const [editorContent, setEditorContent] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [activePanel, setActivePanel] = useState("bible");
  const [memory, setMemory] = useState(null);
  const [style, setStyle] = useState(null);

  const [bibleForm, setBibleForm] = useState({
    tone: "",
    rules: "",
    notes: "",
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [takes, setTakes] = useState([]);
  const [showTakes, setShowTakes] = useState(false);

  const activeDocId = activeDoc?._id || null;
  const activeDocIsFolder = activeDoc?.type === "folder";
  const activeDocBaseline = activeDoc?.content || "";

  const saveDoc = useCallback(
    async ({ reason, contentOverride } = {}) => {
      if (!activeDocId || activeDocIsFolder) return;
      const nextContent = contentOverride !== undefined ? contentOverride : editorContent;
      try {
        setSaveState("saving");
        await axiosInstance.put(`/docs/${activeDocId}`, {
          content: nextContent,
          saveReason: reason || "manual",
        });
        setDocs((prev) => prev.map((d) => (d._id === activeDocId ? { ...d, content: nextContent } : d)));
        setActiveDoc((prev) => (prev && prev._id === activeDocId ? { ...prev, content: nextContent } : prev));
        setSaveState("saved");
        setLastSavedAt(new Date());
      } catch (e) {
        console.log("Error saving doc", e);
        setSaveState("error");
      }
    },
    [activeDocId, activeDocIsFolder, editorContent]
  );

  useEffect(() => {
    getUser();
    getProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When active doc changes, sync editor content
  useEffect(() => {
    if (activeDoc) {
      setEditorContent(activeDoc.content || "");
    } else {
      setEditorContent("");
    }
  }, [activeDoc]);

  useEffect(() => {
    if (!activeDocId || activeDocIsFolder) {
      setSaveState("saved");
      setLastSavedAt(null);
      return;
    }
    setSaveState("saved");
    setLastSavedAt(null);
  }, [activeDocId, activeDocIsFolder]);

  useEffect(() => {
    if (!activeDocId || activeDocIsFolder) return;
    if (editorContent === activeDocBaseline) return;
    setSaveState("unsaved");
    const timer = setTimeout(() => {
      saveDoc({ reason: "autosave" });
    }, 1200);
    return () => clearTimeout(timer);
  }, [editorContent, activeDocId, activeDocIsFolder, activeDocBaseline, saveDoc]);

  const buildTree = useMemo(() => {
    const byParent = new Map();
    docs.forEach((d) => {
      const key = d.parentId || "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(d);
    });
    for (const [k, arr] of byParent.entries()) {
      arr.sort((a, b) => (a.order || 0) - (b.order || 0));
      byParent.set(k, arr);
    }

    const result = [];
    const walk = (parentId, depth) => {
      const key = parentId || "root";
      const children = byParent.get(key) || [];
      children.forEach((child) => {
        result.push({ doc: child, depth });
        if (child.type === "folder" && collapsedFolders[String(child._id)]) return;
        walk(child._id, depth + 1);
      });
    };
    walk(null, 0);
    return result;
  }, [docs, collapsedFolders]);

  const getUser = async () => {
    try {
      const res = await axiosInstance.get("/get_user");
      if (res.data && res.data.user) {
        setUserData(res.data.user);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  };

  const getProjects = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get("/projects");
      if (res.data && res.data.projects) {
        setProjects(res.data.projects);
      }
    } catch (error) {
      console.log("Error fetching projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectTitle.trim()) return;
    try {
      setIsLoading(true);
      const res = await axiosInstance.post("/projects", { title: newProjectTitle });
      if (res.data && res.data.project) {
        setProjects([res.data.project, ...projects]);
        setNewProjectTitle("");
        setShowNewProjectInput(false);
      }
    } catch (error) {
      console.log("Error creating project", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      setIsLoading(true);
      await axiosInstance.delete(`/projects/${projectId}`);
      setProjects(projects.filter((p) => p._id !== projectId));
      if (activeProject?._id === projectId) {
        setActiveProject(null);
        setDocs([]);
        setActiveDoc(null);
      }
    } catch (error) {
      console.log("Error deleting project", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openProject = async (project) => {
    setActiveProject(project);
    setActiveDoc(null);
    try {
      setIsLoading(true);
      const [docsRes, bibleRes, memRes, styleRes] = await Promise.all([
        axiosInstance.get(`/projects/${project._id}/docs`),
        axiosInstance.get(`/projects/${project._id}/bible`),
        axiosInstance.get(`/projects/${project._id}/memory`),
        axiosInstance.get(`/projects/${project._id}/style`),
      ]);
      if (docsRes.data && docsRes.data.docs) setDocs(docsRes.data.docs);
      if (bibleRes.data && bibleRes.data.bible) {
        setBibleForm({
          tone: bibleRes.data.bible.tone || "",
          rules: bibleRes.data.bible.rules || "",
          notes: bibleRes.data.bible.notes || "",
        });
      }
      if (memRes.data && memRes.data.memory) setMemory(memRes.data.memory);
      if (styleRes.data && styleRes.data.style) setStyle(styleRes.data.style);
    } catch (error) {
      console.log("Error fetching docs", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDoc = async ({ type }) => {
    if (!activeProject) return;
    const title = type === "folder" ? newFolderTitle : newDocTitle;
    if (!String(title || "").trim()) return;
    try {
      setIsLoading(true);
      const parentId = activeDoc?.type === "folder" ? activeDoc._id : null;
      const res = await axiosInstance.post(`/projects/${activeProject._id}/docs`, {
        title,
        parentId,
        type,
      });
      if (res.data && res.data.doc) {
        setDocs([...docs, res.data.doc]);
        if (type === "folder") {
          setNewFolderTitle("");
          setShowNewFolderInput(false);
          setActiveDoc(res.data.doc);
        } else {
          setNewDocTitle("");
          setShowNewDocInput(false);
          setActiveDoc(res.data.doc);
        }
      }
    } catch (error) {
      console.log("Error creating doc", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDoc = async (docId, e) => {
    e.stopPropagation();
    try {
      setIsLoading(true);
      await axiosInstance.delete(`/docs/${docId}`);
      setDocs(docs.filter((d) => d._id !== docId));
      if (activeDoc?._id === docId) {
        setActiveDoc(null);
      }
    } catch (error) {
      console.log("Error deleting doc", error);
    } finally {
      setIsLoading(false);
    }
  };

  const continueWithAI = async () => {
    if (!activeDoc || activeDoc.type === "folder" || !activeProject) return;
    setIsAiLoading(true);
    try {
      await axiosInstance.put(`/docs/${activeDoc._id}`, { content: editorContent, saveReason: "manual" });
      const res = await axiosInstance.post("/ai/writer/continue", {
        projectId: activeProject._id,
        docId: activeDoc._id,
        instruction: "Continue naturally",
        takes: 3,
      });
      const nextTakes = Array.isArray(res.data?.takes) ? res.data.takes : [];
      setTakes(nextTakes);
      setShowTakes(true);
      if (res.data?.memory) setMemory(res.data.memory);
    } catch (error) {
      console.log("AI generation failed", error);
      alert("AI generation failed. Please check your API key.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyTake = async (take) => {
    if (!take || !activeDoc || activeDoc.type === "folder") return;
    const appended = `${editorContent}${editorContent ? "<br/><br/>" : ""}${take.content_html || ""}`;
    setEditorContent(appended);
    setShowTakes(false);
    await axiosInstance.put(`/docs/${activeDoc._id}`, { content: appended, saveReason: "manual" });
    setDocs(docs.map((d) => (d._id === activeDoc._id ? { ...d, content: appended } : d)));
    setActiveDoc({ ...activeDoc, content: appended });
    setSaveState("saved");
    setLastSavedAt(new Date());
  };

  const saveBible = async () => {
    if (!activeProject) return;
    await axiosInstance.put(`/projects/${activeProject._id}/bible`, {
      tone: bibleForm.tone,
      rules: bibleForm.rules,
      notes: bibleForm.notes,
    });
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || !activeProject) return;
    const nextMessages = [...chatMessages, { role: "user", text: q }];
    setChatMessages(nextMessages);
    setChatInput("");
    setIsAiLoading(true);
    try {
      const res = await axiosInstance.post("/ai/writer/ask", {
        projectId: activeProject._id,
        question: q,
      });
      const answer = String(res.data?.answer_html || "");
      const citations = Array.isArray(res.data?.citations) ? res.data.citations : [];
      setChatMessages([...nextMessages, { role: "assistant", html: answer, citations }]);
    } catch {
      setChatMessages([...nextMessages, { role: "assistant", text: "AI request failed." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const learnStyle = async () => {
    if (!activeProject || !activeDoc || activeDoc.type === "folder") return;
    setIsAiLoading(true);
    try {
      await axiosInstance.put(`/docs/${activeDoc._id}`, { content: editorContent });
      const res = await axiosInstance.post("/ai/writer/style_profile", {
        projectId: activeProject._id,
        docId: activeDoc._id,
      });
      if (res.data?.style) setStyle(res.data.style);
    } finally {
      setIsAiLoading(false);
    }
  };

  const openHistory = async () => {
    if (!activeDoc || activeDoc.type === "folder") return;
    setHistoryOpen(true);
    setIsHistoryLoading(true);
    try {
      const res = await axiosInstance.get(`/docs/${activeDoc._id}/versions`);
      setVersions(Array.isArray(res.data?.versions) ? res.data.versions : []);
    } catch {
      setVersions([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const restoreVersion = async (versionId) => {
    if (!activeDoc || activeDoc.type === "folder") return;
    setIsHistoryLoading(true);
    try {
      const res = await axiosInstance.post(`/docs/${activeDoc._id}/restore/${versionId}`);
      const nextDoc = res.data?.doc;
      if (nextDoc) {
        setDocs(docs.map((d) => (d._id === nextDoc._id ? nextDoc : d)));
        setActiveDoc(nextDoc);
        setEditorContent(nextDoc.content || "");
        setSaveState("saved");
        setLastSavedAt(new Date());
      }
      await openHistory();
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const stripText = (html) =>
    String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportHtml = () => {
    if (!activeDoc || activeDoc.type === "folder") return;
    const safeTitle = String(activeDoc.title || "document").replace(/[^\w\- ]+/g, "").trim() || "document";
    downloadFile(`${safeTitle}.html`, editorContent || "", "text/html");
  };

  const exportText = () => {
    if (!activeDoc || activeDoc.type === "folder") return;
    const safeTitle = String(activeDoc.title || "document").replace(/[^\w\- ]+/g, "").trim() || "document";
    downloadFile(`${safeTitle}.txt`, stripText(editorContent), "text/plain");
  };

  return (
    <>
      <NavBar userData={userData} isWritingMode={true} />
      {isLoading && <FullScreenLoader message="Loading Writer..." />}
      {isAiLoading && <FullScreenLoader message="AI is writing..." />}

      <div className="flex h-[calc(100vh-80px)] bg-white">
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            {!activeProject ? (
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Projects</h3>
                <button
                  onClick={() => setShowNewProjectInput(true)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600"
                >
                  <MdAdd className="text-xl" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveProject(null)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600"
                >
                  <MdArrowBack />
                </button>
                <h3 className="font-semibold text-slate-700 truncate">{activeProject.title}</h3>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!activeProject ? (
              // Project List
              <div className="space-y-1">
                {showNewProjectInput && (
                  <div className="p-2 bg-white border rounded shadow-sm mb-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Project Name"
                      className="w-full text-sm outline-none mb-2"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createProject()}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowNewProjectInput(false)}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createProject}
                        className="text-xs text-primary font-medium"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}
                {projects.map((project) => (
                  <div
                    key={project._id}
                    onClick={() => openProject(project)}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MdFolder className="text-yellow-500 text-lg shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{project.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project._id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              // Doc List
              <div className="space-y-1">
                <div className="flex justify-between items-center px-2 py-1 mb-2">
                  <span className="text-xs font-medium text-slate-500">DOCUMENTS</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowNewFolderInput(true)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      title="New folder"
                    >
                      <MdFolder className="text-lg" />
                    </button>
                    <button
                      onClick={() => setShowNewDocInput(true)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      title="New document"
                    >
                      <MdAdd />
                    </button>
                  </div>
                </div>

                {showNewDocInput && (
                  <div className="p-2 bg-white border rounded shadow-sm mb-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Chapter/Scene Title"
                      className="w-full text-sm outline-none mb-2"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createDoc({ type: "document" })}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowNewDocInput(false)}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => createDoc({ type: "document" })}
                        className="text-xs text-primary font-medium"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {showNewFolderInput && (
                  <div className="p-2 bg-white border rounded shadow-sm mb-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Folder name"
                      className="w-full text-sm outline-none mb-2"
                      value={newFolderTitle}
                      onChange={(e) => setNewFolderTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createDoc({ type: "folder" })}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowNewFolderInput(false)}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => createDoc({ type: "folder" })}
                        className="text-xs text-primary font-medium"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {buildTree.map(({ doc, depth }) => (
                  <div
                    key={doc._id}
                    onClick={() => {
                      if (doc.type === "folder") {
                        setCollapsedFolders({
                          ...collapsedFolders,
                          [String(doc._id)]: !collapsedFolders[String(doc._id)],
                        });
                        setActiveDoc(doc);
                        return;
                      }
                      setActiveDoc(doc);
                    }}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                      activeDoc?._id === doc._id ? "bg-blue-50 text-primary" : "hover:bg-slate-100"
                    }`}
                    style={{ paddingLeft: 8 + depth * 12 }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {doc.type === "folder" ? (
                        collapsedFolders[String(doc._id)] ? (
                          <MdFolder className="text-yellow-500 text-lg shrink-0" />
                        ) : (
                          <MdFolderOpen className="text-yellow-600 text-lg shrink-0" />
                        )
                      ) : (
                        <MdDescription
                          className={`text-lg shrink-0 ${
                            activeDoc?._id === doc._id ? "text-primary" : "text-slate-400"
                          }`}
                        />
                      )}
                      <span className="text-sm truncate">{doc.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteDoc(doc._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex h-full overflow-hidden relative">
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {activeDoc && activeDoc.type !== "folder" ? (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white gap-4">
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setDocs(docs.map((d) => (d._id === activeDoc._id ? { ...d, title: newTitle } : d)));
                      setActiveDoc({ ...activeDoc, title: newTitle });
                    }}
                    onBlur={() => axiosInstance.put(`/docs/${activeDoc._id}`, { title: activeDoc.title })}
                    className="text-xl font-bold text-slate-800 outline-none w-full"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-slate-500 mr-2">
                      {saveState === "saving"
                        ? "Saving…"
                        : saveState === "unsaved"
                        ? "Unsaved"
                        : saveState === "error"
                        ? "Save failed"
                        : lastSavedAt
                        ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                        : "Saved"}
                    </div>
                    <button
                      onClick={() => saveDoc({ reason: "manual" })}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={openHistory}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                      type="button"
                    >
                      <MdHistory />
                      History
                    </button>
                    <button
                      onClick={exportHtml}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                      type="button"
                    >
                      <MdDownload />
                      Export HTML
                    </button>
                    <button
                      onClick={exportText}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                      type="button"
                    >
                      <MdDownload />
                      Export Text
                    </button>
                    <button
                      onClick={continueWithAI}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 rounded-lg flex items-center gap-2 shadow-sm"
                    >
                      <MdAutoAwesome />
                      Continue
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ReactQuill
                    theme="snow"
                    value={editorContent}
                    onChange={setEditorContent}
                    className="h-full border-none"
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["clean"],
                      ],
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MdDescription className="text-6xl mb-4 opacity-20" />
                <p>
                  {activeDoc && activeDoc.type === "folder"
                    ? "Folder selected. Create a document inside this folder."
                    : "Select or create a document to start writing"}
                </p>
              </div>
            )}
          </div>

          <div className="w-[380px] border-l border-slate-200 bg-white flex flex-col">
            <div className="p-3 border-b border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActivePanel("bible")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                  activePanel === "bible" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"
                }`}
              >
                <MdRule className="inline mr-1" />
                Bible
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("chat")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                  activePanel === "chat" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"
                }`}
              >
                <MdChat className="inline mr-1" />
                Ask
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("progress")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                  activePanel === "progress" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"
                }`}
              >
                <MdCheckCircle className="inline mr-1" />
                Progress
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!activeProject ? (
                <div className="text-sm text-slate-500">Open a project to access AI tools.</div>
              ) : activePanel === "bible" ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Tone</div>
                    <textarea
                      className="w-full border rounded-lg p-2 text-sm outline-none"
                      rows={2}
                      value={bibleForm.tone}
                      onChange={(e) => setBibleForm({ ...bibleForm, tone: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Rules</div>
                    <textarea
                      className="w-full border rounded-lg p-2 text-sm outline-none"
                      rows={3}
                      value={bibleForm.rules}
                      onChange={(e) => setBibleForm({ ...bibleForm, rules: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Notes</div>
                    <textarea
                      className="w-full border rounded-lg p-2 text-sm outline-none"
                      rows={3}
                      value={bibleForm.notes}
                      onChange={(e) => setBibleForm({ ...bibleForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="button" className="btn-primary w-full" onClick={saveBible}>
                    Save Bible
                  </button>
                </div>
              ) : activePanel === "chat" ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {chatMessages.map((m, idx) => (
                      <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                        <div
                          className={`inline-block max-w-[95%] rounded-xl px-3 py-2 text-sm ${
                            m.role === "user" ? "bg-primary text-white" : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {m.html ? (
                            <div dangerouslySetInnerHTML={{ __html: m.html }} />
                          ) : (
                            <span>{m.text}</span>
                          )}
                        </div>
                        {m.citations && m.citations.length ? (
                          <div className="text-[11px] text-slate-500 mt-1">
                            Sources: {m.citations.map((c) => c.title).filter(Boolean).slice(0, 4).join(", ")}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {chatMessages.length === 0 ? (
                      <div className="text-sm text-slate-500">Ask about your project, characters, plot, or past scenes.</div>
                    ) : null}
                  </div>
                  <div className="pt-3 border-t mt-3">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                        placeholder="Ask something..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      />
                      <button type="button" className="btn-primary px-4" onClick={sendChat}>
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              ) : activePanel === "progress" ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Style</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {style?.guidelines || memory?.styleGuidelines || "No style profile yet."}
                    </div>
                    <button type="button" className="btn-secondary w-full mt-2" onClick={learnStyle}>
                      Learn Style From Current Doc
                    </button>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Open threads</div>
                    {Array.isArray(memory?.openThreads) && memory.openThreads.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {memory.openThreads.slice(0, 12).map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">None tracked yet.</div>
                    )}
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Key facts</div>
                    {Array.isArray(memory?.keyFacts) && memory.keyFacts.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {memory.keyFacts.slice(0, 12).map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">None tracked yet.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Select Bible, Ask, or Progress.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTakes ? (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Choose a take</div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => setShowTakes(false)}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {takes.map((t, idx) => (
                <div key={idx} className="border rounded-xl p-3">
                  <div className="text-sm font-semibold text-slate-800">{t.title || `Take ${idx + 1}`}</div>
                  <div className="prose prose-sm max-w-none text-slate-700 mt-2" dangerouslySetInnerHTML={{ __html: t.content_html || "" }} />
                  <button type="button" className="btn-primary w-full mt-3" onClick={() => applyTake(t)}>
                    Insert this take
                  </button>
                </div>
              ))}
            </div>
            {takes.length === 0 ? <div className="text-sm text-slate-500">No takes returned.</div> : null}
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Version history</div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => setHistoryOpen(false)}
              >
                Close
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : versions.length ? (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v._id} className="border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">
                          {v.title || "Untitled"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(v.createdOn).toLocaleString()} • {v.saveReason || "manual"}
                        </div>
                      </div>
                      <button type="button" className="btn-primary px-4" onClick={() => restoreVersion(v._id)}>
                        Restore
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 mt-2">
                      {stripText(v.content).slice(0, 220)}
                      {stripText(v.content).length > 220 ? "…" : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No versions yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default WritingAssistant;
