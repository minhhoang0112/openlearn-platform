# Tiến bộ và lịch sử — API sẵn sàng cho Anti (FE-04)

> Bổ sung1.6.1: có bài đọc hiểu trong foundation-routine-01. reading lấy dữ liệu từ bước reading_comprehension đã nộp; chưa làm hoặc ngoài khoảng ngày thì not_assessed. Đổi nhãn FE thành 'Chưa có lượt đọc được chấm trong khoảng này', không gắn cứng 'chưa có bài đọc'. Các câu mô tả phạm vi ở limitations nay trả tiếng Việt.

21/10/2026. Contract **1.6.0**, schema **8**,119 route. Ba API mới chỉ đọc dữ liệu, không migration, không gọi AI, không thay màn học hoặc Sổ lỗi. [STATUS](UPGRADE-V2-STATUS.md) là nơi xác nhận tích hợp FE.

## Màn hình đề xuất

`/progress` gồm tổng quan và tab lịch sử. Hiển thị hoàn thành bài, hoạt động gần đây, bài đang dở, kết quả câu đã chấm và số nhiệm vụ tự luyện. Không thêm nhiều mục sidebar. Không vẽ điểm bốn kỹ năng/radar nếu chưa có đánh giá.

## 1. GET /api/v1/learning/progress?days=30

days nhận số nguyên1..90, mặc định30. Data:

| Trường | Ý nghĩa |
| --- | --- |
| scope | learning_v2; chưa tổng hợp mọi màn học cũ |
| timezone,generated_at,window | Múi giờ hồ sơ hiện tại, thời điểm tổng hợp, days/from_local_date/to_local_date |
| lifetime | sessions_started, active_sessions, completed_sessions, unique_lessons_completed; toàn lịch sử V2 |
| programs | id/title/kind/status, published_lessons, completed_lessons, completion_percent |
| skills | Số liệu thực hành theo nhóm, mô tả bên dưới |
| window_activity | lesson_submissions,mistake_reviews,active_days trong khoảng ngày |
| daily_activity | Mỗi ngày địa phương có date,lesson_submissions,mistake_reviews; có cả ngày 0 lượt |
| review_practice | submitted,correct,unassisted_correct của ôn Sổ lỗi trong khoảng ngày |
| mistakes | Tổng hiện tại của Sổ lỗi: total,active_count,resolved_count,due_count,route |
| limitations | Giới hạn phải giữ đúng khi trình bày |

Ngày được tính theo timezone profile hiện tại; đổi timezone có thể thay cách gom ngày trong biểu đồ. Khoảng ngày bao gồm hôm nay. Chỉ tính submission/review thật, không tính mở màn hình là một ngày đã luyện. Một câu nộp lại với cùng submission_id không tạo sự kiện thứ hai.

Lifetime và programs không bị cắt theo days. Học lại hai lượt: completed_sessions có thể 2, unique_lessons_completed chỉ 1. Programs tính bài published phiên bản mới nhất; hoàn thành bản cũ không tự hoàn thành bản mới. completion_percent là độ bao phủ **bài đã hoàn tất**, không phải mức thành thạo; null nếu chưa có bài published.

### Skills

Các key: listening,grammar,vocabulary,pronunciation,speaking,writing,reading. Mỗi mục có label và:

- submitted_tasks: số lượt nộp gắn nhóm đó; học lại tăng số lượt.
- distinct_tasks: số nhiệm vụ khác nhau theo bài+version+bước, không tăng do học lại cùng nhiệm vụ.
- graded_tasks/correct: số câu có BE chấm và số đúng.
- unassisted_graded/unassisted_correct; assisted_graded/assisted_correct: tách điều kiện hỗ trợ theo feedback đã lưu.
- unknown_support: dữ liệu chấm cũ không ghi assistance_used; không tự coi là không hỗ trợ.
- self_review_tasks: hoạt động tự luyện/tự kiểm tra, không phải câu được AI/giáo viên xác nhận đúng.
- accuracy_percent,unassisted_accuracy_percent: tỷ lệ trên chính các câu đã làm trong khoảng ngày, null nếu chưa có mẫu. Không biến null thành0%.
- evidence_status: graded_practice/self_review_only/not_assessed, last_practised_at hoặc null.

Nhãn FE nên là 'Đúng X/Y câu đã chấm', 'Tự luyện X lượt' hoặc 'Chưa đánh giá'. Hiện V2 chưa có bài đọc hiểu chấm riêng nên reading: not_assessed, không kết luận người học đọc kém. Speaking/writing/pronunciation chưa có AI chấm trong V2, không suy điểm từ text/acknowledgement. Vocabulary acknowledgement không chứng minh thuộc từ. Mở reflection được tính là submission thực trong hoạt động ngày, nhưng không gán reflection vào một kỹ năng.

Ôn Sổ lỗi có thống kê riêng; không cộng review vào accuracy của bài gốc rồi làm người học tưởng đã trả lời đúng ngay lần đầu. Chưa đo study_minutes, CEFR, chứng chỉ hoặc kỹ năng ngoại ngữ tổng thể. Không tự thêm các số đó trên FE.

## 2. GET /api/v1/learning/history

Query: statusall/active/completed (mặc địnhall), program_id tùy chọn, limit1..100 mặc định20, offset≥0. Program không tồn tại trả404, bộ lọc sai400.

Data `{items,total,limit,offset}`; mỗi item có id,lesson_id,content_version,program_id,title,status,completed_steps,total_steps,submitted_steps,route,created_at,updated_at,completed_at.

Nút Tiếp tục mở route `/lesson-run/:id`. submitted_steps là đã nộp, completed_steps là đã bấm tiếp sau phản hồi; hai số có thể khác nhau. Không tự đánh dấu xong bài vì submitted_steps bằng total_steps. Lịch sử phiên bản cũ vẫn tồn tại dù giáo trình xuất bản bản mới.

## 3. GET /api/v1/learning/sessions/:id/evidence

Xem bài đã nộp: data `{session_id,lesson_id,content_version,items}`. Mỗi item có step_id,type,title,prompt,options(array|null),response,feedback,submitted_at.

Response là bản người học thực sự nộp, gồm text bài viết/bản chép lời hoặc lựa chọn/xác nhận theo loại bước. Feedback là kết quả đã lưu, có thể có đáp án của **câu đã chấm**. Không tự sửa bản gốc thành câu mẫu/AI rewrite. Chưa nộp gì thì items rỗng; không trả đáp án câu tương lai. Không có file ghi âm local được lưu BE, nên đừng dựng nút phát lại bản ghi âm từ response này.

Màn lịch sử có thể mở chi tiết bài đã nộp bằng endpoint này mà không phải tạo session mới. Không cần nộp lại hoặc advance để xem. Mọi API yêu cầu cookie; evidence của tài khoản khác trả404. Không đưa text riêng của người học vào log hoặc public page.

## Tích hợp và kiểm tra

Giữ loading/empty/retry. Không dùng dữ liệu mẫu khi API lỗi. Kiểm tra người mới: counts0, accuracy null, chưa đánh giá; có bài học lại: số lượt tăng nhưng số nhiệm vụ/bài khác nhau không tăng; bài viết vẫn đọc lại sau reload; tài khoản khác không xem được.

BE đã chạy3 kiểm thử mới (rỗng/quyền; tổng hợp ngày và hỗ trợ/học lại; history/evidence/version) và10 kiểm thử hồi quy học/sổ lỗi, đều đạt. Đây là13 kiểm thử liên quan, không phải chạy lại toàn bộ suite. Chưa xác nhận FE-04 tích hợp. FE-03 Sổ lỗi vẫn theo [hợp đồng riêng](UPGRADE-V2-MISTAKES.md), không cần chờ màn Tiến bộ để hoàn tất.
# Cập nhật contract 1.9.0

Response GET /learning/progress thêm `listening_practice` tổng toàn thời gian từ phiên nghe từng câu, độc lập với query days. Số lượt tự khai báo và bỏ qua tách riêng; không đưa vào listening_accuracy của câu hỏi được chấm. Chi tiết [UPGRADE-V2-LISTENING.md](UPGRADE-V2-LISTENING.md). Các field cũ giữ nguyên.

