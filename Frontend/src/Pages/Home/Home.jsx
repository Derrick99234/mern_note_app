import { MdAdd } from "react-icons/md";
import NoteCards from "../../Components/Cards/NoteCards";
import NavBar from "../../Components/NavBar/NavBar";
import AddEditNote from "./AddEditNote";
import { useEffect, useState } from "react";
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

  const [showToastMsg, setShowToastMsg] = useState({
    isShown: false,
    type: "add",
    message: "",
  });

  const [isSearch, setIsSearch] = useState(false);

  const showToastMessage = (message, type) => {
    setShowToastMsg({ isShown: true, message, type });
  };

  const handleToastClose = () => {
    setShowToastMsg({ isShown: false, message: "" });
  };

  const [userData, setUserData] = useState(null);
  const [allNotes, setAllNotes] = useState([]);
  const navigate = useNavigate();

  const getAllNotes = async () => {
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
  };

  const handleEdit = (noteDetails) => {
    setOpenAddEditModal({ isShown: true, type: "edit", data: noteDetails });
  };

  const getUserInfo = async () => {
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
  };

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
    getAllNotes();
    return () => {};
  }, []);

  return (
    <>
      <NavBar
        userData={userData}
        onNoteSearch={onNoteSearch}
        handleClearSearch={handleClearSearch}
      />
      <div className="container mx-auto">
        {allNotes.length > 0 ? (
          <div className="grid grid-cols-3 gap-5 mt-8">
            {allNotes.map((items, index) => (
              <NoteCards
                key={index}
                title={items.title}
                date={items.createdOn}
                content={items.content}
                tags={items.tags}
                onPinNote={() => updateIsPinned(items)}
                isPinned={items.isPinned}
                onEdit={() => handleEdit(items)}
                onDelete={() => deleteNote(items)}
              />
            ))}
          </div>
        ) : (
          <EmptyCard
            imgSrc={isSearch ? nodata : nonote}
            message={
              isSearch
                ? "Oops! No notea found matching your search."
                : `Start by creating your first note! click the 'Add' button to jot down your 'thoughts, ideas and reminders. Let's get started!.`
            }
          />
        )}
      </div>

      <button
        className="w-16 h-16 flex justify-center items-center bg-primary rounded-2xl hover:bg-blue-500 absolute right-10 bottom-10"
        onClick={() => {
          setOpenAddEditModal({ isShown: true, data: null, type: "add" });
        }}
      >
        <MdAdd className="text-[32px] text-white" />
      </button>
      <Modal
        isOpen={openAddEditModal.isShown}
        onRequestClose={() => {}}
        style={{
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          },
        }}
        contentLabel=""
        className="w-[40%] max-h-3/4 rounded-md p-5 bg-white mt-14 mx-auto overflow-scroll"
      >
        <AddEditNote
          type={openAddEditModal.type}
          noteData={openAddEditModal.data}
          getAllNotes={getAllNotes}
          showToastMessage={showToastMessage}
          onClose={() => {
            setOpenAddEditModal({ isShown: false, type: "add", data: null });
          }}
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
