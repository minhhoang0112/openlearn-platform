> **Trạng thái hiện tại 26/10/2026:** người dùng yêu cầu khôi phục Trang chủ gốc. `/` và logo mở DashboardView; menu có Trang chủ; `/today` là mục riêng; `/explore` còn để tương thích. Đọc HOME-RESTORED.md và REFINEMENT-REGRESSION-2026-10-26.md. Kiểm lại 123 ca BE, build và 27 nhóm kiểm tra Chrome đạt. Các chỉ dẫn cũ bên dưới về Today làm cửa vào đã được thay thế, không áp dụng lại.

> Mốc3 đợt1 đã dùng được: contract1.21/schema14/157route. Đọc REFINEMENT-M3-SUPPORT-API.md.4bài nền tảng đầu có25từ/cụm,ghi chú ngữ pháp,lỗi thường gặp,mẫu nói/viết có dịch;Codex đã nối LessonSupportPanel trực tiếp.123ca BE qua,buildqua,7nhóm browser/4viewport qua,0POST tạoAI. Giữ phiên/version/draft/progress cũ; chưa mở rộng hết18bài.

> 26/10 — Mốc2 đã kiểm: build qua;6nhóm M2/4viewport và4daily-goal guards qua. Codex sửa Auth giữ deep link cófrom, thẻ Khám phá ởToday đi/explore và nhãn/thời lượngmobile;5ca auth/context qua sau sửa. Giữ các sửa trong AuthView,postAuthNavigation,TodayView. Bước tiếp theo: REFINEMENT-M3-CONTENT-PLAN.md; chưa cóAPI/nội dungM3 sẵn sàng, Anti chưa cần sửa thêmbố cục.

> 26/10: đã kiểm lại Mốc1B: build qua,6 nhóm browser/4viewport qua. Codex bổ sung xác nhận mục tiêu từ BE và bỏ fallback mở nhầm bài khi start kế hoạch lỗi;4 ca daily-goal-guards qua, hồi quy1B qua lại. Chuyển FE sang REFINEMENT-M2-ANTI.md (5mục điều hướng, Today làm cửa vào, Explore thuộc Thư viện). Giữ contract1.20/schema14/156route, chưa cần BE mới.

> Kiểm lại FE sau bàn giao: build đã qua,7 nhóm browser1A qua. Chuyển sang REFINEMENT-M1B-ANTI.md để nối BE1.20; chưa chốt Mốc1. Đã tái hiện tìm không thấy bộ ngoài100 và chưa có nút kết thúc mục tiêu ngày5/7 bước. Không cần BE mới cho các API này.

> Mới nhất: BE contract 1.20.0 / schema14 /156 route. Phần BE của Mốc 1 đã có planner chia mục tiêu theo thời gian, adjust revision, start pinned session, readiness và core 3 bước không AI. Anti đọc PRODUCT-REFINEMENT-PLAN-API.md cùng PRODUCT-REFINEMENT-ANTI.md. Kiểm118 ca BE qua. Build FE lần gần nhất báo JSX tại ListeningLibraryView.tsx:437 (đoạn onClick bị thừa sau khối render); cần Anti kiểm tra và build lại trước nghiệm thu tích hợp.

> Mốc chỉnh UX 1 đang triển khai: BE contract 1.19.0/schema14. SRS due_v1 và GET /learning/activity đã sẵn sàng. Anti đọc PRODUCT-REFINEMENT-ANTI.md, ghi FE vào FE-REFINEMENT-STATUS.md riêng. Chưa hoàn tất planner/readiness hoặc toàn bộ mốc 1.

> Mới nhất: contract1.18.0/schema14/152route. DICT-01 đã nối trực tiếp BE + utility/modal Tra từ, đọc DICTIONARY-ONLINE.md. Không revert về tìm LIKE. CLARITY-02 bên dưới vẫn là việc FE cần hoàn tất.

# CLARITY-02 — Học kết hợp và trải nghiệm thống nhất

**Contract1.17.0 / schema14 /151 route.** Đọc [LEARNING-CONSISTENCY-ANTI.md](LEARNING-CONSISTENCY-ANTI.md). Yêu cầu người dùng mới thay thế phần P1 còn thiếu rõ của CLARITY-01: đồng bộ runner Học kết hợp, tiến độ tất cả bộ, synonym click đọc+chi tiết từng mục, ví dụ/dịch gọn, sidebar/breadcrumb/back giữ nguồn.

BE đã có tiến độ SetCard.progress và lesson word/step counts, comprehensive start resume/restart, whole-term completion evidence, GET /dictionary/entry và POST /exercise-attempts/:id/translation cached/explicit AI.41 ví dụ prepared và20 mục từ điển prepared, không giả là đầy đủ toàn kho. Không thay nội dung/note người dùng bằng dữ liệu đoán.

Anti làm theo mục B→C→D/E→F và các ca nghiệm thu G của hợp đồng; chỉ sửa src/test FE, không sửa server/.env/DB/BE-NEXT/BE-WORKLOG. Đừng báo xong chỉ từ build. Cần demo học dở/reload,2bộ có tiến độ khác nhau,3synonym tách riêng đọc đúng,back từ nhiều nguồn,missing translation và429.

Kiểm BE:102 toàn suite đạt trước bổ sung16 ví dụ; sau bổ sung ngân hàng và test cache translation,16 test liên quan chạy lại đạt. Build qua. FE CLARITY-02 chưa triển khai/nghiệm thu; không coi ảnh cũ là đã sửa.
