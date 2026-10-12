# DVN Chat Client

Frontend web của **DVN Chat** - ứng dụng nhắn tin trực tiếp và nhắn tin nhóm theo thời gian thực. Dự án được xây dựng bằng React và hiện sử dụng **Socket.IO** cho realtime (tên repository có `SignalRChat`, nhưng client hiện tại không kết nối SignalR).

Ứng dụng hỗ trợ chat 1-1, chat nhóm theo đơn vị, chia sẻ tệp, cuộc gọi, thông báo nền và các tiện ích cộng tác như ghi chú, bình chọn và nhắc việc.

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
- [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
- [Các route của ứng dụng](#các-route-của-ứng-dụng)
- [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
- [Kiến trúc thư mục](#kiến-trúc-thư-mục)
- [Luồng dữ liệu và xác thực](#luồng-dữ-liệu-và-xác-thực)
- [Tích hợp backend](#tích-hợp-backend)
- [Build và triển khai](#build-và-triển-khai)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

## Tính năng

### Tài khoản và xác thực

- Đăng nhập bằng tên đăng nhập và mật khẩu.
- Đăng ký tài khoản với họ tên, username, mật khẩu, số điện thoại tùy chọn và mã đơn vị.
- Duy trì phiên đăng nhập bằng access token và refresh token.
- Tự động refresh access token khi API trả về `401`.
- Đăng nhập bằng QR giữa các thiết bị:
  - Thiết bị mới tạo QR session.
  - Thiết bị đã đăng nhập xác nhận phiên bằng route `/qr-scan`.
  - Thiết bị mới nhận token qua Socket.IO namespace `/qr`.
- Bảo vệ route riêng tư và tự động chuyển hướng về màn hình đăng nhập khi chưa xác thực.
- Tự động mở nhóm đơn vị sau khi đăng nhập hoặc tải lại trang.

> Lưu ý: component đăng ký đã có trong source nhưng route `/register` hiện đang được tắt trong `AppRouter.jsx`. Muốn mở màn hình đăng ký, cần bật lại route này và liên kết từ màn hình đăng nhập.

### Nhắn tin

- Chat trực tiếp giữa hai người dùng.
- Chat nhóm.
- Nhận tin nhắn mới theo thời gian thực.
- Hiển thị trạng thái online/offline, lần hoạt động gần nhất và trạng thái đang nhập.
- Phân trang lịch sử tin nhắn; tải thêm tin cũ khi cuộn lên.
- Đánh dấu đã đọc và hiển thị người đã đọc tin nhắn.
- Reply tin nhắn.
- Chỉnh sửa và thu hồi tin nhắn.
- Xóa tin nhắn ở phía người dùng hiện tại với thời gian hoàn tác 5 giây.
- Thả cảm xúc bằng emoji; xem danh sách người đã thả cảm xúc.
- Chọn nhiều tin nhắn để thao tác.
- Chia sẻ/chuyển tiếp tin nhắn sang cuộc trò chuyện khác.
- Ghim và bỏ ghim tin nhắn.
- Xóa nội dung cuộc trò chuyện.
- Tự nhận diện và hiển thị liên kết trong nội dung.
- Mention người dùng trong nhóm bằng `@username`.
- Xem trước liên kết khi backend phát sự kiện preview.
- Emoji picker, sticker và ghi âm tin nhắn thoại.
- Xem ảnh trong image viewer và phát audio với waveform.

### Tệp và media

- Upload tệp qua API multipart.
- Gửi ảnh, file và audio trong tin nhắn.
- Xem thư viện ảnh/media của cuộc trò chuyện.
- Xem danh sách file đã chia sẻ.
- Phóng to ảnh trong modal.
- Cập nhật avatar cá nhân và avatar nhóm.

### Nhóm chat

- Xem danh sách nhóm của người dùng.
- Tạo nhóm.
- Thêm và xóa thành viên.
- Xem cây thành viên nhóm.
- Phân quyền thành viên (admin/deputy/member tùy backend).
- Đổi tên và avatar nhóm.
- Cập nhật cài đặt nhóm.
- Bật/tắt chế độ chỉ quản trị viên được gửi tin.
- Xóa/giải tán nhóm.
- Nhận cập nhật thành viên, quyền, cài đặt và trạng thái nhóm realtime.
- Hỗ trợ nhóm đơn vị dựa trên `unitCode`.

### Tiện ích cộng tác

- **Ghi chú:** tạo, xem và xóa ghi chú.
- **Bình chọn:** tạo poll, thêm lựa chọn, bỏ phiếu và đóng poll.
- **Nhắc việc:** tạo, xem, cập nhật trạng thái hoàn thành và xóa reminder.
- Các tiện ích được đồng bộ realtime qua các event `note_*`, `poll_*` và `reminder_*`.

### Cuộc gọi

- Cuộc gọi trực tiếp audio/video qua WebRTC signaling Socket.IO.
- Popup cuộc gọi đến, chấp nhận, từ chối và kết thúc cuộc gọi.
- Cuộc gọi nhóm qua ZEGOCLOUD UIKit.
- Thông báo khi có cuộc gọi nhóm đến.

### Giao diện và trải nghiệm

- Responsive cho desktop, tablet và mobile.
- Sidebar danh sách cuộc trò chuyện và right sidebar thông tin cuộc trò chuyện.
- Hỗ trợ thao tác vuốt để mở/đóng sidebar trên mobile.
- Dark mode/light mode thông qua theme store.
- Toast, modal và trạng thái loading/error dùng chung.
- SEO metadata cho từng màn hình bằng `react-helmet-async`.
- Web Push notification qua Service Worker khi backend cung cấp VAPID public key.

## Công nghệ sử dụng

- [React 19](https://react.dev/)
- [Create React App](https://create-react-app.dev/) / `react-scripts`
- [React Router](https://reactrouter.com/)
- [Zustand](https://zustand.docs.pmnd.rs/) - state management
- [TanStack React Query](https://tanstack.com/query) - cache và đồng bộ dữ liệu API
- [Axios](https://axios-http.com/) - HTTP client
- [Socket.IO Client](https://socket.io/) - realtime và signaling
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) - form và validation
- [Tailwind CSS](https://tailwindcss.com/) - giao diện
- [ZEGOCLOUD UIKit](https://www.zegocloud.com/) - cuộc gọi nhóm
- `wavesurfer.js` - hiển thị waveform audio
- `html5-qrcode` - xử lý QR
- `date-fns` - định dạng thời gian

## Yêu cầu môi trường

- Node.js bản LTS, khuyến nghị Node.js 18 trở lên.
- npm hoặc pnpm.
- Backend DVN Chat đang chạy và cung cấp REST API cùng Socket.IO tại cùng môi trường.
- Trình duyệt hiện đại hỗ trợ WebSocket, WebRTC, MediaRecorder và Web Push (nếu dùng các tính năng tương ứng).

## Cài đặt và chạy dự án

### 1. Clone source và cài dependency

```bash
git clone <repository-url>
cd signalr_chat_client
npm install
```

Nếu dùng pnpm (repository có `pnpm-lock.yaml`):

```bash
pnpm install
```

### 2. Tạo file môi trường

Tạo file `.env.local` ở thư mục gốc:

```env
REACT_APP_API_URL=http://localhost:1411/api
REACT_APP_SOCKET_URL=http://localhost:1411
REACT_APP_VAPID_PUBLIC_KEY=
```

Các giá trị trên là giá trị mặc định của source, vì vậy có thể bỏ qua hai URL nếu backend chạy đúng tại `localhost:1411`.

### 3. Chạy môi trường phát triển

```bash
npm start
```

Hoặc:

```bash
pnpm start
```

Mở [http://localhost:3000](http://localhost:3000).

### 4. Kiểm tra đăng nhập

1. Đảm bảo backend đã chạy.
2. Mở `http://localhost:3000/login`.
3. Đăng nhập bằng tài khoản backend cung cấp hoặc tạo tài khoản sau khi bật route `/register`.
4. Sau khi đăng nhập thành công, ứng dụng kết nối Socket.IO và tải nhóm đơn vị nếu tài khoản có nhóm tương ứng.

## Cấu hình biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---:|---|---|
| `REACT_APP_API_URL` | Không | `http://localhost:1411/api` | Base URL cho REST API |
| `REACT_APP_SOCKET_URL` | Không | `http://localhost:1411` | URL cho Socket.IO, đường dẫn media và avatar |
| `REACT_APP_VAPID_PUBLIC_KEY` | Khi dùng Web Push | Rỗng | Public VAPID key do backend cung cấp |

Lưu ý:

- Biến môi trường của Create React App phải bắt đầu bằng `REACT_APP_`.
- Không commit `.env`, `.env.local` hoặc secret vào Git.
- `REACT_APP_SOCKET_URL` cần trỏ tới host có thể phục vụ cả Socket.IO và các đường dẫn file/avatar mà backend trả về.
- Nếu frontend và backend khác domain, backend phải bật CORS và cấu hình cookie/credentials phù hợp.

## Các route của ứng dụng

| Route | Quyền truy cập | Mô tả |
|---|---|---|
| `/login` | Công khai | Đăng nhập |
| `/chat` | Đã đăng nhập | Màn hình chat chính |
| `/qr-scan?sessionId=<id>` | Đã đăng nhập | Xác nhận đăng nhập cho thiết bị khác |
| `/register` | Hiện đang tắt | Component đăng ký có sẵn nhưng route bị comment |
| `*` | - | Chuyển hướng về `/chat` |

## Hướng dẫn sử dụng

### Bắt đầu một cuộc trò chuyện

1. Đăng nhập.
2. Chọn cuộc trò chuyện trong sidebar hoặc tìm người dùng.
3. Nhập nội dung và gửi bằng nút gửi/Enter.
4. Dùng nút emoji, sticker, đính kèm file hoặc ghi âm ở thanh nhập tin nhắn.
5. Trên mobile, vuốt từ mép trái để mở danh sách cuộc trò chuyện.

### Chat nhóm

1. Mở danh sách nhóm và chọn nhóm cần xem.
2. Dùng phần thông tin bên phải để xem thành viên, media và file.
3. Nếu có quyền quản trị, mở cài đặt nhóm để quản lý thành viên, vai trò, tên, avatar và quyền gửi tin.
4. Tạo ghi chú, poll hoặc reminder từ các widget tương ứng trong cuộc trò chuyện.

### Quản lý tin nhắn

- Mở menu trên tin nhắn để reply, chỉnh sửa, thu hồi, ghim, chia sẻ hoặc xóa phía mình.
- Chọn emoji nhanh để thả reaction.
- Nhấp vào reaction để xem danh sách người đã thả.
- Dùng ô tìm kiếm để tìm tin nhắn; media và file được gom trong right sidebar.

### Đăng nhập bằng QR

1. Trên thiết bị mới, tạo QR/session theo luồng đăng nhập của backend.
2. Trên thiết bị đã đăng nhập, mở đường dẫn `/qr-scan?sessionId=<sessionId>`.
3. Kiểm tra tài khoản và chọn **Đồng ý đăng nhập**.
4. Thiết bị mới nhận sự kiện `qr_authorized` và tự động chuyển vào ứng dụng.

### Web Push

1. Cấu hình `REACT_APP_VAPID_PUBLIC_KEY`.
2. Backend cần cung cấp endpoint đăng ký push subscription.
3. Cho phép quyền notification trong trình duyệt.
4. Service Worker tại `public/sw.js` sẽ hiển thị thông báo khi nhận được push.

## Kiến trúc thư mục

```text
src/
├── api/                 # Các client gọi REST API
│   ├── auth.api.js
│   ├── group.api.js
│   ├── message.api.js
│   ├── note.api.js
│   ├── poll.api.js
│   ├── reminder.api.js
│   ├── upload.api.js
│   └── user.api.js
├── components/
│   ├── call/            # Modal và toast cuộc gọi
│   ├── common/          # Thành phần dùng chung
│   └── layout/          # Sidebar, chat window, modal, widget
├── hooks/               # Custom hooks
├── pages/               # Các màn hình cấp route
├── routers/             # BrowserRouter và route guard
├── services/
│   └── socket.service.js # Kết nối và xử lý Socket.IO
├── stores/              # Zustand stores
│   ├── auth.store.js
│   ├── call.store.js
│   ├── chat.store.js
│   ├── theme.store.js
│   └── ui.store.js
└── utils/               # Token, push notification, format và validation
```

## Luồng dữ liệu và xác thực

### REST API

`src/api/axiosClient.js` cấu hình Axios với:

- Base URL từ `REACT_APP_API_URL`.
- Tự động gắn access token vào request.
- `withCredentials: true` để hỗ trợ cookie.
- Tự động refresh token khi nhận `401`.
- Xếp hàng các request đồng thời trong lúc refresh token.
- Chuyển về `/login` nếu refresh thất bại.

### State management

- `auth.store.js`: thông tin user, trạng thái đăng nhập, login/register/refresh/logout.
- `chat.store.js`: cuộc trò chuyện hiện tại, tin nhắn, typing, online, read watermark và pinned messages.
- `call.store.js`: trạng thái cuộc gọi trực tiếp.
- `theme.store.js`: theme.
- `ui.store.js`: modal, toast và trạng thái UI dùng chung.
- React Query cache dữ liệu server với `staleTime` 5 phút và retry 1 lần.

### Realtime

`socket.service.js` xử lý các nhóm event chính:

- Tin nhắn: `receiveGroupMessage`, `receiveDirectMessage`.
- Typing/online: `userTyping`, `userStopTyping`, `userOnline`, `userOffline`.
- Nhóm: thêm/xóa thành viên, đổi quyền, cài đặt, readonly và giải tán nhóm.
- Tin nhắn: edit, recall, delete, pin, unpin, reaction, read receipt và link preview.
- Tiện ích: note, poll, reminder.
- Cuộc gọi: call request/accept/reject/end và WebRTC offer/answer/ICE.

Khi mở `ChatPage`, client kết nối Socket.IO; khi rời trang hoặc logout, client ngắt kết nối và dọn state/cache.

## Tích hợp backend

Frontend kỳ vọng backend cung cấp tối thiểu các nhóm endpoint sau:

| Nhóm | Endpoint tiêu biểu |
|---|---|
| Auth | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/refresh-token` |
| QR login | `/auth/qr/generate`, `/auth/qr/authorize/:sessionId`, `/auth/qr/status/:sessionId` |
| User | `/users/search`, `/users/recent-chats`, profile, pinned/muted conversations |
| Group | `/groups/me`, `/groups`, `/groups/:id/users`, settings, role, avatar |
| Message | lịch sử direct/group, edit, recall, delete-for-me, media, search, pins |
| Upload | `POST /uploads` với `multipart/form-data` |
| Note | `/notes` |
| Poll | `/polls`, vote, options, close |
| Reminder | `/reminders`, status, delete |

Backend cũng cần:

- Xác thực JWT/access token và refresh token.
- Socket.IO server tương thích với event mà client sử dụng.
- CORS cho origin frontend.
- Hỗ trợ WebSocket và credentials nếu frontend/backend khác origin.
- Cung cấp URL truy cập được cho avatar, ảnh, file và audio.
- Cấu hình WebRTC signaling và ZEGOCLOUD nếu bật cuộc gọi.
- Cấu hình Web Push/VAPID nếu bật thông báo nền.

## Build và triển khai

### Build production

```bash
npm run build
```

Lệnh build:

- Tạo bundle production vào thư mục `build/`.
- Tắt source map bằng `GENERATE_SOURCEMAP=false`.
- Chạy script `postbuild` để xử lý obfuscation sau build.

Có thể phục vụ thư mục `build/` bằng Nginx, IIS, CDN hoặc static hosting. Vì ứng dụng dùng BrowserRouter, server production cần fallback mọi route không phải file tĩnh về `index.html`.

Ví dụ với Nginx:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Kiểm thử

```bash
npm test
```

Create React App sẽ chạy test ở chế độ watch. Có thể dùng `CI=true npm test -- --watchAll=false` trong CI.

### Các script có sẵn

| Lệnh | Mục đích |
|---|---|
| `npm start` | Chạy development server |
| `npm run build` | Build production và chạy postbuild |
| `npm test` | Chạy test runner |
| `npm run eject` | Eject cấu hình Create React App, không khuyến nghị |

## Xử lý lỗi thường gặp

### Không gọi được API

- Kiểm tra backend có chạy đúng port không.
- Kiểm tra `REACT_APP_API_URL`.
- Kiểm tra CORS và giao thức `http/https`.
- Sau khi đổi `.env.local`, cần khởi động lại `npm start`.

### Socket.IO không kết nối

- Kiểm tra `REACT_APP_SOCKET_URL`.
- Kiểm tra backend có bật Socket.IO/WebSocket.
- Kiểm tra proxy hoặc reverse proxy có cho phép upgrade WebSocket.
- Mở DevTools và xem lỗi `connect_error`.

### Bị chuyển về `/login`

- Access token đã hết hạn và refresh token không hợp lệ/hết hạn.
- Kiểm tra cookie, `withCredentials`, CORS và endpoint `/auth/refresh-token`.
- Xóa session cũ trong localStorage rồi đăng nhập lại.

### Avatar/file/ảnh không hiển thị

- `REACT_APP_SOCKET_URL` phải trỏ tới host phục vụ media.
- Backend phải trả về đường dẫn media hợp lệ.
- Kiểm tra quyền truy cập file và cấu hình static files.

### Cuộc gọi không hoạt động

- Cấp quyền microphone/camera cho trình duyệt.
- Dùng HTTPS khi triển khai production (ngoại trừ localhost).
- Kiểm tra signaling Socket.IO, TURN/STUN và cấu hình ZEGOCLOUD.

### Không nhận Web Push

- Chỉ hỗ trợ trên trình duyệt có Web Push và trong secure context.
- Kiểm tra `REACT_APP_VAPID_PUBLIC_KEY`.
- Kiểm tra quyền notification và Service Worker.
- Backend phải lưu subscription và gửi payload có `title`, `body`, tùy chọn `url`.

## Đóng góp

1. Tạo branch cho thay đổi mới.
2. Giữ nguyên quy ước component, Zustand store và API client hiện có.
3. Kiểm tra lint/build/test trước khi tạo pull request.
4. Không commit secret hoặc file `.env`.
5. Mô tả rõ thay đổi UI, API và event realtime trong pull request.

## License

Chưa khai báo license trong repository. Nếu dự án được phát hành công khai, hãy bổ sung file `LICENSE` và thông tin bản quyền phù hợp.
