<p align="center">
  <a href="https://github.com/minhhoang0112/openlearn-platform">
    <img src="public/logo.svg" width="128" height="128" alt="OpenLearn Platform Logo" />
  </a>
</p>

<h1 align="center">OpenLearn Platform</h1>

<p align="center">
  <strong>Nền tảng học tiếng Anh thông minh thế hệ mới: SRS Flashcard, Luyện nghe &amp; Shadowing, Gia sư AI tương tác bằng giọng nói</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A524.15-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js version" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/AI-Gemini%20Live-8E75C2?style=flat-square&logo=google-gemini&logoColor=white" alt="Gemini AI" />
</p>

<p align="center">
  <a href="#t%E1%BA%A3i-v%E1%BB%81-v%C3%A0-ch%E1%BA%A1y">Bắt đầu nhanh</a> •
  <a href="#b%E1%BA%ADt-ai-t%C3%B9y-ch%E1%BB%8Dn">Cấu hình AI</a> •
  <a href="#c%C3%A0i-t%E1%BB%AB-%C4%91i%E1%BB%83n-anh--vi%E1%BB%87t-l%E1%BB%9Bn-t%C3%B9y-ch%E1%BB%8Dn">Từ điển Offline</a> •
  <a href="#ph%C3%A1t-tri%E1%BB%83n-v%C3%A0-ki%E1%BB%83m-th%E1%BB%AD">Lệnh &amp; Kiểm thử</a> •
  <a href="docs/INDEX.md">Tài liệu kiến trúc</a>
</p>

---

Frontend: **React 19**, **TypeScript**, **Vite 6**, **Tailwind CSS**. Backend: HTTP server **Node.js** và **SQLite tích hợp** (`node:sqlite`); không cần cài Express hay máy chủ cơ sở dữ liệu bên ngoài. Repo lưu trữ toàn diện mã FE/BE, giáo trình chuẩn, hệ thống kiểm thử tự động và công cụ phát triển.

## Tải về và chạy

Yêu cầu **Node.js 24.15 trở lên** và npm đi kèm. Node 18 / 20 không chạy được backend này. Chrome được khuyến nghị cho microphone và âm thanh.

```sh
git clone https://github.com/minhhoang0112/openlearn-platform.git
cd openlearn-platform
npm ci
npm run dev:all
```

Nếu tải ZIP từ GitHub, giải nén rồi mở terminal ngay trong thư mục có `package.json` và chạy hai lệnh npm ở trên.

Mở **http://127.0.0.1:3000**. API chạy tại `http://127.0.0.1:4000/api/v1`; kiểm tra tại `/api/v1/health`. Giữ terminal mở, nhấn `Ctrl+C` để dừng. Nếu cổng 3000 / 4000 đang được dùng, dừng phiên chạy cũ trước. Windows có thể mở `OpenLearn.bat` hoặc `run.bat`; cả hai dùng chung quy trình kiểm tra và tự cài dependencies nếu chưa có.

Lần chạy đầu tự tạo SQLite và nạp thư viện bài học đi kèm. Đăng ký tài khoản mới trên web; không có dữ liệu cá nhân hay tài khoản của người phát triển trong repo. Học từ vựng và các bài có sẵn không cần API key.

## Bật AI (tùy chọn)

Sao chép `.env.example` thành `.env` bằng trình quản lý file, hoặc:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```sh
# macOS / Linux
cp .env.example .env
```

Điền key của bạn vào `GEMINI_API_KEY=...`, chọn model tài khoản có quyền sử dụng rồi khởi động lại backend. Mẫu cấu hình không chứa key. `GEMINI_SECONDARY_API_KEY` là tùy chọn cho nhóm tác vụ nhẹ; giao tiếp giọng nói cần model Gemini Live tương thích và quyền sử dụng riêng của tài khoản. Khả năng dùng / hạn mức AI phụ thuộc dịch vụ cung cấp.

Không đăng `.env`, key hay `server/data` lên Git. Xem [cấu hình AI](docs/AI-ROUTING.md) và [giao tiếp AI](docs/COMMUNICATION-AI.md).

## Cài từ điển Anh – Việt lớn (tùy chọn)

Repo có thư viện bài học và mục từ cơ bản. Để có kho tra từ lớn như máy phát triển, chạy một lần khi có Internet:

```sh
npm run dictionary:import
```

Sau đó khởi động lại backend. Kho hiện tại khoảng **119 nghìn mục từ / 38,5 MB**, lưu riêng trong `server/data/dictionaries`; không tải ảnh minh họa. Không cần chạy lại khi mở web. Việc import cần thêm dung lượng tạm thời. Đây là từ điển, không bảo đảm có mọi từ / câu; tra từ ngoài kho có thể cần mạng.

Xem [cơ chế từ điển](docs/LOCAL-DICTIONARY.md) và [nguồn, giấy phép dữ liệu](docs/DICTIONARY-DATA-NOTICE.md).

## Phát triển và kiểm thử

| Lệnh | Công dụng |
| --- | --- |
| `npm run dev:all` | Chạy frontend và backend cùng lúc |
| `npm run dev` | Chỉ chạy frontend; cần API chạy riêng để học / đăng nhập |
| `npm run dev:api` | Backend tự khởi động lại khi sửa mã |
| `npm run start:api` | Backend không theo dõi thay đổi |
| `npm run test:api` | Kiểm thử backend |
| `npm run build` | Kiểm tra TypeScript và build frontend vào `dist` |
| `npm run preview` | Xem thử frontend đã build; vẫn cần backend chạy riêng |

Các script kiểm thử trình duyệt trong `scripts/` dùng `playwright-core` từ `npm ci` và Google Chrome cài trên máy. Không tự tải thêm Chromium. Nhiều script kiểm tra bản build nên chạy `npm run build` trước. Kiểm tra gọi AI thật có thể dùng hạn mức: đọc script trước khi chạy.

`dev:all` phục vụ chạy cục bộ. Triển khai công khai cần HTTPS, cấu hình origin / cookie và proxy `/api` (gồm WebSocket); `dist` riêng lẻ không bao gồm backend.

## Dữ liệu và thư mục

- `src/`: giao diện web.
- `server/`: backend; `server/content/` chứa giáo trình và WAV thực tế dùng trong bài nghe.
- `public/`: logo, ví dụ nhập liệu và AudioWorklet cho giao tiếp giọng nói.
- `scripts/`, `server/tests/`: công cụ bảo trì và kiểm thử.
- `docs/`: hợp đồng API, hướng dẫn và lịch sử phát triển. Bắt đầu với [mục lục](docs/INDEX.md).
- `research/`: tài liệu đối chiếu lịch sử, không cần chạy để dùng web.
- `server/data/`: dữ liệu phát sinh trên máy bạn, đã được Git bỏ qua. Sao lưu thư mục này để giữ tiến độ / hội thoại khi chuyển máy.

`node_modules`, `dist`, cache và file tạm không nằm trong nguồn Git; `npm ci` / `npm run build` tạo lại chúng. Giữ âm thanh giáo trình vì bài nghe cần các file đó. Chi tiết đợt dọn: [REPOSITORY-CLEANUP.md](docs/REPOSITORY-CLEANUP.md).

## Nguồn dữ liệu

Giấy phép dependency và dữ liệu bên thứ ba áp dụng riêng. Với dữ liệu từ điển Wiktionary, giữ thông tin nguồn và giấy phép trong [DICTIONARY-DATA-NOTICE.md](docs/DICTIONARY-DATA-NOTICE.md). Repo hiện chưa có tệp `LICENSE` cho toàn bộ mã nguồn; không mặc định coi dự án là MIT.
