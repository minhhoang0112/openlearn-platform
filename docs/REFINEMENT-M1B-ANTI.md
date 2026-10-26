# Mốc 1B — Hoàn tất tích hợp FE với BE 1.20.0

Codex đã kiểm tra lại FE Mốc 1A ngày 25/10/2026: build thành công; 7 nhóm trong `verify-refinement-m1.mjs` đạt; 0 page errors. Đây là xác nhận các ca đó, chưa phải nghiệm thu toàn bộ Mốc 1.

BE **1.20.0 / schema14 /156 route** đã hoàn tất phần planner/readiness/core, 118 kiểm thử BE đạt. Không đợi Mốc 2 mới nối phần này.

Đọc hợp đồng chi tiết: `PRODUCT-REFINEMENT-PLAN-API.md` và phần hoạt động/SRS trong `PRODUCT-REFINEMENT-ANTI.md`.

## A. Sửa tìm kiếm bộ từ thật sự trên toàn thư viện

Đã tái hiện với Chrome/BE thật: có 180 bộ truy cập được; API tìm `[B1 Level] School and Education` (ID13609) trả 1 kết quả, nhưng `/practice/dictation?q=...` không hiện bộ này.

Nguyên nhân: `api.getSets()` chỉ tải limit100, rồi `PracticeView` lọc và cắt tiếp trên 100 bản đó. Đây là phân trang hiển thị trên một tập con, chưa tìm toàn thư viện.

- Thêm method có query + limit + offset, trả đầy đủ `{items,total,limit,offset}`. Có thể giữ getSets cũ cho caller khác để tránh phá tương thích.
- Gửi `q` tới GET `/sets`, dùng `total` thật. Đừng coi `sets.length` của một trang là tổng thư viện.
- Có thể dùng phân trang thật 12 bộ/trang; nếu giữ Tải thêm thì fetch đúng các trang API tương ứng. Reload với page lớn phải khôi phục đúng phạm vi đã tải, không gọi limit vượt100.
- Search mới reset page; debounce và bỏ response cũ khi người dùng nhập nhanh. Rỗng, lỗi, đang tải là ba trạng thái riêng.
- Return URL từ bài luyện cần giữ cả `cat`, `scope`, `q`, `page`. Hiện selectorRoute bỏ page nên quay lại mất trang đang xem.

## B. Nối mục tiêu ngày và điều chỉnh hôm nay

Đã tái hiện: ngân sách15 phút, BE giao5/7 bước. Làm xong cursor5 thì TodayPlan completed nhưng LessonRun vẫn hiện Bước6/7 và không có nút kết thúc phần hôm nay.

- Bổ sung types và methods cho `POST /learning/today/items/:item_id/start`, `POST /learning/today/adjust` cùng các fields TodayPlan 1.20.
- Today dùng endpoint start theo plan, không chỉ gọi startLearningSession chung. Giữ daily_goal, from và content_version theo BE.
- LessonRun đạt target_cursor thì đối chiếu GET today/session và hiện **Xong phần hôm nay** / **Học tiếp bài này**. Không bắt người dùng học nốt cả bài; không giả completed toàn bài và không tự advance.
- Có nút **Điều chỉnh hôm nay** với remaining_minutes, plan_id, revision. Giữ draft/feedback khi gặp409, tải lại kế hoạch và hiển thị lý do rõ ràng.
- Khi goal hôm nay đã xong mà phiên vẫn active, Today phân biệt **Đã xong mục tiêu hôm nay** với **Tiếp tục phần còn lại (tùy chọn)**, tránh banner dở dang phủ nhận việc đã hoàn thành ngày.
- Legacy plan không có workload dùng fallback hợp đồng, không tự chế target dựa trên minutes.

## C. Nối readiness và lõi3 bước

- Trước khi mở mode trên bộ/phạm vi đã chọn, gọi `/sets/:id/readiness`; không gọi N+1 trên toàn grid.
- Thiếu ví dụ/dịch: đưa lựa chọn rõ về mode dùng từ, tự bổ sung hoặc chủ động yêu cầu AI; không đưa vào màn trống, không tự gọi AI.
- Vượt giới hạn: chọn phạm vi từ đúng max_words; không bỏ từ thiếu dữ liệu âm thầm.
- Comprehensive hiển thị tiến độ lõi bằng completed_core_steps/total_core_steps. `completed` đã mang nghĩa core_completed. Hai bước AI là Luyện thêm; giữ all_steps_completed cho thông tin đủ5 bước.

## D. Trạng thái lỗi và lịch sử hoạt động

- Progress hiện `.catch(() => null)` cho API hoạt động và fallback sang số liệu V2 dưới nhãn toàn hệ thống. Khi API hoạt động lỗi, hiển thị **Chưa tải được hoạt động toàn hệ thống** + thử lại; không dùng số khác phạm vi hoặc0 thay cho kết quả chưa tải.
- Tab Hoạt động dùng total/limit/offset thật để xem quá50 hoạt động; thay bộ lọc ngày phải hủy/bỏ response cũ, không trộn cửa sổ thời gian.
- Giữ riêng các chỉ số kỹ năng V2; không biến số lượt hoạt động thành kỹ năng/CEFR/phát âm.

## E. Nghiệm thu cần thêm

1. Tìm bộ ngoài100 bản đầu vẫn thấy; tải thêm/trang sau đúng total; đi học rồi Back/reload giữ q/page/scope.
2. Bài20 phút, mục tiêu15 phút: xong5 bước thì có đường kết thúc ngày; học tiếp vẫn giữ cùng phiên.
3. Điều chỉnh lúc còn draft/feedback; reload; stale revision409 và đổi ngày: không mất bài đã nhập.
4. Bộ không có AI hoàn thành lõi3 bước, hai bước AI vẫn chưa completed.
5. Thiếu ví dụ/dịch, empty set, quá giới hạn phạm vi, API503/429, activity lỗi: thông báo đúng và có đường tiếp tục.
6. Kiểm tra360/390/768/1440px trên các trạng thái mới, không chỉ kiểm CSS class hoặc sự tồn tại nhãn.

Giữ phạm vi FE/src và scripts kiểm FE. Ghi kết quả Mốc1B vào `FE-REFINEMENT-STATUS.md` (không xóa báo cáo1A). Không sửa BE/DB/.env hoặc tài liệu Codex giữ.

Chưa làm Mốc2 (rút sidebar, đổi trang đích/logo, đưa Home vào Khám phá) và chưa làm Mốc3 (mở rộng/biên tập giáo trình).

Bằng chứng tái hiện hai thiếu sót: `docs/refinement-integration-gaps.json`, script `scripts/audit-refinement-integration-gaps.mjs`. Đây là script audit ghi nhận hiện trạng, không phải test pass khi hai thiếu sót đã được sửa; cần bổ sung assertion nghiệm thu thực sự trong suite FE.
