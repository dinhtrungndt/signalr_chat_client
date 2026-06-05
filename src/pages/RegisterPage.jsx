import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import useAuthStore from '../stores/auth.store';

import { Helmet } from 'react-helmet-async';

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username phải từ 3 ký tự')
    .max(30, 'Username tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Chỉ được dùng chữ, số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên').max(100),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?[0-9]{9,15}$/.test(v), 'Số điện thoại không hợp lệ'),
});

const RegisterPage = () => {
  const { register: registerUser } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const payload = { ...data };
      if (!payload.phone) delete payload.phone; // Bỏ qua phone nếu rỗng

      await registerUser(payload);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length > 0) {
        setServerError(apiErrors.map((e) => e.message).join(', '));
      } else {
        setServerError(err.response?.data?.message || 'Đăng ký thất bại');
      }
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
    <Helmet>
      <title>Đăng ký | DVN Chat</title>
      <meta name="description" content="Tạo tài khoản DVN Chat để bắt đầu nhắn tin với mọi người." />
    </Helmet>
    <div className="w-full max-w-md glass-card p-6 sm:p-8 md:p-9">
      <div className="flex flex-col items-center mb-8">
        <img
          src="https://dvntechnology.com/assets/logo.png"
          alt="DVN"
          className="h-10 w-auto object-contain mb-4"
        />
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Tạo tài khoản</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Nhanh gọn, rõ ràng, dễ dùng</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ và tên</label>
          <input {...register('fullName')} className="input-field" placeholder="Nguyễn Văn A" autoComplete="name" />
          {errors.fullName && <p className="text-red-600 text-xs mt-1.5">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên đăng nhập</label>
          <input {...register('username')} className="input-field" placeholder="ten_dang_nhap" autoComplete="username" />
          {errors.username && <p className="text-red-600 text-xs mt-1.5">{errors.username.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
          <input {...register('password')} type="password" className="input-field" placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" />
          {errors.password && <p className="text-red-600 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số điện thoại (tuỳ chọn)</label>
          <input {...register('phone')} className="input-field" placeholder="0901234567" autoComplete="tel" />
          {errors.phone && <p className="text-red-600 text-xs mt-1.5">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Mã đơn vị
            <span className="ml-1.5 text-xs text-slate-400 font-normal">(Bắt buộc — dùng để tham gia nhóm chat đơn vị)</span>
          </label>
          <input {...register('unitCode')} className="input-field" placeholder="VD: DV001, PHONG_KT..." autoComplete="off" />
          {errors.unitCode && <p className="text-red-600 text-xs mt-1.5">{errors.unitCode.message}</p>}
        </div>

        {serverError && <div className="alert-error">{serverError}</div>}

        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>

      <p className="text-center text-slate-600 dark:text-slate-400 text-sm mt-6">
        Đã có tài khoản?{' '}
        <Link to="/login" className="link-primary">
          Đăng nhập
        </Link>
      </p>
    </div>
  </div>
);
};

export default RegisterPage;
