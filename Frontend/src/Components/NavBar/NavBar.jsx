import PropTypes from "prop-types";
import ProfileInfo from "../Cards/ProfileInfo";
import { useNavigate } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import { useState } from "react";

const NavBar = ({ onNoteSearch, userData, handleClearSearch, isWritingMode }) => {
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
    <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-medium text-slate-800 shrink-0">
            <span className="text-primary font-[cursive] text-2xl font-bold">
              Dev
            </span>
            Note
          </h2>

          {/* App Switcher */}
          {userData && (
            <div className="hidden md:flex bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => navigate("/dashboard")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  !isWritingMode
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => navigate("/write")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  isWritingMode
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Writer
              </button>
            </div>
          )}
        </div>
        
        {userData && (
          <div className="flex flex-1 items-center justify-end gap-4 sm:gap-8">
            {!isWritingMode && (
              <div className="flex-1 max-w-xl hidden sm:block">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClearSearch={onClearSearch}
                  handleSearch={handleSearch}
                />
              </div>
            )}
            
            <div className="shrink-0">
              <ProfileInfo onLogout={onLogout} userData={userData} />
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Search Bar */}
      {userData && !isWritingMode && (
        <div className="sm:hidden px-4 pb-3 border-t border-slate-100 pt-3">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClearSearch={onClearSearch}
            handleSearch={handleSearch}
          />
        </div>
      )}
    </div>
  );
};

NavBar.propTypes = {
  onNoteSearch: PropTypes.func,
  userData: PropTypes.object,
  handleClearSearch: PropTypes.func,
  isWritingMode: PropTypes.bool,
};

export default NavBar;
