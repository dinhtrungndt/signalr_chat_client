import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useChatStore from '../../stores/chat.store';
import useAuthStore from '../../stores/auth.store';
import reminderApi from '../../api/reminder.api';
import { format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';

const ChatReminderWidget = ({ reminderId }) => {
  const queryClient = useQueryClient();
  const activeConversation = useChatStore(state => state.activeConversation);

  const { data, isLoading } = useQuery({
    queryKey: ['reminders', activeConversation?.id, activeConversation?.type],
    queryFn: () => reminderApi.getReminders({ 
      groupId: activeConversation?.type === 'group' ? activeConversation.id : null, 
      partnerId: activeConversation?.type === 'direct' ? activeConversation.id : null 
    }),
    enabled: !!activeConversation?.id,
    staleTime: 60000,
  });

  const reminders = data?.data?.data || [];
  const reminder = reminders.find(r => r.id === parseInt(reminderId));

  if (isLoading) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-700/50 shadow-sm w-[280px] max-w-full">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-orange-200 dark:bg-orange-800/50 rounded w-3/4"></div>
            <div className="h-4 bg-orange-200 dark:bg-orange-800/50 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500 italic">
        Nhắc hẹn không còn tồn tại hoặc đã bị xoá.
      </div>
    );
  }

  const dueDate = new Date(reminder.dueDate);
  const isOverdue = isPast(dueDate) && !reminder.isDone;

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden w-[300px] max-w-full my-1 relative transition-colors ${reminder.isDone ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : (isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50')}`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${reminder.isDone ? 'bg-slate-400' : (isOverdue ? 'bg-red-500' : 'bg-orange-400 dark:bg-orange-600')}`}></div>
      
      <div className={`px-4 py-3 border-b flex items-center gap-2 ${reminder.isDone ? 'border-slate-200 dark:border-slate-700' : (isOverdue ? 'border-red-200 dark:border-red-800/30' : 'border-orange-200/50 dark:border-orange-800/30')}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${reminder.isDone ? 'text-slate-400' : (isOverdue ? 'text-red-500' : 'text-orange-500')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`font-semibold text-sm flex-1 ${reminder.isDone ? 'text-slate-600 dark:text-slate-400' : (isOverdue ? 'text-red-700 dark:text-red-400' : 'text-orange-800 dark:text-orange-400')}`}>
          Nhắc hẹn {isOverdue && !reminder.isDone && <span className="ml-1 text-xs text-red-500 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded uppercase">Quá hạn</span>}
        </span>
      </div>

      <div className="p-4 pl-5">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center mt-0.5">
            <input 
              type="checkbox"
              checked={reminder.isDone}
              onChange={(e) => {
                reminderApi.updateStatus(reminder.id, e.target.checked).then(() => {
                  queryClient.invalidateQueries(['reminders']);
                });
              }}
              className="peer sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${reminder.isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-500'}`}>
              <svg className={`w-3 h-3 text-white transition-opacity ${reminder.isDone ? 'opacity-100' : 'opacity-0'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <div className="flex-1">
            <p className={`text-[14px] font-medium leading-tight mb-1 transition-colors ${reminder.isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
              {reminder.content}
            </p>
            <p className={`text-[12px] flex items-center gap-1 ${reminder.isDone ? 'text-slate-400 dark:text-slate-500' : (isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400')}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {format(dueDate, "HH:mm, dd/MM/yyyy")}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ChatReminderWidget;
