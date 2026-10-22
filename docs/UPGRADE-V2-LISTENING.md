# LISTEN-01 — nghe từng câu và shadowing

> Bản **1.9.2** sửa tích hợp history và last_practised_at; xem [rà soát và việc Anti cần sửa](UPGRADE-V2-LISTENING-AUDIT.md). History nay có settings/cursor/summary/created_at, không phải session detail đầy đủ. Chrome đã kiểm lịch sử và resume; một số tương tác FE còn cần chỉnh.

> Cập nhật CONTENT-03, contract 1.9.1: danh mục hiện có **12 học liệu/68 clip**. Các con số 9/50 dưới đây ghi nhận lần phát hành đầu; hợp đồng API không đổi. Chi tiết UPGRADE-V2-CONTENT-03.md.

21/10/2026. BE đã chạy, contract **1.9.0**, schema **10**, 128 route. Anti nhận **FE-LISTEN**; giao diện mới chưa được xác nhận tích hợp. Không sửa server/.env để nối FE.

Có 9 học liệu với **50 clip WAV từng câu thật**, tổng hợp riêng bằng Windows Microsoft David Desktop. Không gọi Gemini. Clip không phải đoạn cắt có timestamp của audio nguyên bài: `sentence_source=separately_synthesized_sentence`, `aligned_to_full_audio=false`. Chưa kiểm tra chất lượng bằng tai người. Bản dịch tiếng Việt có ở cấp toàn đoạn; `sentence.translation=null`.

## API đã triển khai

Mọi route dưới đây có tiền tố `/api/v1`, cần cookie đăng nhập. Mutation thêm `X-Requested-With: OpenQuiz`, JSON. Thành công trả `{data,request_id}`; lỗi trả `{error:{code,message,details},request_id}`. Riêng audio trả binary.

| Method | Route | Kết quả trong data |
| --- | --- | --- |
| GET | `/learning/listening` | `{items}` học liệu mới nhất đã publish |
| GET | `/learning/listening/:lesson_id` | Track đầy đủ, transcript/dịch và các clip |
| GET | `/learning/listening/media/:lesson_id/:version/:sentence_id` | WAV, hỗ trợ một byte Range và HTTP 206 |
| POST | `/learning/listening/sessions` | Session trực tiếp, thêm `replayed`; 201 nếu tạo mới |
| GET | `/learning/listening/sessions` | `{items,total,limit,offset}` lịch sử riêng; query `lesson_id`, `limit`, `offset` |
| GET | `/learning/listening/sessions/:id` | Session đã lưu, đúng câu đang luyện |
| POST | `/learning/listening/sessions/:id/sentences/:sentence_id/complete` | `{session,result,replayed}` lưu và sang câu kế tiếp ngay |

Danh mục có `lesson_id,content_version,program_id,title,lesson_kind,source,voice,sentence_practice_available,sentence_count,full_audio_url,full_translation,transcript`. Khi phiên bản mới chưa chuẩn bị clip, availability false, count 0; không làm nút Bắt đầu như đã sẵn sàng.

Track thêm `sentences:[{id,text,translation,audio_url,duration_ms}]` và `guidance`. Duration lấy từ dữ liệu WAV thật. Không có `start_ms`/`end_ms` trong file nguyên bài.

Tạo/tiếp tục phiên:

```json
{
  "lesson_id": "foundation-introductions-01",
  "resume": true,
  "settings": {"mode":"listen_repeat","rate":0.9,"target_repetitions":2}
}
```

`resume` mặc định true: lấy phiên dở cùng lesson/version và đúng bộ settings. `resume:false` tạo phiên mới độc lập; đổi settings tạo phiên riêng. Mode `listen_repeat` hoặc `shadowing`; rate số 0.5–1.5, target_repetitions số nguyên 1–5. Các giá trị mặc định như ví dụ. Muốn tiếp tục phiên cũ chính xác, GET bằng id từ lịch sử; không POST lại với settings mặc định khác.

Session gồm `id,lesson_id,content_version,title,revision,status,settings,cursor,total_sentences,current,track,results,summary,created_at,updated_at,completed_at`. Cursor bắt đầu 0; current là clip hiện tại, null khi hết. `results` là object theo sentence id. Summary gồm `practised_sentences,skipped_sentences,repetitions_self_reported,mastered:false,pronunciation_assessed:false`.

Sau khi tự luyện đủ lượt và tự nghe lại, nộp:

```json
{
  "revision": 0,
  "submission_id": "f9a23c8a-2074-46bb-9153-341e351b021e",
  "repetitions": 2,
  "self_reviewed": true,
  "reflection": "Cần luyện lại âm cuối."
}
```

Repetitions số nguyên 1–20, phải >= target đã chọn. Reflection tùy chọn, tối đa 2000 ký tự. Nút Bỏ qua gửi `{revision,submission_id,skip:true}`; lưu skipped true và repetitions 0, không giả là đã luyện. `result.assessment=self_reported`, pronunciation_assessed false. Đi hết các câu là completed, kể cả có câu bỏ qua; không đồng nghĩa thành thạo.

Mỗi lần bấm tạo UUID mới; khi retry mạng giữ nguyên UUID và nội dung. Cùng UUID/body trả replayed true, không cộng lượt; đổi nội dung cùng UUID trả 409 IDEMPOTENCY_CONFLICT. Revision cũ trả 409 REVISION_CONFLICT: GET lại phiên trước khi thao tác mới. Chỉ nộp câu current, sai thứ tự trả 409 SENTENCE_OUT_OF_ORDER. Thiếu xác nhận/thiếu lượt trả 400 SELF_REVIEW_REQUIRED/INSUFFICIENT_REPETITIONS. Phiên bản chưa có clip trả 409 SENTENCE_AUDIO_NOT_READY. Session/audio của tài khoản khác không được cấp qua id phiên. Phiên cũ giữ content_version và clip cũ sau khi publish bản mới.

## FE-LISTEN cần làm

1. Màn `/listening` trong Thư viện hoặc Luyện tập, không cần thêm một menu lớn. Hiện học liệu khả dụng, nguồn giọng đọc và lịch sử riêng; chọn chế độ, tốc độ, số lần. Link từ lịch sử `/listening/practice/:id`.
2. Màn phiên dùng current.audio_url, áp dụng playbackRate từ settings. Nghe → dừng → nhắc lại; chế độ shadowing cho nghe và nói bám theo. Có lặp nguyên clip, tua, hiện/ẩn transcript và bản dịch toàn đoạn. Không gắn timestamp clip vào audio nguyên bài. Nếu làm A–B trong clip thì dùng thời gian player/duration thật.
3. Thu âm local tùy chọn, xin quyền micro khi bấm Thu âm, có dừng/nghe lại/xóa; dừng stream và audio khi rời màn. Chưa có upload/AI chấm ở API này. Không tự đổi thành điểm phát âm hoặc bắt buộc có micro mới được nghe.
4. Người học xác nhận số lượt và tự đánh giá rồi Lưu và sang câu; có Bỏ qua riêng. Không tự nộp chỉ vì player phát hết. Bấm Ctrl để nghe câu hiện tại có thể hỗ trợ, bỏ qua tổ hợp Ctrl+C/V/A và khi đang ghi âm/nhập liệu; Enter chỉ nộp khi trạng thái hợp lệ, chặn double click.
5. Dùng session BE trả về sau mutation, không tự tăng cursor/revision. Reload gọi GET session. Khi hết, hiển thị số câu đã tự luyện, bỏ qua, số lượt tự khai báo và lựa chọn luyện lại bằng phiên mới. Lỗi media phải có retry, không báo đã nghe thành công.

`GET /learning/progress` thêm `listening_practice`: sessions_started, completed_sessions, active_sessions, practised_sentences, skipped_sentences, repetitions_self_reported, last_practised_at, resume_session_id, resume_route, route, assessment. Đây là tổng từ trước đến nay, cộng cả các phiên luyện lại, không lọc theo query days. `listening_accuracy` và `pronunciation_score` luôn null. Không trộn với độ đúng câu hỏi nghe được BE chấm, không cộng SRS/điểm học từ vựng.

## Kiểm thử và bảo trì

63 kiểm thử toàn BE đạt sau migration 10, gồm 4 kiểm thử mới: 50 WAV/Range, phiên/replay/revision/skip, quyền sở hữu/lịch sử/cạnh tranh nộp, DB reopen và phiên bản cũ. Không gọi AI thật trong suite. FE mới vẫn cần Anti kiểm tra player/loop, reload, lỗi mạng, phím tắt và thu âm thực tế.

Thêm học liệu: chạy `node scripts/generate-listening-manifest.mjs`, sau đó `powershell -File scripts/render-sentence-audio.ps1 -OnlyMissing` trên Windows có System.Speech. Manifest giữ phiên bản đã phát hành; sửa transcript cần version mới. Không ghi đè clip phiên cũ. File audio ở `server/content/learning-v2/media/sentences/`; tài liệu ZIP không chứa các WAV vì hai bên cùng workspace.
