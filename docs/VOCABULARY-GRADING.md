# Chấm nghĩa và nhận xét cách viết — 02/11/2026

`server/vocabulary-grading.mjs` chấm ở BE; UI không tự quyết định đúng/sai. Không dùng AI cho việc so sánh này. Không đổi schema SQLite hay tính lại lịch sử đã chấm.

## Quy tắc

- Đáp án chính xác hoặc một nghĩa thay thế được lưu: đúng. Bỏ qua hoa/thường, khoảng trắng thừa và dấu kết thúc câu.
- Danh sách các nghĩa, phân cách bằng dấu phẩy/chấm phẩy: không xét thứ tự; mỗi nghĩa người học đưa ra đều phải nằm trong tập chấp nhận. Không chấp nhận câu chứa một nghĩa đúng rồi thêm nghĩa sai. Không xáo thứ tự các từ bên trong một cụm nghĩa.
- Thiếu dấu khi trả lời nghĩa tiếng Việt: chấp nhận đúng nhưng `verdict: close`, `reason: missing_vietnamese_marks`; UI vàng, nhắc xem cách viết chuẩn. Cho phép thiếu một phần hoặc toàn bộ dấu, gồm đ → d. Không tự chấp nhận khi dấu đã nhập mâu thuẫn dấu cần có: nghỉ không tự thành nghĩ. Ngôn ngữ đáp án được BE lấy từ ngôn ngữ của bộ và chiều hỏi; không áp quy tắc dấu Việt cho mọi ngôn ngữ.
- Một lỗi gõ ký tự/thừa/thiếu/đảo hai ký tự liền kề ở đáp án dài 5–80 ký tự có thể nhận `close`, `reason: possible_typo`, nhưng **correct=false**, không tăng đã thuộc hay điểm, vẫn phải ôn lại. Không suy luận đồng nghĩa chỉ từ độ giống chữ.
- Không tự bỏ từ phủ định, nhận mảnh từ hoặc nhận nghĩa chưa có trong các đáp án/synonym được cho phép. Chưa có bộ chấm ngữ nghĩa mở hay đánh giá bằng AI.
- Trắc nghiệm dựa trên option ID; ghép thẻ và nghe chép giữ quy tắc riêng. Nghe chép không dùng cơ chế nới dấu/nghĩa để làm mất mục tiêu luyện chính tả.

Ví dụ expected `nộp đơn, áp dụng`: `áp dụng; nộp đơn` đúng xanh; `ap dung, nop don` đúng vàng; `áp dụng, quả táo` sai. Expected English `apply`: `aply` gần đúng vàng nhưng chưa được tính đúng.

## Trạng thái và tiến độ

API chấm trả thêm `verdict`, `reason`, `message`; `correct` vẫn là nguồn quyết định tiến độ/SRS/điểm. Vàng do thiếu dấu Việt được tính đúng; vàng do lỗi gõ khả nghi không được tính đúng. UI nói rõ hai trường hợp, không tự chuyển qua feedback vàng ngay cả khi bật tự tiếp để người học có thời gian đối chiếu.

Phân loại lưu trong state.grading của phiên, cùng giao dịch với study_answers và progress. Gửi lại cùng question_id trả phân loại đã lưu, không chấm lại/nhân điểm. Tự sửa thành sai thay phân loại cũ và sửa SRS/thưởng/hàng đợi bằng cơ chế snapshot hiện có. Nộp bài kiểm tra và replay cùng dùng bộ chấm này. Các câu đã chấm trước khi có grading metadata giữ kết quả cũ.

Đã sửa ánh xạ query mở bài `direction=en-vi` / `vi-en` sang `term_to_definition` / `definition_to_term` trước khi gửi BE; tránh gửi tên chiều UI không hợp lệ.

## Kiểm chứng

152 ca BE toàn bộ đạt. Năm ca mới kiểm tra đảo nghĩa, thiếu dấu, dấu mâu thuẫn, nghĩa thêm sai/phủ định, typo tiếng Anh, nghe chép, tiến độ, replay, tự sửa/thu hồi thưởng và replay bài kiểm tra. Chrome 5 nhóm đạt, có xác nhận feedback vàng vẫn hiện khi bật tự tiếp và đúng/sai tác động đến mastery đúng như thông báo. Build đạt, còn cảnh báo bundle lớn đã có.

Test: `server/tests/vocabulary-grading.test.mjs`; UI: `scripts/verify-vocabulary-grading-browser.mjs`; báo cáo: `vocabulary-grading-browser-validation.json`.
