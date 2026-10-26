# Điều hướng Luyện tập — 25/10/2026

Đã triển khai trực tiếp trong frontend. Anti giữ nguyên luồng này khi chỉnh giao diện.

- `/practice?cat=...`: chỉ chọn chế độ, không hiển thị danh sách bộ từ bên dưới.
- `/practice/:modeId?cat=...&scope=library|due|all|mastered`: trang riêng chọn bộ từ/phạm vi cho đúng chế độ đã chọn. Không cuộn xuống Bước 2.
- Chọn bộ từ mở bài luyện hiện có; `source=practice` và `from` chứa đầy đủ URL trang chọn bộ từ. Giữ nguyên `word_ids`, `review_scope`, `study_mode`, `direction` của các engine.
- Nút **Trở về chọn bộ từ** trong bài luyện trả lại đúng chế độ/phạm vi. Nút **Trở về chọn chế độ** trả lại bộ lọc nhóm kỹ năng. Trang chọn chế độ có nút **Trở về Trang chủ**.
- Liên kết cũ `/practice?mode=...` vẫn mở trang riêng chọn bộ từ. Chế độ không tồn tại hiển thị thông báo và nút trở về.
- Thư viện nghe có nút về Luyện tập; tab danh mục/lịch sử lưu vào `tab` trong URL. Thoát phiên nghe trở lại đúng tab.
- Học liệu cá nhân có nút về nơi mở nó (Luyện tập hoặc Thư viện nghe). Mở/nhập học liệu rồi quay lại giữ nguyên chuỗi trang cha.

Không thay đổi API hoặc schema. Không dùng API AI để kiểm tra luồng này.

Kiểm chứng: `npm run build` và `node scripts/verify-practice-navigation-browser.mjs`. Kết quả chi tiết tại `docs/practice-navigation-validation.json`; dữ liệu kiểm tra nằm trong SQLite bộ nhớ, độc lập dữ liệu cá nhân.
