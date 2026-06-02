import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useAuthStore from '../stores/auth.store';

const schema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const LoginPage = () => {
  const { login } = useAuthStore();
  const [serverError, setServerError] = useState('');

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

return (
  <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
    <div className="w-full max-w-md glass-card p-6 sm:p-8 md:p-9">
      <div className="flex items-center gap-3 mb-6">
        <img
          src="https://dvntechnology.com/assets/logo.png"
          alt="DVN Chat"
          className="w-11 h-11 rounded-xl bg-white p-1 border border-black/5"
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Đăng nhập</h1>
          <p className="text-slate-500 text-sm mt-0.5">Chào mừng bạn quay lại</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
          <input {...register('username')} className="input-field" placeholder="vd: dinhtrungndt" autoComplete="username" />
          {errors.username && <p className="text-red-600 text-xs mt-1.5">{errors.username.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
          <input {...register('password')} type="password" className="input-field" placeholder="••••••••" autoComplete="current-password" />
          {errors.password && <p className="text-red-600 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        {serverError && <div className="alert-error">{serverError}</div>}

        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="text-center text-slate-600 text-sm mt-6">
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
