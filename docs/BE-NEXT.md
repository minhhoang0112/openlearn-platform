# CLARITY-02 — Học kết hợp và trải nghiệm thống nhất

**Contract1.17.0 / schema14 /151 route.** Đọc [LEARNING-CONSISTENCY-ANTI.md](LEARNING-CONSISTENCY-ANTI.md). Yêu cầu người dùng mới thay thế phần P1 còn thiếu rõ của CLARITY-01: đồng bộ runner Học kết hợp, tiến độ tất cả bộ, synonym click đọc+chi tiết từng mục, ví dụ/dịch gọn, sidebar/breadcrumb/back giữ nguồn.

BE đã có tiến độ SetCard.progress và lesson word/step counts, comprehensive start resume/restart, whole-term completion evidence, GET /dictionary/entry và POST /exercise-attempts/:id/translation cached/explicit AI.41 ví dụ prepared và20 mục từ điển prepared, không giả là đầy đủ toàn kho. Không thay nội dung/note người dùng bằng dữ liệu đoán.

Anti làm theo mục B→C→D/E→F và các ca nghiệm thu G của hợp đồng; chỉ sửa src/test FE, không sửa server/.env/DB/BE-NEXT/BE-WORKLOG. Đừng báo xong chỉ từ build. Cần demo học dở/reload,2bộ có tiến độ khác nhau,3synonym tách riêng đọc đúng,back từ nhiều nguồn,missing translation và429.

Kiểm BE:102 toàn suite đạt trước bổ sung16 ví dụ; sau bổ sung ngân hàng và test cache translation,16 test liên quan chạy lại đạt. Build qua. FE CLARITY-02 chưa triển khai/nghiệm thu; không coi ảnh cũ là đã sửa.
