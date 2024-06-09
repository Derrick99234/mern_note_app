/* eslint-disable react/prop-types */
import { useState } from "react";
import TagInput from "../../Components/Inputs/TagInput";
import { MdClose } from "react-icons/md";
import axiosInstance from "../../Utils/axiosInstance";

const AddEditNote = ({
  onClose,
  type,
  getAllNotes,
  noteData,
  showToastMessage,
}) => {
  const [title, setTitle] = useState(noteData?.title || "");
  const [content, setContent] = useState(noteData?.content || "");
  const [tags, setTags] = useState(noteData?.tags || []);
  const [error, setError] = useState(null);

  // add new note
  async function addNewNote() {
    try {
      const response = await axiosInstance.post("/add_note", {
        title,
        content,
        tags,
      });
      if (response.data && response.data.note) {
        getAllNotes();
        onClose();
        showToastMessage("Note Added Successfully", "add");
      }
    } catch (err) {
      if (err.response.data.message) {
        setError(err.response.data.message);
      }
    }
  }

  // edit note
  async function editNote() {
    const noteID = noteData._id;
    try {
      const response = await axiosInstance.put("/edit_note/" + noteID, {
        title,
        content,
        tags,
      });
      if (response.data && response.data.note) {
        getAllNotes();
        onClose();
        showToastMessage("Note Updated Successfully", "edit");
      }
      console.log(response);
    } catch (err) {
      if (err.response.data.message) {
        setError(err.response.data.message);
      }
    }
  }

  const handleAddNote = () => {
    if (!title) {
      setError("Please enter the title");
      return;
    }

    if (!content) {
      setError("Please enter the content");
    }

    if (type === "edit") {
      editNote();
    } else {
      addNewNote();
    }
    setError("");
  };

  return (
    <div className="relative">
      <button
        className="w-10 h-10 rounded-full flex items-center justify-center absolute -top-3 -right-3 hover:bg-slate-50"
        onClick={onClose}
      >
        <MdClose className="text-xl text-slate-400" />
      </button>
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="input-label">
          TITLE
        </label>
        <input
          type="text"
          className="text-2xl text-slate-950 outline-none"
          placeholder="Go to the Gym by 5"
          value={title}
          onChange={({ target }) => setTitle(target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <label htmlFor="content" className="input-label">
          CONTENT
        </label>
        <textarea
          type="text"
          className="text-xs text-slate-950 outline-none bg-slate-50 rounded-md"
          placeholder="Content"
          rows={10}
          value={content}
          onChange={({ target }) => setContent(target.value)}
        />
      </div>
      <div className="mt-3">
        <label htmlFor="tags" className="input-label">
          TAGS
        </label>
        <TagInput tags={tags} setTags={setTags} />
      </div>
      {error && <p className="text-red-500 text-xs pt-4">{error}</p>}
      <button
        className="btn-primary font-medium mt-3 p-3"
        onClick={handleAddNote}
      >
        {type === "edit" ? "UPDATE" : "ADD"}
      </button>
    </div>
  );
};

export default AddEditNote;
