import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { z } from 'zod';
import authApi from '../api/auth.api';
import useAuthStore from '../stores/auth.store';

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
          {/* <div className="flex w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
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
          </div> */}
        </div>

        <div className="transition-all duration-300">
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
        </div>

        {/* <p className="text-center text-slate-600 dark:text-slate-400 text-sm mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="link-primary">
            Đăng ký ngay
          </Link>
        </p> */}
      </div>
    </div>
  );
};

export default LoginPage;
