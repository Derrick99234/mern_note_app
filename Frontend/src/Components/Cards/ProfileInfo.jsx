import { getInitails } from "../../Utils/helper";
import { MdLogout } from "react-icons/md";

/* eslint-disable react/prop-types */
const ProfileInfo = ({ onLogout, userData }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 flex items-center justify-center rounded-full text-slate-900 font-medium bg-slate-100 border border-slate-200">
        {getInitails(userData?.fullname)}
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-medium text-slate-700">{userData?.fullname}</p>
      </div>
      <button
        className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
        onClick={onLogout}
        title="Logout"
      >
        <MdLogout className="text-xl" />
      </button>
    </div>
  );
};

export default ProfileInfo;
