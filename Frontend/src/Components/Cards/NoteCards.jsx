import PropTypes from "prop-types";
import { MdOutlinePushPin, MdCreate, MdDelete, MdArrowOutward } from "react-icons/md";
import { formatNoteDate, stripHtml } from "../../Utils/helper";
function NoteCards({
  title,
  date,
  content,
  tags,
  category,
  isPinned,
  onEdit,
  onDelete,
  onPinNote,
  onRead,
}) {
  const preview = stripHtml(content);
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 flex flex-col h-full relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-3">
          <h6 className="text-sm font-semibold text-slate-900 truncate">{title}</h6>
          <span className="text-xs text-slate-400 block mt-0.5">{formatNoteDate(date)}</span>
        </div>

        <button 
          onClick={onPinNote}
          className={`p-1.5 rounded-full transition-colors z-10 ${
            isPinned 
              ? "text-primary bg-primary/10" 
              : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
          }`}
          title={isPinned ? "Unpin" : "Pin"}
        >
          <MdOutlinePushPin className="text-lg" />
        </button>
      </div>

      {category ? (
        <div className="mb-3">
          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {category}
          </span>
        </div>
      ) : null}

      <div 
        className="flex-1 mb-4 cursor-pointer group/content"
        onClick={onRead}
      >
        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed group-hover/content:text-slate-800 transition-colors">
          {preview || <span className="text-slate-400 italic">No content</span>}
        </p>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
          Read more <MdArrowOutward />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
        <div className="flex flex-wrap gap-1 max-w-[70%]">
          {tags.map((tag, i) => (
            <span key={i} className="text-[10px] text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="p-1.5 rounded-full text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            onClick={onEdit}
            title="Edit"
          >
            <MdCreate className="text-lg" />
          </button>
          <button 
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            onClick={onDelete}
            title="Delete"
          >
            <MdDelete className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}

NoteCards.propTypes = {
  title: PropTypes.string,
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  content: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  category: PropTypes.string,
  isPinned: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onPinNote: PropTypes.func,
  onRead: PropTypes.func,
};

export default NoteCards;
