# Kiểm tra tích hợp TOEIC sau bàn giao Anti

Ngày 05/11/2026. Codex kiểm tra bản FE Anti vừa làm với BE hiện tại. Không thêm giai đoạn mới, không đổi schema/API hay tiến độ người học.

## Những lỗi đã sửa

- Sổ từ gọi limit100 nhưng không có cách xem tiếp: thêm phân trang từ vựng và sổ lỗi. Đã kiểm cả sáu trang, trang cuối40mục, đủ540. Đổi bộ lọc trở về trang đầu; bỏ các chặng không thuộc giai đoạn đã chọn; bỏ response cũ khi lọc nhanh.
- Nhận xét `verdict=close` trước đây luôn ghi chấp nhận: nay chỉ chấp nhận nếu `correct=true`. Typo có `correct=false` ghi gần đúng, phải làm lại. Câu đúng nhờ trợ giúp được ghi rõ cần tự làm lại.
- Âm thanh trước đây chỉ hủy khi rời component: nay hủy lúc chuyển câu/phiên và bỏ response listen về muộn. Rời tab/tài liệu cũng hủy TTS. Có thông báo khi trình duyệt không hỗ trợ TTS trong phiên.
- GET tiến độ lỗi trước đây bị nuốt và có thể hiển thị như chưa đăng ký hoặc bài đang khóa: nay báo lỗi, trang khóa có nút tải lại, không hiển thị trạng thái xem trước giả.
- Khóa các mutation đồng thời bằng ref; Enter trong ô nhập gửi câu trả lời, giữ Enter không gửi lặp; không nộp khi đang lấy trợ giúp. Session lỗi tải có nút thử lại.
- Nhãn Học tiếp dùng tên bài; phần hoàn thành không khẳng định đã nắm vững lâu dài; giai đoạn3–4 ghi rõ chưa triển khai. API client không gửi due=false vì BE chỉ nhận due=true hoặc bỏ tham số.
- Kiểm tra browser giờ bắt buộc không có pageerror và lưu kết quả vào `.tmp/toeic-browser-validation.json`.

## Kết quả thực chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `rtk npm run build` | TypeScript/Vite đạt; vẫn có cảnh báo JS bundle lớn khoảng1,25MB trước gzip |
| `rtk proxy node scripts/test-toeic-foundation-be.mjs` | Các kiểm tra hợp đồng TOEIC trong script đạt |
| `rtk npm run test:api` | 156/156 ca đạt |
| `rtk proxy node scripts/verify-toeic-foundation-browser.mjs` | 13/13 nhóm đạt, 0 pageerror |

Các kiểm tra dùng app SQLite in-memory/tài khoản test. Không gọi Gemini và không chạy vòng học tự động trên tài khoản người dùng. Sandbox chặn spawn Node/Chrome bằng EPERM; đã chạy lại các lệnh cần tiến trình con với quyền thực thi phù hợp và đạt. Đây là giới hạn môi trường kiểm tra, không phải lỗi ứng dụng.

13 nhóm browser: thẻ TOEIC và điều hướng; đăng ký khóa; lưu thiết lập; tài liệu bài1; trợ giúp; nhận xét; quay về bài; mobile390px; phân trang đủ540mục; tab từ vựng/sổ lỗi; typo bị chấm sai và giữ nhận xét sau reload; hủy audio/bỏ listen response muộn; lỗi tải tiến độ hiển thị đúng và thử lại được.

## Giới hạn nghiệm thu

Browser kiểm tra luồng chính và các lỗi tìm được, không chạy hết40bài/8checkpoint trên UI. Chưa xác nhận chất lượng giọng đọc qua loa thật hoặc kiểm từng nghĩa bằng chuyên gia giảng dạy TOEIC. Bộ kiểm thử này không chứng minh toàn web không còn lỗi; trong phạm vi đã kiểm chưa phát hiện lỗi chặn học. Chưa triển khai các giai đoạn3–4 và không suy ra điểm TOEIC từ tiến độ khóa.

Cách vào học: **Khóa học → TOEIC — Từ nền tảng → Bắt đầu khóa học → Bài1**. Đọc giải thích/từ/câu mẫu trước, sau đó làm các phần. Không cần thêm vòng giao việc Anti chỉ để ghép lại FE này.
