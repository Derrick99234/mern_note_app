import Loading from "./Loading";
import PropTypes from "prop-types";

const FullScreenLoader = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-all">
      <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 min-w-[200px] animate-in fade-in zoom-in duration-200">
        <div className="relative">
          <Loading size="lg" className="text-primary" />
        </div>
        <p className="text-slate-600 font-medium text-sm animate-pulse">{message}</p>
      </div>
    </div>
  );
};

FullScreenLoader.propTypes = {
  message: PropTypes.string,
};

export default FullScreenLoader;
