import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useChatStore from '../../stores/chat.store';
import useAuthStore from '../../stores/auth.store';
import pollApi from '../../api/poll.api';

const ChatPollWidget = ({ pollId }) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const activeConversation = useChatStore(state => state.activeConversation);

  // Lấy dữ liệu polls từ cache hoặc fetch mới
  const { data, isLoading } = useQuery({
    queryKey: ['polls', activeConversation?.id, activeConversation?.type],
    queryFn: () => pollApi.getPolls(activeConversation?.id),
    enabled: activeConversation?.type === 'group' && !!activeConversation?.id,
    staleTime: 60000,
  });

  const polls = data?.data?.data || [];
  const poll = polls.find(p => p.id === parseInt(pollId));

  // Lắng nghe sự kiện realtime từ socket
  React.useEffect(() => {
    const handlePollUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    };

    window.addEventListener('poll_updated', handlePollUpdate);
    return () => {
      window.removeEventListener('poll_updated', handlePollUpdate);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-[280px] max-w-full">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 rounded"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500 italic">
        Bình chọn không còn tồn tại hoặc đã bị xoá.
      </div>
    );
  }

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden w-[300px] max-w-full my-1">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800/50 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="font-semibold text-slate-800 dark:text-white text-sm flex-1">Bình chọn</span>
        {poll.isClosed && (
          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Đã chốt</span>
        )}
      </div>

      <div className="p-4">
        <p className="text-[15px] font-medium text-slate-900 dark:text-white mb-3">
          {poll.question}
        </p>

        <div className="space-y-2">
          {poll.options.map(opt => {
            const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
            const isVotedByMe = opt.votes.some(v => v.userId === currentUser?.id);
            
            return (
              <div key={opt.id} 
                className={`relative flex items-center justify-between p-2 rounded border cursor-pointer overflow-hidden group transition-colors ${isVotedByMe ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                onClick={() => {
                  if (poll.isClosed) return;
                  // Toggle vote logic
                  const currentVotedIds = poll.options.filter(o => o.votes.some(v => v.userId === currentUser?.id)).map(o => o.id);
                  let newVotes = [...currentVotedIds];
                  if (isVotedByMe) {
                    newVotes = newVotes.filter(id => id !== opt.id);
                  } else {
                    if (!poll.allowMultiple) newVotes = [opt.id];
                    else newVotes.push(opt.id);
                  }
                  pollApi.votePoll(poll.id, newVotes).then(() => queryClient.invalidateQueries(['polls']));
                }}
              >
                <div className="absolute top-0 left-0 h-full bg-indigo-100 dark:bg-indigo-900/40 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                <div className="relative z-10 flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isVotedByMe ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                    {isVotedByMe && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <span className={`text-[13px] ${isVotedByMe ? 'font-semibold text-indigo-900 dark:text-indigo-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{opt.content}</span>
                </div>
                <div className="relative z-10 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  {opt.votes.length > 0 ? `${opt.votes.length} (${percentage}%)` : '0%'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
          <span>{totalVotes} lượt bình chọn</span>
          {!poll.allowMultiple && <span>Chỉ chọn 1</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatPollWidget;
