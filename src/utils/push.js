import axiosClient from '../api/axiosClient';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Khóa VAPID Public Key - Phải giống hệt với khóa ở Backend
const PUBLIC_VAPID_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

export const registerPushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push không được hỗ trợ trên trình duyệt này');
    return;
  }

  if (!PUBLIC_VAPID_KEY || PUBLIC_VAPID_KEY.includes('...')) {
    console.warn('VAPID public key chưa được cấu hình. Cần khởi động lại React App (npm start) để nhận biến môi trường mới.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Người dùng đã từ chối nhận thông báo');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker đăng ký thành công:', registration);

    // Chờ SW ready
    await navigator.serviceWorker.ready;

    // Đăng ký Push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    console.log('Đã có Push Subscription:', subscription);

    // Gửi subscription lên Backend
    await axiosClient.post('/notifications/subscribe', {
      subscription: subscription,
      deviceInfo: navigator.userAgent
    });
    
    console.log('Đã lưu Push Subscription lên máy chủ');
  } catch (error) {
    console.error('Lỗi khi đăng ký Web Push:', error);
  }
};
