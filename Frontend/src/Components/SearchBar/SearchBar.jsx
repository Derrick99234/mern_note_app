import PropTypes from "prop-types";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";
const SearchBar = ({ value, onChange, handleSearch, onClearSearch }) => {
  return (
    <div className="w-full sm:w-96 flex items-center px-4 bg-slate-50 border border-slate-200 rounded-full transition-all focus-within:shadow-sm focus-within:border-primary/50 focus-within:bg-white">
      <input
        type="text"
        placeholder="Search Notes..."
        className="w-full text-sm bg-transparent py-3 outline-none text-slate-700 placeholder:text-slate-400"
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
      />
      {value && (
        <IoMdClose
          className="text-slate-400 cursor-pointer text-lg mr-3 hover:text-slate-600 transition-colors"
          onClick={onClearSearch}
        />
      )}
      <FaMagnifyingGlass
        onClick={handleSearch}
        className="text-slate-400 cursor-pointer hover:text-primary transition-colors"
      />
    </div>
  );
};

SearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  handleSearch: PropTypes.func,
  onClearSearch: PropTypes.func,
};

export default SearchBar;
