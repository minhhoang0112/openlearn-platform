# AI nhận xét bài đã nộp — bàn giao Anti (AI-01)

21/10/2026. Contract **1.8.0**, schema **9**,121route. Nội dung vẫn9mục học. Bổ sung nhận xét định tính cho writing_task và speaking_task đã nộp; không đổi điểm/correct/SRS/tiêu chí bài ôn. Không tự gọi AI khi vào bài, nộp bài hoặc mở lịch sử.

## Endpoint mới

Base `/api/v1`, cookie và header mutation như cũ.

| API | Đầu vào | data |
| --- | --- | --- |
| GET /learning/sessions/:id/ai-feedback | — | items là các nhận xét đã lưu, không gọi model |
| POST /learning/sessions/:id/steps/:step_id/ai-feedback | `{}` | một nhận xét, tạo nếu chưa có, dùng cache nếu đã có |

POST chỉ nhận object rỗng. Không gửi text/rubric/score/model từ FE để chấm; BE lấy bản nộp thật và đề/rubric đúng version. Session khác tài khoản404; bước không tồn tại404; không phải bài nói/viết400 UNSUPPORTED_FEEDBACK_STEP; chưa nộp409 SUBMISSION_REQUIRED. Cả phiên đang làm và đã hoàn tất đều đọc/nhận nhận xét được.

Response có:

```json
{
  "id":"uuid",
  "session_id":"uuid",
  "step_id":"writing",
  "provider":"gemini",
  "model":"gemini-3.5-flash",
  "assessment_status":"ai_review",
  "modality":"writing_text",
  "pronunciation_assessed":false,
  "source_submission_id":"uuid",
  "source_text":"I am student.",
  "feedback":{
    "summary":"Câu giới thiệu rõ; cần thêm mạo từ.",
    "strengths":["Có câu giới thiệu vai trò."],
    "corrections":[{"original":"I am student.","corrected":"I am a student.","explanation":"Danh từ đếm được số ít cần mạo từ trong mẫu này."}],
    "suggested_response":"I am a student.",
    "next_practice":["Viết thêm một câu giới thiệu vai trò."],
    "task_relevance":"on_topic"
  },
  "cached":false,
  "created_at":"ISO timestamp",
  "limitations":["Nhận xét được tạo bởi AI, có thể cần kiểm tra lại."]
}
```

Đây là hình dạng ví dụ; không gắn cứng model/câu trả lời. Modality của speaking_task là speaking_transcript. AI chỉ nhận xét nội dung bản chép lời, ngữ pháp, từ và mức liên quan đến đề; chưa nhận audio, chưa chấm phát âm/độ trôi chảy. pronunciation_practice không dùng endpoint này. Không hiện điểm phần trăm/CEFR vì response không có điểm đó.

task_relevance: on_topic/partly_on_topic/off_topic/uncertain. strengths/corrections/next_practice có thể rỗng; không tạo lỗi giả để đủ ô UI. Corrections được kiểm tra original là đoạn có thật trong bài nộp; mục không thay đổi được bỏ đi. Suggested_response chỉ là câu tham khảo, không sửa source_text hoặc thay nguyên văn trong lịch sử.

## FE cần nối

1. Sau khi nộp bài nói/viết, thêm nút 'Nhờ AI nhận xét bài đã nộp'. Chỉ gọi POST khi người học bấm, giữ pending và ngăn doubleclick. Không cần chờ AI mới được Tiếp tục bài.
2. Khi load phiên, GETai-feedback để khôi phục các nhận xét đã có; không POST từng bước để tự tạo khi load.
3. Hiển thị riêng bài gốc và nhận xét: điểm tốt, đoạn gốc→gợi ý sửa/lý do, câu tham khảo, việc luyện tiếp. Nói qua transcript phải có nhãn rõ. Không auto thay text gốc bằng suggested_response.
4. Cache miss tạo một lần; request đồng thời cùng bài dùng chung lời gọi. Cache hit trả cachedtrue, không tiêu hạn mức AI local. Đổi model trong Cài đặt không tự tái tạo nhận xét cũ; hiển thị model/thời điểm đã nhận xét. Chưa có nút force-regenerate.
5. Hiển thị lỗi provider và cho retry chủ động. Không xóa draft/source, không khóa bài, không mở mua Pro, không tự đổi model/key. 429 AI_RATE_LIMITED khác RATE_LIMITED local;503 AI_PROVIDER_BUSY;502 AI_INVALID_RESPONSE/AI_PROVIDER_UNAVAILABLE tùy trường hợp. Giữ details.retry_after_seconds nếu có.

## Lịch sử và Tiến bộ bổ sung

GET /learning/sessions/:id/evidence mỗi item thêm `ai_feedback:object|null`, cùng hình dạng nhận xét trên. feedback gốc vẫn là self_review; response vẫn nguyên văn người học nộp. UI lịch sử có thể mở thêm panel nhận xét mà không gọi model.

GET /learning/progress thêm:

- `ai_feedback:{reviews_created,writing,speaking_transcript,last_created_at}`: số nhận xét được tạo trong khoảng ngày đang chọn.
- Mỗi skill có `ai_feedback_count` (writing/speaking có thể>0). Không cộng vào correct/graded_tasks/accuracy hoặc active_days; đây là nhận xét, không phải lượt trả lời được chấm đúng.
- evidence_status hiện có vẫn mô tả loại bằng chứng của **bản nộp gốc**. Nếu ai_feedback_count>0, thêm nhãn 'Có nhận xét AI'; đổi dòng 'chưa chấm AI' thành 'Có nhận xét AI, chưa có điểm chuẩn hóa'. Không giả có người chấm hoặc nhận xét âm thanh.

## Vận hành và bằng chứng

Schema9 chỉ thêm bảng lưu nhận xét riêng, có foreign key/cascade; đã backup trước migration. Không thay tài khoản, SRS, bài nộp hoặc model/key. Nội dung gốc và feedback deterministic không bị cập nhật bởi AI.

Toàn bộ59test BE đạt trước chỉnh lọc no-op; sau chỉnh đã kiểm lại4test AI đều đạt. Bao gồm cache25lần không tốn thêm model, dedup, quyền, chưa nộp, lỗi định dạng/provider không lưu sai, xóa phiên khi AI đang chạy không tái tạo dữ liệu, original/evidence/metrics không bị biến thành điểm giả.

Một lần thử đầu bị từ chối vì model liệt kê câu giữ nguyên như correction. Chẩn đoán metadata xác định được nguyên nhân; đã lọc mục không đổi. Lượt xác minh cuối bằng Gemini3.5 thật trả200,2corrections, giữ nguyên source và cache hit không tái tạo. Xem [báo cáo thật](learning-feedback-live-validation.json); không dùng mock để khẳng định chất lượng mọi nhận xét. Chưa xác minh FE nút AI hoặc microphone/audio.
