import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useEffect } from 'react';
import io from 'socket.io-client';
import useAuthStore from '../stores/auth.store';
import authApi from '../api/auth.api';

import { Helmet } from 'react-helmet-async';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:1411';

const schema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const LoginPage = () => {
  const { login, qrLogin } = useAuthStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [loginMethod, setLoginMethod] = useState('QR'); // 'QR' or 'PASSWORD'
  const [qrSessionId, setQrSessionId] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await login(data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  // QR Generate and Listen (Real-time Socket.io)
  useEffect(() => {
    let socketRef = null;
    let isMounted = true;

    const generateAndListen = async () => {
      if (loginMethod !== 'QR') {
        setQrSessionId(null);
        return;
      }
      try {
        const { data: genData } = await authApi.generateQrSession();
        const sessionId = genData.data.sessionId;
        if (isMounted) setQrSessionId(sessionId);

        // Connect to unauthenticated QR namespace
        socketRef = io(`${SOCKET_URL}/qr`, {
          query: { sessionId },
          transports: ['websocket'],
        });

        socketRef.on('qr_authorized', (tokenData) => {
          qrLogin(tokenData);
          navigate('/');
        });

      } catch (err) {
        console.error('Failed to generate QR session', err);
      }
    };

    generateAndListen();

    return () => {
      isMounted = false;
      if (socketRef) {
        socketRef.disconnect();
      }
    };
  }, [loginMethod, qrLogin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 relative overflow-hidden">
      <Helmet>
        <title>Đăng nhập | DVN Chat</title>
        <meta name="description" content="Đăng nhập vào DVN Chat để kết nối với bạn bè và đồng nghiệp." />
      </Helmet>
      
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-sky-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[480px] glass-card p-6 sm:p-8 md:p-10 relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://dvntechnology.com/assets/logo.png"
            alt="DVN"
            className="h-10 w-auto object-contain mb-4"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Đăng nhập DVN Chat
          </h1>

          {/* Tab Switcher */}
          <div className="flex w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('QR')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                loginMethod === 'QR'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              VỚI MÃ QR
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('PASSWORD')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                loginMethod === 'PASSWORD'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              VỚI MẬT KHẨU
            </button>
          </div>
        </div>

        <div className="transition-all duration-300">
          {loginMethod === 'QR' ? (
            <div className="flex flex-col items-center animate-fade-in-up">
              <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 group">
                <img 
                  src={qrSessionId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrSessionId}` : "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=loading"} 
                  alt="QR Code" 
                  className={`w-48 h-48 object-contain rounded-xl transition-opacity ${!qrSessionId ? 'opacity-20' : 'opacity-90 group-hover:opacity-100'}`}
                />
                
                {/* Loader when generating QR */}
                {!qrSessionId && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  </div>
                )}
                
                {/* QR Scanner Animation */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-scan shadow-[0_0_8px_2px_rgba(99,102,241,0.5)] z-10"></div>
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
              </div>

              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Quét mã QR để đăng nhập</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-4 leading-relaxed mb-6">
                Sử dụng tính năng quét mã QR trên ứng dụng <b>DVN Chat Mobile</b> để đăng nhập tức thì.
              </p>
              
              <div className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Đang chờ quét...
              </div>


            </div>
          ) : (
            <div className="animate-fade-in-up">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên đăng nhập</label>
                  <input {...register('username')} className="input-field" placeholder="vd: taikhoancuaban" autoComplete="username" />
                  {errors.username && <p className="text-red-600 text-xs mt-1.5">{errors.username.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
                  <input {...register('password')} type="password" className="input-field" placeholder="••••••••" autoComplete="current-password" />
                  {errors.password && <p className="text-red-600 text-xs mt-1.5">{errors.password.message}</p>}
                </div>

                {serverError && <div className="alert-error">{serverError}</div>}

                <button type="submit" disabled={isSubmitting} className="btn-primary mt-6">
                  {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 dark:text-slate-400 text-sm mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="link-primary">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
