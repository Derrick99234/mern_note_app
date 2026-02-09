import React from 'react';
import { MdClose, MdOutlinePushPin, MdAccessTime, MdLabelOutline, MdFolderOpen } from 'react-icons/md';
import { formatNoteDate } from '../../Utils/helper';

const ReadNote = ({ noteData, onClose }) => {
  if (!noteData) return null;

  return (
    <div className="relative flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 border-b border-slate-100 pb-4 shrink-0">
        <div className="flex-1 pr-4">
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">
            {noteData.title}
          </h2>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              <MdAccessTime className="text-slate-400" />
              {formatNoteDate(noteData.createdOn)}
            </span>
            {noteData.category && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100 font-medium">
                <MdFolderOpen />
                {noteData.categoryName || 'Category'}
              </span>
            )}
            {noteData.isPinned && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20 font-medium">
                <MdOutlinePushPin />
                Pinned
              </span>
            )}
          </div>
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          onClick={onClose}
        >
          <MdClose className="text-xl" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Render HTML Content safely */}
        <div 
          className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: noteData.content }}
        />
        
        {/* Tags */}
        {noteData.tags && noteData.tags.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <MdLabelOutline className="text-lg" />
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {noteData.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-medium border border-slate-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadNote;
