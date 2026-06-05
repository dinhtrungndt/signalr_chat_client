import React from 'react';
import { useQuery } from '@tanstack/react-query';
import useChatStore from '../../stores/chat.store';
import noteApi from '../../api/note.api';

const ChatNoteWidget = ({ noteId }) => {
  const activeConversation = useChatStore(state => state.activeConversation);

  const { data, isLoading } = useQuery({
    queryKey: ['notes', activeConversation?.id, activeConversation?.type],
    queryFn: () => noteApi.getNotes({ 
      groupId: activeConversation?.type === 'group' ? activeConversation.id : null, 
      partnerId: activeConversation?.type === 'direct' ? activeConversation.id : null 
    }),
    enabled: !!activeConversation?.id,
    staleTime: 60000,
  });

  const notes = data?.data?.data || [];
  const note = notes.find(n => n.id === parseInt(noteId));

  if (isLoading) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700/50 shadow-sm w-[280px] max-w-full">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-yellow-200 dark:bg-yellow-800/50 rounded w-3/4"></div>
            <div className="h-4 bg-yellow-200 dark:bg-yellow-800/50 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500 italic">
        Ghi chú không còn tồn tại hoặc đã bị xoá.
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700/50 shadow-sm overflow-hidden w-[300px] max-w-full my-1 relative">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400 dark:bg-yellow-600"></div>
      <div className="px-4 py-3 border-b border-yellow-200/50 dark:border-yellow-800/30 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm flex-1">Ghi chú</span>
      </div>

      <div className="p-4 pl-5">
        <p className="text-[14px] text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap leading-relaxed">
          {note.content}
        </p>
      </div>
    </div>
  );
};

export default ChatNoteWidget;
