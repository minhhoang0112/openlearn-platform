> 05/11/2026: TOEIC nền tảng Giai đoạn 1–2: BE/nội dung 40 bài + 8 checkpoint, 540 mục từ, 120 câu song ngữ, tám hội thoại, bốn phần bắt buộc và phát âm tùy chọn; engine toeic_foundation_v1 trong schema 15. Contract 1.26.0 / 196 routes. Đọc TOEIC-FOUNDATION-API.md và TOEIC-FOUNDATION-ANTI.md. FE và test tích hợp chờ Anti; Codex chỉ kiểm cú pháp/smoke SQLite in-memory, chưa nghiệm thu browser. Không sửa FE trong đợt này.

> 03/11/2026: Khóa học A1 V2 có sidebar riêng /courses, 30 bài x 7 nhóm hoạt động, lưu nhận xét và ôn lỗi, chặn mở bài sớm ở BE. Giữ /my-program và session cũ. Đọc GUIDED-COURSES-V2.md. Contract 1.25.0 / schema15 / 181 HTTP routes.

> 02/11/2026: Chấm nghĩa đã hỗ trợ đảo danh sách nghĩa, thiếu dấu Việt được tính đúng với feedback vàng, typo khả nghi vàng nhưng không tăng mastery. Đọc VOCABULARY-GRADING.md. Metadata grading giữ qua replay, tự sửa cập nhật lại; không tự tiếp khỏi vàng. Sửa ánh xạ chiều en-vi/vi-en. 152 ca BE, 5 nhóm Chrome chấm nghĩa và build đạt.

> 02/11/2026: Đã nhập kho Anh–Việt chữ, 119.032 mục/190.480 nghĩa, SQLite 38,5 MB, không ảnh/audio. Popup và Tra từ cùng dùng kho. Đọc LOCAL-DICTIONARY.md và DICTIONARY-DATA-NOTICE.md; deploy máy mới chạy npm run dictionary:import (dữ liệu gitignore). 147 ca BE, 5 nhóm Chrome từ điển và build đạt. Không đổi schema người học.

> 02/11/2026: Học từ vựng đã chuyển sang segmented_v2; đọc VOCABULARY-LEARNING-V2.md và study-browser-qa.json. 145 ca BE, 8 nhóm Chrome từ vựng và build đạt. Xáo câu/từ, trạng thái học theo chặng, SRS không tăng giả khi luyện trước hạn, bỏ mic ô nhập, tự đọc thẻ và câu hỏi/feedback đúng thời điểm. Không reset lịch sử; schema15/175 routes giữ nguyên. Không khẳng định tương đương 100% BE OpenQuiz.

> 02/11/2026: Giao tiếp AI cải tiến song ngữ, trợ giúp theo câu, phòng cố định mic/ô nhập; dịch/nghe lại hoạt động trong Live. Contract 1.24.0/schema15/175 HTTP routes + WebSocket. Đọc COMMUNICATION-AI.md trước khi sửa. Giữ Trang chủ và logo. 140 ca BE và 13 nhóm Chrome đạt; Gemini Live hướng dẫn tiếng Việt, đọc WAV và dịch thật đạt. Chưa nghiệm thu thiết bị vật lý; text provider từng báo bận.

> 02/11/2026: Phân công AI theo tác vụ đã triển khai, contract 1.22.0. Đọc AI-ROUTING.md. Hai kết nối Gemini đã gọi thử thành công; 129 ca BE, build và kiểm tra Chrome cài đặt AI qua. Giữ Trang chủ gốc. Giao tiếp AI/voice chưa triển khai.

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
