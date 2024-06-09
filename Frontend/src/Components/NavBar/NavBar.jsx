/* eslint-disable react/prop-types */
import ProfileInfo from "../Cards/ProfileInfo";
import { useNavigate } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import { useState } from "react";

const NavBar = ({ onNoteSearch, userData, handleClearSearch }) => {
  const navigate = useNavigate();
  const onLogout = () => {
    navigate("/login");
    localStorage.clear();
  };

  const [searchQuery, setSearchQuery] = useState("");
  const handleSearch = () => {
    if (searchQuery) {
      onNoteSearch(searchQuery);
    }
  };

  const onClearSearch = () => {
    setSearchQuery("");
    handleClearSearch();
  };

  return (
    <div className="bg-white  flex items-center justify-between px-6 py-2 drop-shadow">
      <h2 className="text-xl font-medium text-black py-2">
        <span className="text-blue-400 font-[cursive] text-3xl font-semibold">
          Dev
        </span>
        Note
      </h2>
      {userData && (
        <>
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClearSearch={onClearSearch}
            handleSearch={handleSearch}
          />
          <ProfileInfo onLogout={onLogout} userData={userData} />
        </>
      )}
    </div>
  );
};

export default NavBar;
