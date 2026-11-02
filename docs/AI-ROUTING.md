# Phân công Gemini theo tác vụ

Ngày 02/11/2026. Contract 1.22.0; không đổi schema database.

| Công việc | Kết nối | Model hiện tại |
| --- | --- | --- |
| Ví dụ từ, dịch, gợi ý, câu hỏi nói | GEMINI_SECONDARY_API_KEY | GEMINI_FAST_MODEL: gemini-3.5-flash-lite |
| Hội thoại, ngữ pháp, đọc hiểu, tạo thẻ | GEMINI_API_KEY | GEMINI_MODEL: gemini-3.5-flash |
| Nhận xét bài nói/viết | GEMINI_API_KEY | GEMINI_FEEDBACK_MODEL, mặc định model chính |
| Nhận xét ghi âm | GEMINI_API_KEY | GEMINI_AUDIO_MODEL, mặc định model chính |

Hai key đã được kiểm tra riêng bằng câu mẫu cố định: model chính và model nhẹ 3.5-flash-lite trên key phụ đều tạo nội dung thành công. Không gửi dữ liệu người học. Phép thử thành công không xác nhận quota còn lại hay trạng thái tính phí; xem các thông tin đó trong Google AI Studio của từng project. Model 2.5-flash-lite từng được liệt kê nhưng gọi tạo nội dung thất bại nên không dùng.

## Cách vận hành

- .env chỉ được đọc khi BE khởi động; đổi biến cần khởi động lại BE. Không ghi key vào repo hoặc báo cáo.
- Phân công cố định theo tác vụ. Thiếu key phụ thì tác vụ nhẹ dùng key chính. Không tự đổi project/model khi gặp 429.
- Mỗi credential xử lý một yêu cầu tại một thời điểm; hai credential khác nhau xử lý song song. Tối đa 20 yêu cầu chờ, quá 20 giây chờ thì báo lỗi.
- 429 tạm nghỉ theo nhà cung cấp, mặc định 60 giây. Kết nối khác vẫn phục vụ những tác vụ được phân công cho nó.
- Các yêu cầu giống hệt đang chạy của cùng người học chỉ gọi một lần. Cache không dùng chung giữa người học.
- Bản dịch giống hệt được cache RAM 5 phút, tối đa 500 mục. Ví dụ và bản dịch đã lưu vẫn dùng database hiện có. Các bài yêu cầu tạo mới không bị cache tùy tiện.
- Retry quá tải 503 giữ nguyên key/model và giới hạn thời gian chung. Ollama/gateway giữ đường xử lý hiện có.

## Cài đặt và FE

GET /settings/ai bổ sung routing: task, model, connection, configured, waiting, running, cooldown_seconds. Không trả key. configured nghĩa là có cấu hình, không xác nhận quota.

Cấu hình riêng của tài khoản tiếp tục được ưu tiên. Trong Cài đặt AI, bấm **Dùng phân công AI chung** để xóa override của chính tài khoản qua DELETE /settings/ai. Lưu model riêng sẽ dùng model đó cho mọi tác vụ của tài khoản.

AiSettingsView đã có phần hiển thị phân công và nút chuyển về cấu hình chung. Anti không cần làm thêm để sử dụng bản này. Giữ Trang chủ / và Học hôm nay /today hiện tại. Giao tiếp AI/voice mới chỉ có thiết kế tại COMMUNICATION-AI-DESIGN.md, chưa triển khai.

## Kiểm chứng

- Toàn bộ 129 ca BE đạt, gồm 6 ca mới cho routing, queue, dedup/cache, cô lập người học và cooldown.
- Build TypeScript/Vite đạt; còn cảnh báo bundle hơn 500 KB.
- scripts/verify-ai-routing-browser.mjs: hiển thị kết nối/model, không lộ key, lưu override, trở về cấu hình chung, reload, 4 viewport 360/390/768/1440; không lỗi trang. Dùng provider giả và database tạm.
- scripts/check-ai-routing-providers.mjs --generate: phép thử mạng thật có tính lượt API. Báo cáo JSON chỉ chứa trạng thái; mỗi lần chạy ghi đè báo cáo, không chứa key hay nội dung người học.
