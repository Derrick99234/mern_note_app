import { getInitails } from "../../Utils/helper";

/* eslint-disable react/prop-types */
const ProfileInfo = ({ onLogout, userData }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 flex items-center justify-center rounded-full text-slate-950 font-medium bg-slate-100">
        {getInitails("Olatunbosun Olashubomi")}
      </div>
      <div>
        <p className="text-sm font-medium">{userData?.fullname}</p>
        <button className="text-sm text-slate-700 underline" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileInfo;
