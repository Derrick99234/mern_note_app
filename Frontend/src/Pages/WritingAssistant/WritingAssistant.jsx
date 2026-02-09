import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../Components/NavBar/NavBar";
import axiosInstance from "../../Utils/axiosInstance";
import FullScreenLoader from "../../Components/Loading/FullScreenLoader";
import { MdAdd, MdFolder, MdDescription, MdDelete, MdArrowBack, MdAutoAwesome } from "react-icons/md";
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
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [showNewDocInput, setShowNewDocInput] = useState(false);

  // Editor content
  const [editorContent, setEditorContent] = useState("");

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
      const res = await axiosInstance.get(`/projects/${project._id}/docs`);
      if (res.data && res.data.docs) {
        setDocs(res.data.docs);
      }
    } catch (error) {
      console.log("Error fetching docs", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDoc = async () => {
    if (!newDocTitle.trim() || !activeProject) return;
    try {
      setIsLoading(true);
      const res = await axiosInstance.post(`/projects/${activeProject._id}/docs`, {
        title: newDocTitle,
      });
      if (res.data && res.data.doc) {
        setDocs([...docs, res.data.doc]);
        setNewDocTitle("");
        setShowNewDocInput(false);
        setActiveDoc(res.data.doc);
      }
    } catch (error) {
      console.log("Error creating doc", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDoc = async () => {
    if (!activeDoc) return;
    try {
      // Don't set global loading, just silent save or small indicator
      await axiosInstance.put(`/docs/${activeDoc._id}`, {
        content: editorContent,
      });
      // Update local state
      setDocs(docs.map((d) => (d._id === activeDoc._id ? { ...d, content: editorContent } : d)));
    } catch (error) {
      console.log("Error saving doc", error);
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
    if (!activeDoc) return;
    setIsAiLoading(true);
    try {
      // Get previous doc context if available (simple approach: prev doc in list)
      const currentIndex = docs.findIndex((d) => d._id === activeDoc._id);
      let previousContext = "";
      if (currentIndex > 0) {
        previousContext = docs[currentIndex - 1].content || "";
      }

      const res = await axiosInstance.post("/ai/continue_story", {
        projectContext: activeProject.description || `Title: ${activeProject.title}. Type: ${activeProject.type}`,
        previousContext,
        currentContent: editorContent,
        instruction: "Continue naturally",
      });

      if (res.data && res.data.continuation) {
        const newContent = editorContent + "<br/>" + res.data.continuation;
        setEditorContent(newContent);
        // Auto-save
        await axiosInstance.put(`/docs/${activeDoc._id}`, {
          content: newContent,
        });
      }
    } catch (error) {
      console.log("AI generation failed", error);
      alert("AI generation failed. Please check your API key.");
    } finally {
      setIsAiLoading(false);
    }
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
                  <button
                    onClick={() => setShowNewDocInput(true)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  >
                    <MdAdd />
                  </button>
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
                      onKeyDown={(e) => e.key === "Enter" && createDoc()}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowNewDocInput(false)}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                      <button onClick={createDoc} className="text-xs text-primary font-medium">
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {docs.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setActiveDoc(doc)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer group ${
                      activeDoc?._id === doc._id ? "bg-blue-50 text-primary" : "hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MdDescription
                        className={`text-lg shrink-0 ${
                          activeDoc?._id === doc._id ? "text-primary" : "text-slate-400"
                        }`}
                      />
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
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {activeDoc ? (
            <>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <input
                  type="text"
                  value={activeDoc.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setDocs(docs.map(d => d._id === activeDoc._id ? { ...d, title: newTitle } : d));
                    setActiveDoc({ ...activeDoc, title: newTitle });
                  }}
                  onBlur={() => axiosInstance.put(`/docs/${activeDoc._id}`, { title: activeDoc.title })}
                  className="text-xl font-bold text-slate-800 outline-none w-full"
                />
                <div className="flex gap-2">
                   <button
                    onClick={saveDoc}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                   >
                     Save
                   </button>
                   <button
                    onClick={continueWithAI}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 rounded-lg flex items-center gap-2 shadow-sm"
                   >
                     <MdAutoAwesome />
                     Continue Writing
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
              <p>Select or create a document to start writing</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WritingAssistant;
