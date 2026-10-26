# Khôi phục Trang chủ

Theo yêu cầu của người dùng ngày 2026-10-26:

- `/` hiển thị DashboardView (trang chủ ban đầu), không chuyển sang Học hôm nay.
- Logo desktop/mobile và mục Trang chủ trong menu dẫn về `/`.
- Đăng nhập từ trang gốc mặc định về `/`; liên kết bài học cụ thể vẫn được giữ nguyên.
- `/today` giữ riêng chức năng Học hôm nay; `/explore` vẫn mở được trang cũ để tương thích liên kết đã lưu.
- Ngữ cảnh và nút quay về từ trang chủ ghi Trang chủ, không ghi Học hôm nay.

Anti: giữ cấu trúc này, không tự chuyển trang chủ thành trang Học hôm nay hoặc giấu mục Trang chủ.
