# Kiểm tra hồi quy FE và BE — 26/10/2026

Phạm vi: các thay đổi chỉnh trải nghiệm học, hỗ trợ bốn bài nền tảng đầu và khôi phục Trang chủ. Các kiểm tra trình duyệt dùng bản build production, tài khoản thử và database bộ nhớ; không thao tác dữ liệu học thật.

## Lỗi phát hiện và đã sửa

- Tìm kiếm trang chủ còn giữ nội dung khi bấm logo về `/`. Đã tái hiện bằng Chrome trước khi sửa; bộ kiểm tra thất bại đúng tại trạng thái ô tìm kiếm không được xóa.
- Một lần tìm kiếm gọi API từ cả submit và effect URL. Đã chuyển việc tải sang effect duy nhất, bỏ phản hồi đến muộn sau đổi URL và đồng bộ nhãn kết quả với truy vấn đã gửi.
- Đăng nhập từ `/?q=...` làm mất truy vấn. Đã giữ URL gốc khi không có đích chuyển hướng riêng.
- Nhãn quay về của lộ trình có thể ghi Thư viện/Học hôm nay trong khi đích thật là Trang chủ. Đã đồng bộ nhãn với nguồn.
- Lộ trình → bộ từ → lộ trình làm mất nguồn ban đầu. Đã giữ nguyên URL lộ trình gồm query và ngữ cảnh; sidebar phân biệt nguồn Trang chủ.
- Trang danh mục mở từ Trang chủ có thể tô sáng Thư viện. Đã dùng ngữ cảnh nguồn cho sidebar.

Trang chủ gốc tiếp tục nằm ở `/`, logo dẫn về `/`, menu có Trang chủ trên máy tính/điện thoại. Học hôm nay vẫn là `/today`. Không thay đổi logic BE hoặc dữ liệu cá nhân trong lần rà soát này.

## Kết quả

- BE: `node --test --test-isolation=none --test-reporter=dot server/tests/*.test.mjs` — 123 ca đạt, exit 0. Bao gồm SRS, kế hoạch ngày, readiness, quyền truy cập, draft/revision, hỗ trợ bài học và các chức năng hiện có.
- `npm run build` — TypeScript và Vite đạt. Còn cảnh báo bundle JavaScript trên 500 KB; không phải lỗi build.
- `verify-auth-context-browser.mjs` — 10 nhóm đạt: đăng nhập giữ liên kết/truy vấn, logo/menu, tìm kiếm gọi một lần, quay về bộ từ và lộ trình, tương thích `/explore`, không tràn ngang ở 360/390/768/1440 px.
- `verify-daily-goal-guards-browser.mjs` — 4 nhóm đạt: không mở bài khác khi start thất bại, không tin target giả, xác nhận mục tiêu bằng server.
- `verify-foundation-support-browser.mjs` — 7 nhóm đạt: nội dung song ngữ, cache khi mở lại, ghi trợ giúp đúng, giữ draft sau reload, bốn bài được hỗ trợ, bốn viewport, bài ngoài phạm vi không nhận nhầm nội dung; 0 POST tạo AI.
- `verify-refinement-m1b.mjs` — 6 nhóm đạt: tìm bộ ngoài 100, mục tiêu ngày, điều chỉnh kế hoạch, readiness, ba bước lõi không AI, lỗi activity và thử lại; bốn viewport đạt.
- Các bộ kiểm tra Chrome trên không ghi nhận page error.

## Giới hạn

Chưa phát hiện lỗi nghiêm trọng trong phạm vi kiểm tra trên; không coi đây là bảo đảm mọi màn hình đều hoàn hảo. Chưa thử quota/chất lượng Gemini trực tiếp, chưa nghiệm thu giọng đọc bằng tai người. Gói kiến thức hỗ trợ chỉ có cho bốn bài nền tảng đầu, đúng phiên bản đã biên soạn.

Anti đọc bản này và HOME-RESTORED.md; không áp dụng lại chỉ dẫn cũ chuyển Trang chủ thành Học hôm nay. Chưa cần triển khai thêm tính năng trong đợt kiểm tra này.
