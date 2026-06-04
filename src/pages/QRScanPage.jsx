import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import authApi from '../api/auth.api';
import useAuthStore from '../stores/auth.store';

const QRScanPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  // Nếu chưa đăng nhập, đá về trang login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleApprove = async () => {
    if (!sessionId) return;
    setStatus('loading');
    setErrorMessage('');
    
    try {
      await authApi.authorizeQrSession(sessionId);
      setStatus('success');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.message || 'Không thể xác nhận đăng nhập.');
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="glass-card p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Lỗi mã QR</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Không tìm thấy mã phiên đăng nhập (Session ID) trong đường dẫn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <Helmet>
        <title>Xác nhận đăng nhập | DVN Chat</title>
      </Helmet>

      <div className="w-full max-w-sm glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500"></div>
        
        <div className="text-center mb-8">
          <img src="https://dvntechnology.com/assets/logo.png" alt="DVN" className="h-10 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Xác nhận đăng nhập</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bạn đang yêu cầu đăng nhập DVN Chat trên một thiết bị khác bằng tài khoản <b>{user?.fullName}</b>.
          </p>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center animate-fade-in-up">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Thành công!</h2>
            <p className="text-sm text-slate-500 text-center mt-2">Thiết bị kia đã được đăng nhập. Tự động quay lại trang chủ...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {status === 'error' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800/30 text-center mb-2">
                {errorMessage}
              </div>
            )}
            
            <button
              onClick={handleApprove}
              disabled={status === 'loading'}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Đang xử lý...
                </>
              ) : (
                'Đồng ý đăng nhập'
              )}
            </button>
            <button
              onClick={() => navigate('/')}
              disabled={status === 'loading'}
              className="w-full py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Hủy bỏ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanPage;
