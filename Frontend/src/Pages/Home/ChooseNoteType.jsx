import { MdClose, MdMic, MdTextFields } from "react-icons/md";
/* eslint-disable react/prop-types */
function ChooseNoteType({ onClose, onSelect }) {
  return (
    <div className="relative">
      <button
        className="w-10 h-10 rounded-full flex items-center justify-center absolute -top-3 -right-3 hover:bg-slate-50"
        onClick={onClose}
        type="button"
      >
        <MdClose className="text-xl text-slate-400" />
      </button>

      <h3 className="text-lg font-semibold text-slate-900">Create Note</h3>
      <p className="text-sm text-slate-500 mt-1">
        Choose how you want to create your note
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        <button
          type="button"
          className="border rounded-xl p-4 text-left hover:shadow-sm transition"
          onClick={() => onSelect("text")}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <MdTextFields className="text-xl text-slate-700" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-900">Text</div>
            <div className="text-xs text-slate-500 mt-1">
              Type and format your note
            </div>
          </div>
        </button>

        <button
          type="button"
          className="border rounded-xl p-4 text-left hover:shadow-sm transition"
          onClick={() => onSelect("audio")}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <MdMic className="text-xl text-slate-700" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-900">Audio</div>
            <div className="text-xs text-slate-500 mt-1">
              Record and get live transcription
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default ChooseNoteType;
