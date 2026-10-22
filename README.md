# OpenLearn - Nền tảng học tiếng Anh thông minh

Trạng thái BE và phần FE đã tích hợp: [bàn giao chung](docs/UPGRADE-V2-STATUS.md). Nội dung và hợp đồng mới nhất: [bài ôn chặng](docs/UPGRADE-V2-CHECKPOINT.md).

Nâng cấp V2: [lộ trình sản phẩm](docs/UPGRADE-V2-PLAN.md), [trạng thái Codex/Anti](docs/UPGRADE-V2-STATUS.md), [API đã triển khai](docs/UPGRADE-V2-API.md). BE có hai bài pilot với WAV lưu sẵn, profile, kế hoạch ngày và session có lưu nháp/chấm/tiếp tục; FE chờ Anti tích hợp. Chưa có toàn bộ giáo trình V2. Contract hiện tại1.4.0/schema7/112route; các thông số ở bàn giao cũ bên dưới là lịch sử.

React 19, TypeScript, Vite, Tailwind; BE Node.js với SQLite. Phạm vi hiện tại: Nền tảng, TOEIC và Công việc. Tài khoản, thư viện và tiến độ được lưu ở BE.

## Chạy nhanh

Yêu cầu Node.js 24.15 trở lên. Mở **run.bat**, hoặc:

```sh
npm install
npm run dev:all
```

FE: http://127.0.0.1:3000. BE: http://127.0.0.1:4000/api/v1.

Đăng ký tài khoản local của bạn. Không có tài khoản/mật khẩu demo mặc định. Đăng nhập trên web OpenQuiz gốc không đăng nhập vào ứng dụng này.

`npm run dev` chỉ chạy FE; `npm run dev:api` chạy BE có theo dõi thay đổi. Database nằm ở `server/data/openquiz.sqlite`; không xóa thư mục này để giữ dữ liệu.

## Học liệu

Đã đối chiếu qua giao diện nguồn: 10 lộ trình, 180 bộ, 8.363 mục từ Anh–Việt. TOEIC có 50 bộ và 600 từ khác nhau. Có nguồn và thứ tự từng bộ trong `server/content/visible-english.json`.

Các trường đã nhập: từ, nghĩa, loại từ, IPA khi hiển thị. Có thêm ví dụ tự soạn và chức năng tạo/lưu ví dụ bằng AI. 60 bài học A1/A2/TOEIC có nội dung của ứng dụng và bài tập chấm trên server. Nội dung bổ sung không phải bài Pro gốc; `vocabulary_verified` không có nghĩa đã sao chép toàn bộ học liệu nguồn.

Seed giữ ID từ và tiến độ, không tạo lại tài khoản mẫu, không dùng tệp TOEIC sinh cũ. Bản nháp cũ được giữ để bảo toàn lịch sử nhưng không đề xuất trong danh mục.

## AI

Có adapter Gemini, Ollama local và gateway tùy chọn. Key hiện tại đã cấu hình trong `.env` của BE và đã kiểm tra bằng yêu cầu Gemini thật. Khi chuyển máy, cấu hình theo [hướng dẫn AI](docs/AI-SETUP.md). Không có key thì AI báo chưa kết nối, không sinh phản hồi hoặc điểm giả.

Gemini nhận xét bản ghi âm thực; Speech Recognition chỉ tạo bản chép lời để luyện nói. Ứng dụng cá nhân không có thanh toán, gói nâng cấp hay khóa tính năng theo tài khoản nguồn.

## Kiểm tra và bàn giao

```sh
npm run test:api
npm run build
```

Nếu môi trường Windows chặn tiến trình con của test runner:

```sh
node --test --test-isolation=none server/tests/*.test.mjs
```

Kịch bản `scripts/browser-qa.mjs` dùng Chrome và Playwright có sẵn trong môi trường phân tích; kiểm tra trên database tạm, không dùng tài khoản thật. Cần cập nhật đường dẫn Playwright khi chuyển máy.

Đọc [bàn giao BE mới nhất cho Anti](docs/ANTI-BE-HANDOFF.md), [gallery ảnh nguồn/local](docs/anti-reference/index.html), [101 route](docs/API-ROUTES.md) và [kiểm kê học liệu](docs/verified-content-inventory.json). Contract 1.3.0, SQLite schema 6. Học/nghe chép có cấu hình và phím tắt; ngữ pháp/đọc hiểu chấm BE, lưu draft/lịch sử; hội thoại có setup, mở đầu, gợi ý và dịch. BE khóa học lưu từng bước từ nội dung thật và chỉ ghi hoàn thành khi nộp quiz. Anti cần nối các API mới theo tài liệu; build thành công chưa có nghĩa FE đã nối hết logic.
