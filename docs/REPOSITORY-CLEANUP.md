# Dọn repo để tải về chạy

Đã bỏ khỏi cây nguồn 11 file, tổng 8.965.390 byte (khoảng 8,97 MB):

- `docs/ANTI-HANDOFF.zip`: bản nén trùng tài liệu, tạo lại bằng `scripts/package-anti-handoff.ps1` khi cần.
- `research/index.js`, `research/home.html`: bundle / HTML tải từ trang tham khảo, ứng dụng không dùng.
- Ba script phân tích một lần chỉ đọc bundle đó: `extract-client.mjs`, `inspect.mjs`, `qa-local.mjs`.
- Năm ảnh trong `docs/reference/`: trùng SHA-256 với ảnh đã giữ trong `docs/anti-reference/` (lần lượt `user-home`, `user-study-question`, `user-learning-path`, `user-speaking-question`, `user-study-set`). Không có tham chiếu tới năm đường dẫn bị bỏ trong mã nguồn / tài liệu hiện tại.

Bản sao trước dọn nằm tại `.tmp/repository-cleanup-backup/` trên máy thực hiện và không được đưa lên Git. Báo cáo nghiên cứu và ảnh duy nhất còn lại vẫn giữ để đối chiếu.

Các script kiểm thử trình duyệt dùng `playwright-core` của dự án thay cho đường dẫn npm cache cá nhân. Thư viện này không tự tải Chromium; cài Google Chrome để chạy các kiểm thử dùng `channel: 'chrome'`.

Giữ nguyên giáo trình và WAV: đây là dữ liệu thực tế phục vụ nghe / shadowing. Không xóa file runtime, bài kiểm thử, dữ liệu học cá nhân hay `.env`. `node_modules`, `dist`, cache, SQLite, từ điển tải thêm đều đã được bỏ qua bởi Git.

Việc bỏ file làm gọn phiên bản mới và ZIP nguồn mới. Git clone vẫn có thể tải các file cũ trong lịch sử; đợt dọn này không viết lại lịch sử Git.

## Kiểm tra sau dọn

- Build TypeScript / Vite thành công.
- Toàn bộ 152 kiểm thử backend đạt; 5 ca giao diện chấm từ vựng đạt, không có lỗi trang.
- Bản sao chỉ gồm file nguồn Git và file mới không bị ignore: `npm ci` và `npm run build` thành công; API health trả 200 với database mới, không có `.env` hay database cá nhân.
- Giữ đủ 185 file WAV giáo trình (27 bài đầy đủ + 158 clip câu), tổng 42.591.654 byte, và AudioWorklet giao tiếp.
- Kiểm tra cú pháp 163 file `.mjs`; không thấy file dữ liệu riêng / cache trong danh sách nguồn chia sẻ, không khớp mẫu Gemini key hoặc private key trong file văn bản đã quét. Đây không phải cam kết quét mọi loại bí mật hay toàn bộ lịch sử Git.

Vite vẫn cảnh báo bundle JavaScript lớn hơn 500 kB; đây là hạng mục tối ưu tải trang, không phải file thừa có thể xóa tùy ý. Không thay đổi cách chia bundle trong đợt dọn này.
