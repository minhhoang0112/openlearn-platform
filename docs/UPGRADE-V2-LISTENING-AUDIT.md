# INT-LISTEN-02 — kết quả rà tích hợp nghe

> Sau sửa của Anti: Codex đã build và kiểm Chrome 12 ca, gồm checkbox false và lost-response retry giữ UUID. Xem UPGRADE-V2-CONTENT-04.md để biết nghiệm thu mới và điểm cleanup ObjectURL còn lại. Checklist phía dưới là phát hiện ban đầu, không phải tất cả vẫn chưa sửa.

21/10/2026, contract **1.9.2**, schema **10**, **128 route**. Không đổi schema hoặc nội dung; giữ 12 học liệu/68 clip.

## BE đã sửa và kiểm chứng

- `GET /learning/listening/sessions` trước đây chỉ có id/title/status/thời gian. FE đang đọc `sess.settings.mode`, gây lỗi khi mở tab lịch sử có dữ liệu. API nay bổ sung `settings`, `cursor`, `summary`, `created_at` cho từng item. Summary giống session detail: practised_sentences, skipped_sentences, repetitions_self_reported, mastered false, pronunciation_assessed false. Không trả state JSON, transcript bài nộp hoặc clip qua history. Các field cũ giữ nguyên.
- `progress.listening_practice.last_practised_at` nay lấy timestamp của event tự luyện gần nhất; tạo phiên và bỏ qua không cập nhật thời điểm này. Nếu chỉ bỏ qua thì null. Dữ liệu sự kiện cũ đủ để tính lại, không backfill hoặc sửa DB.
- Tám test nghe/progress đạt. Có tái hiện hai lỗi bằng test thất bại trước sửa, sau sửa đều đạt. Không chạy lại toàn suite vì thay đổi chỉ nằm ở service nghe; 64 test toàn BE ở CONTENT-03 là kết quả lượt trước.
- Build FE thành công. Kiểm Chrome thật trên bản build + BE + DB tạm: **11 kiểm tra tích hợp đạt**, không pageerror hoặc BE500. Có kiểm WAV decode, nộp một câu đúng số lượt, skip riêng, tab lịch sử với summary thật, resume từ lịch sử và reload đúng câu thứ ba. Báo cáo `v2-browser-listening-audit.json`, ảnh `anti-reference/local-v2-listening-history.png`. Không gọi AI hoặc dùng dữ liệu tài khoản thật.

## Anti nhận FE-LISTEN-02 — còn phải sửa

Không xem các kiểm tra tích hợp đạt là đã nghiệm thu toàn bộ tương tác. Codex không sửa src/** để tránh ghi đè Anti.

1. **Tự xác nhận phải là thao tác thật.** ListeningPracticeView đang khởi tạo và reset selfReviewed=true ở fetchSession và sau complete. Chrome xác nhận checkbox đã được tích sẵn. Đổi về false cho mỗi câu mới và sau reload; chỉ cho lưu khi người học tích. Giá trị repetitions là số người học tự khai báo, không suy ra từ phát audio; giữ nhãn này rõ ràng.
2. **Retry sau mất phản hồi phải giữ request.** handleCompleteSentence đang tạo crypto.randomUUID() mỗi lần bấm. Giữ pending request gồm session id, sentence id, payload/UUID khi chưa biết server đã lưu hay chưa. Retry cùng payload/UUID tới đúng sentence id cũ; BE trả replayed và session hiện tại. Chỉ tạo UUID mới khi hành động mới; khi 409 revision thì GET đồng bộ, không tự nộp cho câu khác. Không tự gửi lại khi người học chưa yêu cầu.
3. **Chặn chuyển câu khi đang thu âm.** Hiện nút hoàn tất/skip có thể chạy lúc recorder còn active. Hoặc disable chúng lúc đang thu, hoặc dừng recorder/stream hoàn toàn trước khi đổi câu. Dọn object URL khi đổi câu/rời màn; xử lý trường hợp getUserMedia hoàn tất sau khi component đã unmount, tránh giữ micro mở. Bắt lỗi tạo MediaRecorder cũng phải stop tracks của stream đã cấp. Micro thực tế chưa được nghiệm thu.
4. **Báo lỗi audio.** audio.play().catch hiện đang bỏ qua lỗi. Thêm lỗi phát/tải có retry và không thể hiện đang phát thành công khi play bị reject. onError cũng cần xử lý. Mất quyền micro không được làm mất khả năng nghe.
5. **Phím Ctrl riêng.** Reset cờ ctrlPressedAlone khi keydown Control lần đầu; hiện cờ có thể bị false do lần gõ phím trước đó và Ctrl đầu tiên không làm gì. Giữ tổ hợp Ctrl+C/V/A, input/contenteditable và lúc ghi âm hoạt động bình thường.
6. **Type history riêng.** API getListeningSessions đang khai items là ListeningSession[] nhưng history không có current/track/results/revision/total_sentences. Dùng ListeningSessionHistoryItem với đúng field được trả, không ép kiểu thành session đầy đủ. Màn hiện tại dùng settings/summary đã được BE bổ sung.

Kiểm FE bắt buộc: checkbox false ở câu đầu/câu mới/reload; chặn lưu trước xác nhận; mô phỏng server đã lưu nhưng mất response rồi retry không cộng hai lần; thu âm rồi thoát/skip không còn live track; giả lỗi play có retry; history có phiên listen_repeat và shadowing với số lượt đúng; Ctrl riêng sau khi nhập chữ và Ctrl+C không gây phát ngoài ý muốn. Ghi kết quả vào STATUS bằng dòng FE-LISTEN-02, không tự đánh dấu BE/FE toàn bộ hoàn tất.
