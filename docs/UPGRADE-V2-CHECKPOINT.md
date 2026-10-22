# Nội dung chặng đầu và kết quả ôn — bàn giao Anti

21/10/2026. Contract **1.7.0**, schema8,119route; không thêm endpoint hoặc sửa FE. Tổng hiện có **9 mục học**: foundation8 (7 bài +1 bài ôn), system1. Đây là cụm nội dung đầu, chưa phải toàn bộ24bài trong kế hoạch.

## Nội dung mới đã có audio

| lesson_id | Tên | Bước |
| --- | --- | --- |
| foundation-people-things-01 | Người, đồ vật và tính từ | 7 |
| foundation-places-01 | Hỏi vị trí và mô tả nơi chốn | 7 |
| foundation-questions-01 | Hỏi và phủ định trong sinh hoạt | 7 |
| foundation-checkpoint-01 | Ôn chặng đầu: giới thiệu và sinh hoạt | 9 |

Audio tự soạn, Windows TTS lưu sẵn. Không gọi Gemini khi học. Nộp sai vẫn vào Sổ lỗi như bài cũ. Không khóa bài ôn hoặc bài sau theo kết quả.

## API bổ sung, giữ tương thích

GETprograms/:id trả `units[].lessons[].lesson_kind:lesson|checkpoint`; session cũng có lesson_kind. Bài cũ mặc địnhlesson, không bị thay nội dung/version/tiến độ. Vẫn start/draft/submit/advance qua API hiện có; không gắn cứng số bài hoặc số bước.

Bài ôn gồm6câu lựa chọn nghe/ngữ pháp/đọc hiểu, tiếp theo nói, viết và reflection. Phần nói/viết là tự luyện với rubric, không được tính thành điểm AI. Đáp án câu chưa chấm vẫn ở BE. Hoàn tất mọi bước mới có `summary.checkpoint`:

```json
{
  "scope":"local_unit_review",
  "graded_total":6,
  "graded_submitted":6,
  "correct":6,
  "unassisted_correct":6,
  "minimum_correct":4,
  "passed":true,
  "status":"passed",
  "recommended_lesson_ids":[],
  "open_tasks_assessment":"self_review",
  "proficiency_estimate":null
}
```

Đây là ví dụ hình dạng, UI dùng số thật. Cần ít nhất4/6câu đúng không dùng hỗ trợ để đạt tiêu chí ôn. Đây là tiêu chí local để hướng dẫn học, không phải chuẩn xác nhận CEFR hoặc chứng chỉ. correct tính mọi câu đúng; unassisted_correct chỉ tính đúng với assistance_usedrỗng đã được ghi. Đúng6/6nhưng đều dùng hỗ trợ: correct6, unassisted_correct0, passedfalse.

Session.statuscompleted chỉ nghĩa đã làm hết lượt, **không đồng nghĩa passedtrue**. Summary.mastered vẫnfalse. statuscheckpoint có passed/review_needed/incomplete; incomplete là dữ liệu chưa đủ để kết luận. UI dùng 'Đạt tiêu chí ôn chặng' hoặc 'Nên ôn lại', không gọi là 'đã giỏi tiếng Anh' hay 'đạt A1'.

recommended_lesson_ids là gợi ý ôn theo câu sai hoặc chưa tự nhớ; có thể vẫn có gợi ý dù passedtrue (ví dụ đúng độc lập4/6). Lấy tiêu đề từ danh mục; khi bấm học lại, POST /learning/sessions với lesson_id tương ứng rồi điều hướng theo session_id trả về. Không hardcode bộ163. Không tự mở lượt mới chỉ vì người học xem kết quả.

## Việc Anti cần làm

1. Hiện badge 'Ôn chặng' trong danh mục khi lesson_kindcheckpoint; không cần màn học mới, renderer hiện tại đã chạy trọn9bước trên Chrome.
2. Ở kết thúc phiên, nếu có summary.checkpoint, thêm kết quả: X/6đúng, Y/6đúng không hỗ trợ, tiêu chí4/6, trạng thái và gợi ý ôn. Giữ bản nộp cũ để xem lại, không sửa kết quả lượt trước bằng kết quả học lại.
3. Màn hoàn tất hiện tại có lời chúc hoàn thành; không đổi nó thành tuyên bố đạt tiêu chí khi passedfalse.
4. Giữ nhãn nói/viết tự luyện. Chưa có AI chấm cả4kỹnăng trong bài ôn này.

## Đã kiểm tra

10kiểm thử BE liên quan đạt, gồm bài mới/audio, đủ6câu, không lộ keys, replay, case đúng độc lập, đúng với hỗ trợ, sai và gợi ý bài có thật; dữ liệu cũ/phiên bản cũ được giữ. Chrome trên DB tạm đạt8kiểm tra xuyên suốt, bao gồm bài ôn9bước trên bản FE hiện tại; không pageerror, không BE500,0requestAI. Xem [báo cáo Chrome](v2-browser-integration.json), [ảnh màn hoàn tất hiện tại](anti-reference/local-v2-checkpoint.png). Ảnh chưa có phần kết quả checkpoint tùy biến vì Anti chưa bổ sung UI đó. Chưa kiểm tra loa/micro vật lý hoặc chất lượng nội dung qua giáo viên.
