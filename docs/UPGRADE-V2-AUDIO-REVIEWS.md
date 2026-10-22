# AUDIO-01 — nhận xét bản thu âm trong bài V2

21/10/2026. Contract **1.11.0**, schema **11**, **131 route**. BE đã triển khai và kiểm thử. **FE-AUDIO-01 chờ Anti tích hợp**; không coi nút thu âm local hiện tại là đã gọi AI.

Phạm vi: bước `pronunciation_practice` có câu mẫu `target`. Người học chủ động gửi bản thu thật, BE lấy target từ đúng content_version của phiên. Không dùng transcript do trình duyệt nhận dạng thay cho âm thanh. Đây là nhận xét định tính từ audio, không cấp điểm phát âm chuẩn hóa hoặc chứng chỉ. Chưa hỗ trợ đánh giá audio tự do cho `speaking_task`/hội thoại qua endpoint này.

## API thật

Prefix `/api/v1`. Cookie auth, mutation có `X-Requested-With: OpenQuiz`. Envelope `{data,request_id}` hoặc `{error:{code,message,details},request_id}`. Ba route mới:

| Method | Route | data |
| --- | --- | --- |
| GET | `/learning/sessions/:id/audio-reviews?limit=20&offset=0` | `{capability,items,total,limit,offset}` |
| POST | `/learning/sessions/:id/steps/:step_id/audio-reviews` | Một nhận xét trực tiếp |
| DELETE | `/learning/sessions/:id/audio-reviews/:review_id` | `{deleted:true}` |

GET trả capability gồm configured, supported, provider, model, accepted_mime_types, max_audio_bytes=450000, max_base64_chars=600000, audio_stored=false. Hiện cổng audio dùng Gemini; Ollama/gateway chưa được nhận ở luồng này. Configured nghĩa đã cấu hình, supported nghĩa cổng có hỗ trợ provider, không bảo đảm key/model/hạn mức đang gọi thành công. Đọc nhận xét đã lưu không gọi model, kể cả khi đổi/tắt provider.

POST body chỉ gồm:

```json
{
  "submission_id": "d53578af-464b-4cd4-a34e-e56d4424f08f",
  "audio": {"mime_type":"audio/webm;codecs=opus","data":"BASE64_KHONG_CO_TIEN_TO_DATA_URL"}
}
```

Không gửi target, transcript, revision, điểm hoặc object URL. BE nhận WebM/Ogg/WAV/MP4/M4A, bỏ phần codecs khi chuẩn hóa; mp4 chuyển MIME thành m4a cho adapter hiện có. Kiểm base64 chuẩn, từ44 đến450000byte giải mã và chữ ký container đúng MIME. BE không đo duration hoặc xác nhận codec/giọng nói trước khi gửi AI. Giới hạn HTTP toàn ứng dụng vẫn1MB; không nâng để gửi file dài. Frontend cần kiểm Blob.size trước khi encode/gửi.

Chỉ gửi khi đã tới bước phát âm hoặc ôn lại bước đã qua, kể cả phiên hoàn tất. Bước tương lai trả409 STEP_NOT_REACHED; không phải pronunciation_practice trả400 UNSUPPORTED_AUDIO_STEP. Không tạo target từ tham số FE hoặc phiên bản bài mới nhất khác phiên đang học.

Nhận xét trả các field:

```text
id, session_id, step_id, target, provider, model, created_at,
mime_type, audio_bytes, transcript, feedback, improvements[],
needs_clearer_recording, cached, limitations[],
assessment_status="ai_audio_review",
assessment_scope="qualitative_audio_feedback",
pronunciation_score=null, proficiency_estimate=null, audio_stored=false
```

Transcript là điều AI nghe được, có thể sai, không thay bài viết/bản chép lời cũ. Nếu transcript rỗng thì needs_clearer_recording=true; yêu cầu thu lại, không tự báo đúng/sai hoặc tự điền câu mẫu. Provider output được kiểm hình dạng, chỉ trả field cho phép; không đưa score do model tự tạo ra vào kết quả chuẩn hóa.

## Retry, cache và lỗi

- Mỗi bản thu/hành động mới có UUID mới. Retry sau mất phản hồi dùng đúng UUID, audio và step id cũ. UUID đổi nội dung/câu khác trả409 IDEMPOTENCY_CONFLICT, kể cả đang xử lý.
- Cùng audio/MIME chuẩn hóa/target/version trong cùng phiên và bước dùng nhận xét đã lưu. UUID mới cũng được gắn alias vào cache, không gọi lại. Các yêu cầu đồng thời cùng audio gộp một lời gọi.
- Lượt mới dùng giới hạn chống dồn20request/phút hiện có; cache hit không dùng lượt. Không có quota Pro riêng. Không tự gọi AI khi tải bài/thu âm/phát lại.
- 429 AI_RATE_LIMITED có details.retry_after_seconds khi provider cung cấp. 503 AI_PROVIDER_BUSY/AI_NOT_CONFIGURED, 501 AUDIO_PROVIDER_REQUIRED, 502 AI_INVALID_RESPONSE/AI_PROVIDER_* cần hiển thị đúng lỗi. Lỗi không tạo nhận xét thành công giả; người học vẫn tự luyện/tiếp tục bài như cũ. Không tự retry 429 theo vòng lặp.
- DELETE xóa nhận xét và alias retry; không xóa bài nộp/điểm. GET/POST/DELETE phiên người khác trả404. Xóa phiên khi request đang chạy không tạo lại nhận xét mồ côi.

## Lưu trữ và Progress

Hai bảng mới learning_audio_reviews và learning_audio_review_requests. Lưu hash fingerprint/target, MIME/kích thước, nhận xét và metadata provider; **không lưu base64/file audio thô** trong SQLite. Audio được giữ tạm trong request để gửi tới nhà cung cấp khi người học bấm yêu cầu. Xóa nhận xét dùng DELETE ở trên.

GET /learning/progress thêm `audio_feedback:{reviews_created,last_created_at,assessment_scope,pronunciation_score:null}` theo cửa sổ days/timezone, tách khỏi nhận xét text. Skill pronunciation thêm `ai_audio_review_count`; khi có nhận xét trong cửa sổ, evidence_status=`ai_audio_feedback`. Accuracy vẫn null, không cộng graded_tasks hoặc tự tăng điểm/SRS/mastered. Các số liệu text/speaking cũ giữ nguyên.

GET /learning/sessions/:id/evidence thêm root `audio_review_count`, `audio_reviews_route`; mỗi item thêm audio_review_count. Nội dung nhận xét đọc riêng từ GET audio-reviews. Nhận xét có thể tồn tại trước khi nộp self_reflection nên root có count dù item phát âm chưa có trong evidence.items.

## Anti nhận FE-AUDIO-01

1. Tại bước pronunciation_practice, giữ nghe mẫu/thu âm local/nghe lại. Thêm nút rõ nghĩa **Gửi bản thu để AI nhận xét**, chỉ dùng Blob của câu đang học sau recorder.onstop đã gom đủ chunks. Trước bấm nêu ngắn “Bản thu sẽ được gửi tới AI để nhận xét”; không gửi âm thầm. Kiểm MIME/size, nếu quá lớn cho thu ngắn hơn; có thể giới hạn thời gian thu ở FE nhưng không hiển thị như BE đã đo duration.
2. Lưu cả Blob và object URL riêng. Không gửi URL blob, không gửi transcript của Web Speech API để thay audio. Chặn gửi khi đang thu; giữ nguyên các cleanup stream/ObjectURL đã sửa. Khi đổi câu hoặc rời màn, không gắn kết quả đang về vào câu khác.
3. GET capability/nhận xét cũ khi mở phiên, hỗ trợ đọc cache dù provider hiện unsupported. Chỉ vô hiệu nút gọi mới theo capability; không khóa nút tự luyện/tiếp tục. Quota lỗi phải có thông báo và retry chủ động, không reset toàn bộ bài.
4. Dùng pending payload/UUID ổn định khi retry mất response. Bản thu mới/hành động khác tạo UUID mới. Nếu retry request cũ trả nhận xét cho bước trước, chỉ cập nhật lịch sử bước đó. Không ghi vào transcript người học đã nộp hoặc gọi submit/advance tự động sau AI.
5. Hiện target, “AI nghe được”, feedback, improvements và nhãn định tính. Transcript rỗng → gợi ý thu lại; null score → không có điểm số. Có xem lại và xóa nhận xét. Không gọi nút này là “chấm phát âm chính xác100%”.
6. Cập nhật client types/API, Progress với evidence_status mới, modal evidence đọc danh sách nhận xét riêng. Tách khỏi feedback text; không sửa server/.env để chữa UI.

FE cần kiểm bằng mock response: gửi Blob thật, double click/retry mất response, 429 giữ hint, thu mới khi request cũ đang về, đổi bước/rời màn, xóa review, cache sau reload/đổi provider, quyền micro lỗi và không chặn tự luyện. Đừng gọi model thật lặp để chạy suite UI; hạn mức hiện đang hết.

## Kiểm chứng và giới hạn hiện tại

- 76test toàn BE đạt sau schema11; sau thêm kiểm quota/cache đổi provider, 14test tập trung audio/progress/mistakes đạt (7test audio). Không giả thành toàn suite77test đã chạy.
- Provider tests dùng adapter Gemini được mock HTTP, xác nhận inline audio bytes và target lấy từ BE, không đánh giá chất lượng nhận xét của model.
- **Thử một request Gemini thật bằng WAV Windows TTS trên DB tạm: HTTP429 AI_RATE_LIMITED**, retry_after_seconds=61152 tại thời điểm thử. Không có nhận xét thật thành công trong lần này. Report learning-audio-live-validation.json; không chứa key/audio. Không tự thử lại hoặc đổi model/key. Khi quota khả dụng có thể chạy `node --use-env-proxy scripts/verify-learning-audio-live.mjs --live` để nghiệm thu kết nối; TTS sample không thay cho thử giọng người thật.
- Backup trước schema11: server/data/pre-audio-reviews-1792590797489.sqlite. Không đưa DB/.env vào ZIP.
