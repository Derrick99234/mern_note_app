import { MdAdd } from "react-icons/md";
import NoteCards from "../../Components/Cards/NoteCards";
import NavBar from "../../Components/NavBar/NavBar";
import AddEditNote from "./AddEditNote";
import ChooseNoteType from "./ChooseNoteType";
import AudioNote from "./AudioNote";
import ReadNote from "./ReadNote";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../Utils/axiosInstance";
import Toast from "../../Components/ToastMessage/Toast";
import EmptyCard from "../../Components/EmptyCard/EmptyCard";
import nonote from "../../assets/nonote.svg";
import nodata from "../../assets/nodata.svg";

const Home = () => {
  const [openAddEditModal, setOpenAddEditModal] = useState({
    isShown: false,
    type: "add",
    data: null,
  });
  const [isChooseTypeOpen, setIsChooseTypeOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isReadNoteOpen, setIsReadNoteOpen] = useState({
    isShown: false,
    data: null,
  });

  const [showToastMsg, setShowToastMsg] = useState({
    isShown: false,
    type: "add",
    message: "",
  });

  const [isSearch, setIsSearch] = useState(false);

  const showToastMessage = useCallback((message, type) => {
    setShowToastMsg({ isShown: true, message, type });
  }, []);

  const handleToastClose = () => {
    setShowToastMsg({ isShown: false, message: "" });
  };


  const [userData, setUserData] = useState(null);
  const [allNotes, setAllNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [showMobileCategoryForm, setShowMobileCategoryForm] = useState(false);
  const [categoriesLoadError, setCategoriesLoadError] = useState("");
  const navigate = useNavigate();

  const getAllNotes = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/get_all_notes");
      if (res.data && res.data.notes) {
        setAllNotes(res.data.notes);
      }
    } catch (e) {
      console.log(
        "An Unexpected error while trying to get all notes, Please try again"
      );
    }
  }, []);

  const getCategories = useCallback(async () => {
    try {
      setCategoriesLoadError("");
      const res = await axiosInstance.get("/categories");
      if (res.data && res.data.categories) {
        setCategories(res.data.categories);
      }
    } catch (error) {
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }
      setCategoriesLoadError(
        "Could not load categories. Check your API base URL and backend."
      );
    }
  }, [navigate]);

  const createCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryError("");

    try {
      const res = await axiosInstance.post("/categories", { name });
      const created = res.data?.category;
      await getCategories();
      setNewCategoryName("");
      if (created?._id) setActiveCategoryId(String(created._id));
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create category";
      setCategoryError(msg);
    }
  }, [getCategories, newCategoryName]);

  const seedDemoNotes = useCallback(async () => {
    try {
      await axiosInstance.post("/dev/seed_notes");
      await getAllNotes();
      showToastMessage("Demo notes created", "add");
    } catch (e) {
      showToastMessage("Failed to create demo notes", "delete");
    }
  }, [getAllNotes, showToastMessage]);

  const handleEdit = (noteDetails) => {
    setOpenAddEditModal({ isShown: true, type: "edit", data: noteDetails });
  };

  const getUserInfo = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/get_user");
      if (response.data && response.data.user) {
        setUserData(response.data.user);
      }
    } catch (error) {
      if (error.response.status === 403 || error.response.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  }, [navigate]);

  const notesByCategoryId = allNotes.reduce((acc, note) => {
    const key = note?.categoryId ? String(note.categoryId) : "";
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  const categoryById = useMemo(() => {
    return categories.reduce((acc, c) => {
      acc[String(c._id)] = c;
      return acc;
    }, {});
  }, [categories]);

  const defaultCategories = useMemo(() => {
    return categories.filter((c) => c.scope === "global");
  }, [categories]);

  const customCategories = useMemo(() => {
    return categories.filter((c) => c.scope !== "global");
  }, [categories]);

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

  const knownCategoryIds = useMemo(() => {
    return new Set(categories.map((c) => String(c._id)));
  }, [categories]);

  const unknownCategoryNotes = useMemo(() => {
    return allNotes.filter(
      (n) => n?.categoryId && !knownCategoryIds.has(String(n.categoryId))
    );
  }, [allNotes, knownCategoryIds]);

  const visibleNotes = useMemo(() => {
    if (activeCategoryId === "all") return allNotes;
    if (activeCategoryId === "uncategorized") return notesByCategoryId[""] || [];
    return notesByCategoryId[String(activeCategoryId)] || [];
  }, [activeCategoryId, allNotes, notesByCategoryId]);

  const deleteNote = async (data) => {
    const noteID = data._id;
    try {
      const response = await axiosInstance.delete("/delete_note/" + noteID);
      if (response.data && !response.data.error) {
        getAllNotes();
        showToastMessage("Note Deleted Successfully", "delete");
      }
    } catch (err) {
      if (err.response.data.message) {
        console.log(
          "An Unexpected error while trying to get delete note, Please try again"
        );
      }
    }
  };

  const onNoteSearch = async (query) => {
    try {
      const response = await axiosInstance.get("/search_notes", {
        params: { query },
      });

      if (response.data && response.data.notes) {
        setIsSearch(true);
        setAllNotes(response.data.notes);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleClearSearch = () => {
    setIsSearch(false);
    getAllNotes();
  };

  const updateIsPinned = async (noteData) => {
    const noteID = noteData._id;
    try {
      const response = await axiosInstance.put(
        "/update_note_pinned/" + noteID,
        {
          isPinned: !noteData.isPinned,
        }
      );
      if (response.data && response.data.note) {
        getAllNotes();
        showToastMessage("Note Updated Successfully", "edit");
      }
      console.log(response);
    } catch (err) {
      if (err.response.data.message) {
        console.log(
          "An Unexpected error while trying to update pinned note, Please try again"
        );
      }
    }
  };

  useEffect(() => {
    getUserInfo();
    getCategories();
    getAllNotes();
  }, [getAllNotes, getCategories, getUserInfo]);

  const openTextNoteModal = useCallback(
    (noteData = null) => {
      setOpenAddEditModal({ isShown: true, data: noteData, type: "add" });
    },
    [setOpenAddEditModal]
  );

  return (
    <>
      <NavBar
        userData={userData}
        onNoteSearch={onNoteSearch}
        handleClearSearch={handleClearSearch}
      />
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-6">
          <div className="md:hidden">
            <div className="bg-white border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">
                  Categories
                </div>
                <button
                  type="button"
                  className="text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => setShowMobileCategoryForm((v) => !v)}
                >
                  {showMobileCategoryForm ? "Close" : "Add"}
                </button>
              </div>
              {categoriesLoadError ? (
                <p className="text-red-500 text-xs pt-2">
                  {categoriesLoadError}
                </p>
              ) : null}

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId("all")}
                  className={`shrink-0 px-3 py-2 rounded-full text-sm border transition ${
                    activeCategoryId === "all"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  All
                </button>
                  {orderedCategories.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setActiveCategoryId(String(c._id))}
                    className={`shrink-0 px-3 py-2 rounded-full text-sm border transition ${
                      activeCategoryId === String(c._id)
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveCategoryId("uncategorized")}
                  className={`shrink-0 px-3 py-2 rounded-full text-sm border transition ${
                    activeCategoryId === "uncategorized"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  Uncategorized
                </button>
              </div>

              {showMobileCategoryForm ? (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none"
                      placeholder="e.g. Project X"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary px-4"
                      onClick={createCategory}
                      disabled={!newCategoryName.trim()}
                    >
                      Add
                    </button>
                  </div>
                  {categoryError ? (
                    <p className="text-red-500 text-xs pt-2">{categoryError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <aside className="hidden md:block md:col-span-4 lg:col-span-3">
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Categories
                  </h3>
                  <span className="text-xs text-slate-400">
                    {allNotes.length}
                  </span>
                </div>
                {categoriesLoadError ? (
                  <p className="text-red-500 text-xs pt-2">
                    {categoriesLoadError}
                  </p>
                ) : null}

                <div className="mt-3 space-y-1">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      activeCategoryId === "all"
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => setActiveCategoryId("all")}
                    type="button"
                  >
                    All Notes
                  </button>
                </div>

                {orderedCategories.length > 0 ? (
                  <div className="mt-4">
                    <div className="space-y-1">
                      {orderedCategories.map((c) => (
                        <button
                          key={c._id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${
                            activeCategoryId === String(c._id)
                              ? "bg-slate-900 text-white"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                          onClick={() => setActiveCategoryId(String(c._id))}
                          type="button"
                        >
                          <span className="truncate">{c.name}</span>
                          <span
                            className={`text-xs ${
                              activeCategoryId === String(c._id)
                                ? "text-white/70"
                                : "text-slate-400"
                            }`}
                          >
                            {(notesByCategoryId[String(c._id)] || []).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      activeCategoryId === "uncategorized"
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => setActiveCategoryId("uncategorized")}
                    type="button"
                  >
                    Uncategorized
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs font-semibold text-slate-400 px-1 mb-2">
                    Add Category
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none"
                      placeholder="e.g. Project X"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary px-4"
                      onClick={createCategory}
                      disabled={!newCategoryName.trim()}
                    >
                      Add
                    </button>
                  </div>
                  {categoryError ? (
                    <p className="text-red-500 text-xs pt-2">{categoryError}</p>
                  ) : null}
                </div>

                {import.meta.env.DEV ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
                      onClick={seedDemoNotes}
                    >
                      Seed demo notes
                    </button>
                  </div>
                ) : null}
              </div>
            </aside>

            <main className="col-span-12 md:col-span-8 lg:col-span-9">
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {isSearch
                        ? "Search Results"
                        : activeCategoryId === "all"
                        ? "All Notes"
                        : activeCategoryId === "uncategorized"
                        ? "Uncategorized"
                        : categoryById[String(activeCategoryId)]?.name ||
                          "Category"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {visibleNotes.length} note{visibleNotes.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {activeCategoryId !== "all" ? (
                    <button
                      type="button"
                      className="text-sm text-slate-500 hover:text-slate-900"
                      onClick={() => setActiveCategoryId("all")}
                    >
                      View all
                    </button>
                  ) : null}
                </div>

                {allNotes.length === 0 ? (
                  <div className="py-10">
                    <EmptyCard
                      imgSrc={isSearch ? nodata : nonote}
                      message={
                        isSearch
                          ? "Oops! No notes found matching your search."
                          : "Start by creating your first note."
                      }
                    />
                  </div>
                ) : activeCategoryId === "all" && categories.length > 0 ? (
                  <div className="mt-6 space-y-8">
                    {orderedCategories.map((c) => {
                      const notes = notesByCategoryId[String(c._id)] || [];
                      if (notes.length === 0) return null;
                      return (
                        <div key={c._id}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">
                              {c.name}
                            </h3>
                            <span className="text-xs text-slate-400">
                              {notes.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {notes.map((items, index) => (
                              <NoteCards
                                key={`${items._id || index}`}
                                title={items.title}
                                date={items.createdOn}
                                content={items.content}
                                tags={items.tags}
                                category={c.name}
                                onPinNote={() => updateIsPinned(items)}
                            isPinned={items.isPinned}
                            onEdit={() => handleEdit(items)}
                            onDelete={() => deleteNote(items)}
                            onRead={() => setIsReadNoteOpen({ isShown: true, data: { ...items, categoryName: c.name } })}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {unknownCategoryNotes.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Other
                      </h3>
                      <span className="text-xs text-slate-400">
                        {unknownCategoryNotes.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {unknownCategoryNotes.map((items, index) => (
                        <NoteCards
                          key={`${items._id || index}`}
                          title={items.title}
                          date={items.createdOn}
                          content={items.content}
                          tags={items.tags}
                          category={null}
                          onPinNote={() => updateIsPinned(items)}
                          isPinned={items.isPinned}
                          onEdit={() => handleEdit(items)}
                          onDelete={() => deleteNote(items)}
                          onRead={() => setIsReadNoteOpen({ isShown: true, data: items })}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {(notesByCategoryId[""] || []).length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Uncategorized
                      </h3>
                      <span className="text-xs text-slate-400">
                        {notesByCategoryId[""].length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {notesByCategoryId[""].map((items, index) => (
                        <NoteCards
                          key={`${items._id || index}`}
                          title={items.title}
                          date={items.createdOn}
                          content={items.content}
                          tags={items.tags}
                          category={null}
                          onPinNote={() => updateIsPinned(items)}
                          isPinned={items.isPinned}
                          onEdit={() => handleEdit(items)}
                          onDelete={() => deleteNote(items)}
                          onRead={() => setIsReadNoteOpen({ isShown: true, data: items })}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-6">
                {visibleNotes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {visibleNotes.map((items, index) => (
                      <NoteCards
                        key={`${items._id || index}`}
                        title={items.title}
                        date={items.createdOn}
                        content={items.content}
                        tags={items.tags}
                        category={
                          items.categoryId
                            ? categoryById[String(items.categoryId)]?.name ||
                              null
                            : null
                        }
                        onPinNote={() => updateIsPinned(items)}
                        isPinned={items.isPinned}
                        onEdit={() => handleEdit(items)}
                        onDelete={() => deleteNote(items)}
                        onRead={() => setIsReadNoteOpen({ isShown: true, data: { ...items, categoryName: items.categoryId ? categoryById[String(items.categoryId)]?.name : null } })}
                      />
                    ))}
                  </div>
                ) : (
                      <div className="py-10">
                        <EmptyCard
                          imgSrc={nodata}
                          message="No notes in this category yet."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      <button
        className="w-16 h-16 flex justify-center items-center bg-primary rounded-2xl hover:bg-blue-500 fixed right-6 bottom-6 shadow-lg"
        onClick={() => {
          setIsChooseTypeOpen(true);
        }}
      >
        <MdAdd className="text-[32px] text-white" />
      </button>

      <Modal
        isOpen={isChooseTypeOpen}
        onRequestClose={() => setIsChooseTypeOpen(false)}
        style={{
          overlay: {
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            zIndex: 9998,
          },
        }}
        contentLabel=""
        className="w-[95%] sm:w-[90%] md:w-[70%] lg:w-[50%] max-h-[80vh] rounded-2xl p-6 bg-white mt-14 mx-auto overflow-hidden shadow-2xl border border-slate-200/70 outline-none"
      >
        <ChooseNoteType
          onClose={() => setIsChooseTypeOpen(false)}
          onSelect={(type) => {
            setIsChooseTypeOpen(false);
            if (type === "text") {
              openTextNoteModal(null);
              return;
            }
            setIsAudioOpen(true);
          }}
        />
      </Modal>

      <Modal
        isOpen={isAudioOpen}
        onRequestClose={() => setIsAudioOpen(false)}
        style={{
          overlay: {
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            zIndex: 9998,
          },
        }}
        contentLabel=""
        className="w-[95%] sm:w-[90%] md:w-[70%] lg:w-[50%] max-h-[80vh] rounded-2xl p-6 bg-white mt-14 mx-auto overflow-scroll shadow-2xl border border-slate-200/70 outline-none"
      >
        <AudioNote
          onClose={() => setIsAudioOpen(false)}
          onUseDraft={(draft) => {
            setIsAudioOpen(false);
            setOpenAddEditModal({ isShown: true, data: draft, type: "add" });
          }}
        />
      </Modal>
      <Modal
        isOpen={openAddEditModal.isShown}
        onRequestClose={() =>
          setOpenAddEditModal({ isShown: false, type: "add", data: null })
        }
        style={{
          overlay: {
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            zIndex: 9998,
          },
        }}
        contentLabel=""
        className="w-[95%] sm:w-[90%] md:w-[70%] lg:w-[50%] max-h-[80vh] rounded-2xl p-6 bg-white mt-14 mx-auto shadow-2xl border border-slate-200/70 outline-none overflow-scroll"
      >
        <AddEditNote
          type={openAddEditModal.type}
          noteData={openAddEditModal.data}
          getAllNotes={getAllNotes}
          showToastMessage={showToastMessage}
          categories={categories}
          refreshCategories={getCategories}
          onClose={() => {
            setOpenAddEditModal({ isShown: false, type: "add", data: null });
          }}
        />
      </Modal>

      <Modal
        isOpen={isReadNoteOpen.isShown}
        onRequestClose={() => setIsReadNoteOpen({ isShown: false, data: null })}
        style={{
          overlay: {
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            zIndex: 9998,
          },
        }}
        contentLabel=""
        className="w-[95%] sm:w-[90%] md:w-[70%] lg:w-[50%] max-h-[80vh] rounded-2xl p-6 bg-white mt-14 mx-auto overflow-scroll shadow-2xl border border-slate-200/70 outline-none"
      >
        <ReadNote
          noteData={isReadNoteOpen.data}
          onClose={() => setIsReadNoteOpen({ isShown: false, data: null })}
        />
      </Modal>

      <Toast
        isShown={showToastMsg.isShown}
        handleToastClose={handleToastClose}
        type={showToastMsg.type}
        message={showToastMsg.message}
      />
    </>
  );
};

export default Home;
