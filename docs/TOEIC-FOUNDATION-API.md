# TOEIC — Từ nền tảng: BE/API

Ngày: 05/11/2026. Contract **1.26.0**, schema **15**, tổng **196 HTTP routes**. Tính năng có 15 route riêng. BE và nội dung đã triển khai; Anti đã ghép FE và Codex kiểm tra tích hợp, sửa các lỗi tìm được. Xem [kết quả và giới hạn nghiệm thu](TOEIC-FOUNDATION-REVIEW.md).

## Phạm vi và thiết kế học

Khóa cho người biết ít từ nhưng quên ngữ pháp, từ loại. Đặt trong **Khóa học → TOEIC — Từ nền tảng**; không thêm sidebar TOEIC và không thay Trang chủ, A1, Lộ trình hay khóa TOEIC cũ. Các phần Ngữ pháp, Từ vựng, Nghe, Đọc là các mục con của cùng khóa, dùng chung tiến độ và một hành động Học tiếp.

Hai giai đoạn gồm 40 bài, mỗi chặng năm bài và một bài ôn tổng hợp. “Chặng 1–8” thay cho ép lịch “tuần 1–8”. Người học có thể tạm dừng và tiếp tục đúng câu/nhận xét đang xem.

| Chặng | Nội dung chính | Mục từ |
| --- | --- | --- |
| 1 | Danh từ/động từ, đại từ, be, tính từ/trạng từ, S–V–O, số/ngày | 75 |
| 2 | Hiện tại đơn, do/does, ngôi thứ ba, tiếp diễn, sinh hoạt | 75 |
| 3 | Was/were, quá khứ thường/bất quy tắc, tương lai, thời gian | 75 |
| 4 | Mạo từ/đếm được, giới từ, câu hỏi, email/cuộc hẹn, mua sắm | 75 |
| 5 | Hoàn thành, mốc thời gian, động từ khuyết thiếu, lượng từ, thiết bị | 60 |
| 6 | So sánh, liên từ, V-ing/to V, tuyển dụng | 60 |
| 7 | Bị động, giao hàng, mệnh đề quan hệ, họ từ, điện thoại | 60 |
| 8 | Email nhắc việc, đổi lịch họp, đi lại, thông báo, hoàn tiền | 60 |

Tổng 540 mục từ/540 chuỗi từ khác nhau, gồm cả biến thể như worked/working, **không tương đương 540 họ từ**. Có nghĩa Việt và từ loại theo ngữ cảnh bài; 120 câu Anh–Việt; 40 câu hỏi cấu trúc/ngữ cảnh, 40 câu đọc hiểu thông tin, tám hội thoại bốn lượt, tám hướng dẫn phát âm/hai mẫu IPA mỗi hướng dẫn. Các câu do dự án soạn, không lấy câu hỏi ETS hay chép nội dung web tham khảo. Không ảnh hoặc file audio tải sẵn.

Mỗi bài có bốn phần bắt buộc, được chọn trong phạm vi bài đã mở:

- **Ngữ pháp:** đọc giải thích Việt + câu mẫu; một câu trắc nghiệm và ba câu sắp xếp từ.
- **Từ vựng:** học danh sách trước; mỗi mục có một câu nhận diện nghĩa và một câu tự viết nghĩa Việt. Thứ tự từ/lựa chọn xáo trộn cho phiên mới. Nghĩa đảo thứ tự/thiếu dấu dùng bộ chấm hiện có, không gọi AI.
- **Nghe:** nghe hiểu thông tin chính + ba câu chép câu ngắn. Bài thứ năm mỗi chặng thêm bốn lượt hội thoại để nghe/chép theo vai. TTS chỉ là âm mẫu luyện tập.
- **Đọc:** đọc cụm câu ngắn, trả lời một câu thông tin và ba câu hiểu nghĩa. Giai đoạn hai có email/thông báo/ngữ cảnh công việc đơn giản.
- **Phát âm** tùy chọn: hướng dẫn IPA, nghe phân biệt hai mẫu. Không bắt mic, không chấm điểm phát âm bằng bản chép lời. Chưa có chấm âm học trong khóa này. IPA chưa được soạn đủ cho 540 từ; trường trống phải ẩn, không đoán phiên âm.

Xem thẻ/tài liệu không tăng tiến độ. Phải tự trả lời đúng từng câu, kể cả câu đã ôn lại. Câu sai hoặc có trợ giúp được đưa về cuối phiên, phải tự làm lại. Hoàn thành bốn phần mới mở bài tiếp theo. Hoàn thành năm bài mở ôn tổng hợp 20 câu (mỗi bài một câu ngữ pháp, từ vựng, đọc và nghe).

Ôn tổng hợp cần **ít nhất 16/20 câu đúng ngay lần đầu không trợ giúp**, đồng thời sửa hết lỗi. Nếu dưới 80%, phiên kết thúc với `needs_review`: giữ kết quả thật, yêu cầu luyện lại và làm lượt mới, không đổi thành 100% vì đã lặp câu sai. Khóa không quy đổi tiến độ thành điểm TOEIC. Giai đoạn 3–4 chỉ có nhãn `planned`, chưa có nội dung/API mở học.

Tham khảo định hướng: [ETS TOEIC Listening & Reading](https://www.ets.org/toeic/about/listening-reading.html) là bài đánh giá nghe/đọc; luyện nói trong nền tảng là hỗ trợ học, không phải bài thi L&R. [British Council: present simple be](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/present-simple-be) là tham khảo trình độ nền tảng. Lịch đề xuất lấy từ tài liệu người dùng gửi, không phải cam kết điểm hoặc thời gian đạt điểm.

## Lưu trữ và tương thích

Không đổi schema. Seeder thêm khóa `courses.source=openlearn:toeic-foundation:v1`, hai phần, 48 lesson metadata; thêm 40 bộ từ công khai không có owner (không xuất hiện như bộ thẻ do người dùng tạo). ID của bài và từ ổn định; cập nhật nội dung không xóa lịch sử, ghi chú hay bộ từ khác. Không tự đăng ký học cho tài khoản hiện có. `createApp({seed:false})` chỉ dùng inventory, không tạo nội dung để học.

Phiên lưu trong `course_learning_sessions`, engine `toeic_foundation_v1`; không dùng `course_progress` của khóa cũ để mở bài mới. API legacy từ chối các engine khác và lịch sử legacy chỉ liệt kê phiên legacy. Khóa foundation được ẩn khỏi danh sách khóa legacy mặc định; Anti thêm thẻ bằng endpoint catalog riêng.

Nội dung đổi làm phiên đang học không tương thích trả `409 CONTENT_CHANGED`; bắt đầu lượt mới bằng `resume:false`. Phiên cũ được giữ; phần đã hoàn thành trong engine V1 vẫn được công nhận. Muốn thay đổi quy tắc hoàn thành theo kiểu phá tương thích phải đổi engine, không xóa lịch sử.

Chỉ tự viết nghĩa Việt **không trợ giúp** cập nhật `word_progress`, một lần mỗi câu gốc/phiên, dùng `scheduleReview` và chính sách `due_v1` chung. Luyện đúng trước hạn không tăng giả số lần nhớ/giãn lịch; trả lời sai tạo hạn học lại theo SRS. Việc sửa ngay câu sai không giả lập đã nhớ dài hạn. Bộ từ hiện có trong Lộ trình TOEIC là liên kết bổ sung, không tự công nhận đã hoàn thành khóa.

## Quy ước HTTP

Prefix `/api/v1`. Trừ GET catalog công khai, các route yêu cầu cookie đăng nhập. Mutation dùng `Content-Type: application/json`, `X-Requested-With: OpenQuiz`, `credentials:'include'`. Response `{data,request_id}`; lỗi `{error:{code,message,...}}` theo API hiện tại. Không đưa key AI vào FE; khóa không cần AI.

| Method/path sau prefix | Body/query | Kết quả |
| --- | --- | --- |
| GET `/toeic-foundation` | — | Catalog, phase implemented/planned, 40 bài, 540 mục từ, engine/version, modules |
| POST `/toeic-foundation/enroll` | `{}` | Hồ sơ; gọi lại không reset |
| PUT `/toeic-foundation/profile` | Các trường tùy chọn bên dưới | Hồ sơ cập nhật; giữ thiết lập khác |
| GET `/toeic-foundation/roadmap` | — | `{course,profile,items,completed_units,next}` |
| GET `/toeic-foundation/today` | — | `{profile,next,due_words,completed_units,total_units,suggested_minutes,calendar_deadline:null}`; next có `recommended_module` |
| GET `/toeic-foundation/units/:id` | `id=p1-01…p1-20/p2-01…p2-20` | `{id,title,phase,week,rule,vocabulary,phrases,dialogue,pronunciation,core_modules,optional_modules,preview:true}` |
| GET `/toeic-foundation/vocabulary` | `phase=1/2`, `week=1…8`, `due=true`, `limit<=100`, `offset` | `{items,total,limit,offset}`; mỗi item có tiến độ SRS riêng |
| POST `/toeic-foundation/units/:id/sessions` | `{module,resume?:boolean}` | SessionView; mặc định resume phiên phù hợp |
| POST `/toeic-foundation/checkpoints/:week/sessions` | `{resume?:boolean}` | SessionView, module checkpoint, 20 câu |
| POST `/toeic-foundation/review/sessions` | `{limit?:1…30,resume?:boolean}` | Ôn từ TOEIC đến hạn, không mở khóa bài |
| GET `/toeic-foundation/sessions/:id` | — | SessionView của chính người dùng |
| POST `/toeic-foundation/sessions/:id/listen` | `{revision}` | `{text,lang:'en-US',audio_source:'client_tts',assessment:'not_pronunciation_scoring'}` |
| POST `/toeic-foundation/sessions/:id/help` | `{revision}` | SessionView + `{help:{answer,explanation,requires_unassisted_retry:true}}` |
| POST `/toeic-foundation/sessions/:id/answer` | `{revision,option_id}` / `{revision,answer}` / `{revision,token_ids}` / `{revision,action:'continue'}` | SessionView, nhận xét được lưu trước khi tiếp tục |
| GET `/toeic-foundation/mistakes` | `limit<=100,offset` | `{items,total,limit,offset}`; lỗi riêng tư và `resolved` |

Profile: `enrolled_at:string|null`, `daily_minutes:30|45|60|90|120` mặc định60, `new_words_per_day:10…15` mặc định10, `target_score:number|null` mặc địnhnull (nếu nhập số:10…990). Mục tiêu số từ/ngày và phút là **gợi ý kế hoạch**, không khóa cứng một ngày hoặc tự cắt giữa bài15 từ. Có thể dừng/resume; FE không ghi “hết lượt hôm nay”. Không suy ra điểm thi từ target_score.

Roadmap unit: `{id,title,phase,week,vocabulary_items,core_modules,completed_modules,status,unlocked,active_sessions,optional_modules}`. `status=locked|available|in_progress|completed`. Checkpoint thay các trường module bằng `checkpoint:true,session_id,pass_ratio:.8`; status thêm `needs_review`. Chưa enroll: mọi bài khóa, `next:null`.

Unit `vocabulary` item: `{id,term,definition,part_of_speech,phonetic}`; nghĩa có thể nhiều mục ngăn bởi `;`. Phrases: `{english,vietnamese}`. Dialogue: `null` hoặc `{week,turns:[['A'|'B',english,vietnamese],...]}`. Pronunciation: `{week,topic,tip,pairs:[[term,IPA,vi],...]}`. Có thể xem tài liệu bài chưa mở; tạo phiên đánh giá vẫn bị BE chặn.

```ts
type Module = 'grammar'|'vocabulary'|'listening'|'reading'|'pronunciation';
type Task = {
  id: string;
  type: 'choice'|'listen_choice'|'dictation'|'vocabulary_write'|'arrange';
  prompt: string; passage?: string; english?: string; word_id?: number;
  options?: {id:string;text:string}[];
  tokens?: {id:string;text:string}[];
  can_listen: boolean; assisted: boolean;
};
type SessionView = {
  id:string; engine:'toeic_foundation_v1'; unit_id:string;
  module:Module|'checkpoint'|'review'; content_version:string;
  revision:number; status:'active'|'passed'|'needs_review'; current:Task|null;
  feedback:null|{
    correct:boolean; verdict:string; assisted:boolean;
    expected:string; explanation:string; requires_retry:boolean;
  };
  index:number; total:number; base_total:number; completed_questions:number;
  first_correct:number; first_attempt_ratio:number; attempts:number;
  completed_at:string|null; pass_ratio:number|null;
  mastery_label:'module_completed_not_long_term_retention';
};
```

Không đoán option ID bằng index trên màn hình: options đã xáo trộn. `arrange` gửi mảng token IDs theo thứ tự đã xếp, dùng mỗi token đúng một lần. Lặp từ có ID khác nhau. Dictation so theo câu mẫu, không phải dịch tự do; bỏ khác biệt hoa/thường, dấu câu và một số dạng rút gọn thông dụng. Nhập nghĩa Việt dùng bộ chấm hiện có: `close + correct:true` là thiếu dấu được chấp nhận; `close + correct:false` là typo chưa được tính đúng.

`total` tăng khi có câu ôn lại; dùng `completed_questions/base_total` cho tiến độ kiến thức, không giả tăng phần trăm bằng số câu lặp. `first_correct/base_total` là kết quả lần đầu, giữ nguyên khi sửa lỗi. Không hiển thị “thuộc lâu dài” khi session passed.

Sau trả lời giữ màn hình nhận xét; bấm Tiếp tục mới gửi action continue. GET lại phiên trả chính nhận xét đó. Revision phải lấy từ response mới nhất, kể cả sau help. Listen không đổi revision/cursor. Không có đáp án câu tương lai trong SessionView; tài liệu học là riêng, có thể mở để tham khảo. Listen trả text cho TTS nên đây là luyện tập, không phải ngân hàng đề có bảo mật đáp án.

Lỗi quan trọng: `409 ENROLL_REQUIRED`, `UNIT_LOCKED`, `STALE_REVISION`, `FEEDBACK_PENDING`, `ANSWER_REQUIRED`, `CONTENT_CHANGED`, `SESSION_COMPLETED`, `STEP_FINISHED`, `NO_DUE_WORDS`, `NO_AUDIO`, `RETRY_LIMIT`; `400 VALIDATION_ERROR/INVALID_OPTION/INVALID_TOKENS`; `404 NOT_FOUND` với session người khác. FE tải lại session khi stale; không tự resend câu trả lời.

## Đã kiểm và còn chờ

Codex đã kiểm cú pháp và chạy smoke BE trên SQLite in-memory: seed lặp không nhân bản; 48 lesson/540 từ; chạy qua160 phần bắt buộc và8 checkpoint; kiểm sở hữu, chặn mở sớm, trợ giúp phải ôn lại, stale revision, không dùng course_progress cũ. Không gọi AI, không ghi phiên học thử vào DB người dùng. Chưa chạy bộ test hồi quy/HTTP/browser; Anti phụ trách theo tài liệu bàn giao. Không coi smoke là nghiệm thu toàn hệ thống.
