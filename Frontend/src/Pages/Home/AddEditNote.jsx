import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import TagInput from "../../Components/Inputs/TagInput";
import { MdClose, MdAutoAwesome, MdAutoFixHigh } from "react-icons/md";
import axiosInstance from "../../Utils/axiosInstance";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { stripHtml } from "../../Utils/helper";
import FullScreenLoader from "../../Components/Loading/FullScreenLoader";

const AddEditNote = ({
  onClose,
  type,
  getAllNotes,
  noteData,
  showToastMessage,
  categories = [],
  refreshCategories,
}) => {
  const [title, setTitle] = useState(noteData?.title || "");
  const [content, setContent] = useState(noteData?.content || "");
  const [tags, setTags] = useState(noteData?.tags || []);
  const [categoryId, setCategoryId] = useState(noteData?.categoryId || "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // AI State
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const defaultCategories = categories.filter((c) => c.scope === "global");
  const customCategories = categories.filter((c) => c.scope !== "global");

  const orderedCategories = useMemo(() => {
    const predefinedOrder = [
      "Meeting",
      "To-do",
      "Personal reflection",
      "Brain dump",
      "Idea",
    ];
    const orderIndexByName = new Map(
      predefinedOrder.map((n, idx) => [n.toLowerCase(), idx])
    );
    const all = [...defaultCategories, ...customCategories];
    return all.sort((a, b) => {
      const aName = String(a?.name || "");
      const bName = String(b?.name || "");
      const aIdx = orderIndexByName.get(aName.toLowerCase());
      const bIdx = orderIndexByName.get(bName.toLowerCase());

      const aHas = typeof aIdx === "number";
      const bHas = typeof bIdx === "number";
      if (aHas && bHas) return aIdx - bIdx;
      if (aHas) return -1;
      if (bHas) return 1;
      return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });
  }, [customCategories, defaultCategories]);

  const editorModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link"],
      ["clean"],
    ],
  };

  const editorFormats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "blockquote",
    "code-block",
    "link",
  ];

  const isEmptyContent = stripHtml(content).length === 0;

  useEffect(() => {
    if (type === "edit") return;
    if (categoryId) return;
    if (!categories || categories.length === 0) return;

    const idea = categories.find(
      (c) => String(c?.name || "").toLowerCase() === "idea"
    );
    if (idea?._id) setCategoryId(String(idea._id));
  }, [categories, categoryId, type]);

  // add new note
  async function addNewNote() {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post("/add_note", {
        title,
        content,
        tags,
        categoryId: categoryId || null,
      });
      if (response.data && response.data.note) {
        getAllNotes();
        onClose();
        showToastMessage("Note Added Successfully", "add");
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      const response = await axiosInstance.post("/categories", { name });
      const created = response.data?.category;
      if (created?._id) {
        setCategoryId(created._id);
        setNewCategoryName("");
        if (typeof refreshCategories === "function") {
          await refreshCategories();
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create category";
      setError(msg);
    }
  }

  // edit note
  async function editNote() {
    const noteID = noteData._id;
    setIsLoading(true);
    try {
      const response = await axiosInstance.put("/edit_note/" + noteID, {
        title,
        content,
        tags,
        categoryId: categoryId || null,
      });
      if (response.data && response.data.note) {
        getAllNotes();
        onClose();
        showToastMessage("Note Updated Successfully", "edit");
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddNote = () => { 
    if (!title) {
      setError("Please enter the title");
      return;
    }

    if (isEmptyContent) {
      setError("Please enter the content");
      return;
    }

    setError("");
    if (type === "edit") {
      editNote();
    } else {
      addNewNote();
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/ai/note_draft", {
        prompt: aiPrompt,
        currentContent: type === "edit" || !isEmptyContent ? content : undefined,
      });
      if (res.data && res.data.draft) {
        const {
          title: newTitle,
          content: newContent,
          tags: newTags,
          categoryId: newCatId,
          categoryName: newCatName,
        } = res.data.draft;

        if (newTitle) setTitle(newTitle);
        if (newContent) setContent(newContent);
        if (newTags && newTags.length > 0) setTags(newTags);

        // Handle category
        if (newCatId) {
           if (refreshCategories) await refreshCategories();
           setCategoryId(newCatId);
        } else if (newCatName) {
           // It might be a new category that backend created but didn't return ID for, 
           // or we need to find it by name after refresh
           if (refreshCategories) {
              await refreshCategories();
              // Note: We can't access the refreshed categories immediately here easily without prop update
              // But if the backend created it, it should be in the list next render.
              // For now, let's trust the backend returned ID if it matched/created.
           }
        }
        
        setShowAIPrompt(false);
        setAiPrompt("");
      }
    } catch (e) {
      setError(e.response?.data?.message || "AI generation failed");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full max-h-[80vh]">
      {isLoading && <FullScreenLoader message={type === 'edit' ? 'Updating Note...' : 'Saving Note...'} />}
      {isAiLoading && <FullScreenLoader message={type === 'edit' ? 'Refining Note with AI...' : 'Turn this into a smart note...'} />}
      
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-lg font-semibold text-slate-800">
          {type === "edit" ? "Edit Note" : "New Note"}
        </h3>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          onClick={onClose}
        >
          <MdClose className="text-xl" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 text-2xl font-bold text-slate-900 placeholder:text-slate-300 outline-none bg-transparent"
            placeholder="Note Title"
            value={title}
            onChange={({ target }) => setTitle(target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 relative">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white focus-within:border-primary/50 transition-colors">
            <ReactQuill
              theme="snow"
              className="quill"
              value={content}
              onChange={setContent}
              modules={editorModules}
              formats={editorFormats}
              placeholder="Start writing..."
            />
             {/* AI Button overlay in the editor area */}
             <button
              type="button"
              onClick={() => setShowAIPrompt(!showAIPrompt)}
              className="absolute bottom-4 right-4 z-10 p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              title="Generate/Refine with AI"
            >
              {type === 'edit' ? <MdAutoFixHigh className="text-xl" /> : <MdAutoAwesome className="text-xl" />}
              <span className="text-xs font-semibold pr-1">
                {type === 'edit' ? 'Refine' : 'Generate'}
              </span>
            </button>
          </div>

          {/* AI Prompt Popover */}
          {showAIPrompt && (
            <div className="absolute bottom-16 right-0 z-20 w-80 p-4 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  {type === 'edit' ? 'Refine Content' : 'Generate Content'}
                </div>
                <button 
                  onClick={() => setShowAIPrompt(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <MdClose />
                </button>
              </div>
              <textarea
                className="w-full text-sm p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500/50 outline-none resize-none h-24 mb-3"
                placeholder={type === 'edit' ? "How should I refine this note?" : "Describe what you want to write about..."}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim()}
              >
                {type === 'edit' ? 'Refine Note' : 'Generate Note'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">TAGS</label>
            <TagInput tags={tags} setTags={setTags} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">CATEGORY</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.length === 0 ? (
                <option value="" disabled>
                  Loading categories...
                </option>
              ) : null}
              {orderedCategories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
              <option value="">Uncategorized</option>
            </select>
            
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 placeholder:text-slate-400"
                placeholder="New category..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                type="button"
                className="text-xs font-medium px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                onClick={createCategory}
                disabled={!newCategoryName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
          <button
            className="btn-primary w-full sm:w-auto min-w-[120px] flex items-center justify-center gap-2"
            onClick={handleAddNote}
            disabled={isLoading}
          >
            {type === "edit" ? "Update Note" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditNote;

AddEditNote.propTypes = {
  onClose: PropTypes.func,
  type: PropTypes.string,
  getAllNotes: PropTypes.func,
  noteData: PropTypes.object,
  showToastMessage: PropTypes.func,
  categories: PropTypes.array,
  refreshCategories: PropTypes.func,
};
