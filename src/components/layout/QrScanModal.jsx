import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useEffect } from 'react';

const QrScanModal = ({ onClose, status, error, onScan }) => {
  useEffect(() => {
    // Nếu đang xử lý hoặc thành công thì không khởi tạo lại scanner
    if (status === 'loading' || status === 'success') return;

    let html5QrCode;

    const startScanner = async () => {
      let isScanned = false;
      try {
        html5QrCode = new Html5Qrcode("qr-reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 60,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], // Chỉ quét QR Code để tối ưu hiệu suất thuật toán
            aspectRatio: 1.0,
            disableFlip: false
          },
          (decodedText) => {
            if (isScanned) return;
            isScanned = true;
            onScan(decodedText);
          },
          (errorMessage) => {
            // Lỗi parse (bỏ qua)
          }
        );
      } catch (err) {
        console.error("Lỗi khi khởi động camera:", err);
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Lỗi khi dừng camera:", err));
      }
    };
  }, [onScan, status]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="w-full max-w-sm glass-card p-6 relative overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500"></div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quét mã QR</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">Xác nhận thành công!</p>
            <p className="text-sm text-slate-500 mt-2 text-center">Thiết bị kia đã được đăng nhập.</p>
          </div>
        ) : status === 'loading' ? (
          <div className="flex flex-col items-center py-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 animate-spin text-indigo-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Đang xử lý...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800/30 text-center">
                {error}
              </div>
            )}

            {/* Vùng chứa Scanner */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 border-4 border-slate-100 dark:border-slate-800 w-full aspect-square flex items-center justify-center shadow-inner group">
              <div id="qr-reader" className="absolute inset-0 w-full h-full flex items-center justify-center"></div>

              {/* Scanner Line Animation */}
              <div className="absolute top-0 left-4 right-4 h-0.5 bg-indigo-500 animate-scan z-10 shadow-[0_0_12px_3px_rgba(99,102,241,0.8)]"></div>

              {/* Corner Accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white/70 rounded-tl-lg z-10 transition-transform group-hover:scale-110"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white/70 rounded-tr-lg z-10 transition-transform group-hover:scale-110"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white/70 rounded-bl-lg z-10 transition-transform group-hover:scale-110"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white/70 rounded-br-lg z-10 transition-transform group-hover:scale-110"></div>
            </div>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center mt-2">
              Đưa mã QR trên màn hình đăng nhập vào khung hình để quét.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QrScanModal;
