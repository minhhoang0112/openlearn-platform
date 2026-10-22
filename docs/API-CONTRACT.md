# Bổ sung hợp đồng hiện tại

Contract 1.3.0, SQLite schema 6, 101 route. Đọc [bàn giao BE mới nhất](ANTI-BE-HANDOFF.md) cho study/options, required_correct, course activities và course learning sessions; [ngữ pháp/đọc hiểu](EXERCISE-FE-HANDOFF.md) và [hội thoại/Speaking](CONVERSATION-SPEAKING-CONTRACT.md) cho các luồng mới. Phần bên dưới giữ làm hợp đồng nền; nếu khác, ưu tiên tài liệu mới và route export từ server.

# Backend API — v1

Backend độc lập cho FE dựng lại. Không trỏ FE vào server của OpenQuiz gốc. API này **không phải** bản tương thích từng byte với API gốc.

## Chạy và kết nối

- Node.js **24.15+**, không cần cài database hoặc npm package cho BE.
- `node server/index.mjs` hoặc nhấp đúp `run-backend.bat`.
- BE: `http://127.0.0.1:4000/api/v1`.
- Vite proxy `/api` đến BE; FE dùng `new OpenQuizApi('/api/v1')` trong `src/api/client.ts`.
- Database: `server/data/openquiz.sqlite`. Tạo schema/seed khi khởi chạy lần đầu, giữ dữ liệu qua lần chạy sau. Dừng server trước khi sao lưu cả thư mục data.
- Chạy `node --test server/tests/*.test.mjs` để kiểm tra BE; `node scripts/export-api-contract.mjs` để cập nhật danh mục route.
- `docs/openapi.json` là bản inventory có thể nhập vào công cụ API. Nó liệt kê route và bảo mật; schema payload chi tiết nằm trong tài liệu này, chưa được khai báo đầy đủ trong OpenAPI.

## Quy ước bắt buộc

```ts
fetch('/api/v1/sets', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'OpenQuiz' },
  body: JSON.stringify({ title: 'My words', words: [] })
});
```

- Cookie `oq_session`: HttpOnly, SameSite=Lax; Secure khi `NODE_ENV=production`. FE không đọc/lưu token. Production cần HTTPS và reverse proxy cùng site.
- Mọi POST/PUT/PATCH/DELETE cần `X-Requested-With: OpenQuiz`; JSON tối đa 1 MB.
- CORS chỉ cho phép các origin trong `FRONTEND_ORIGINS`. Không dùng `*` với cookie.
- Thành công: `{ "data": ..., "request_id": "uuid" }`. Ngoại lệ duy nhất: `/openapi.json` trả OpenAPI JSON trực tiếp.
- Lỗi: `{ "error": { "code": "...", "message": "...", "details": {} }, "request_id": "uuid" }`.
- 400: dữ liệu không hợp lệ; 401: đăng nhập; 403: không có quyền; 404: không thấy hoặc không được xem; 409: trạng thái không hợp lệ; 429: giới hạn lượt; 501: chưa hỗ trợ đánh giá âm thanh; 503: chưa cấu hình AI.
- ID tài nguyên là số. ID phiên học/hội thoại là UUID. Không dùng ID từ gốc cho các bản ghi mới.
- Thời gian là ISO UTC. FE hiển thị theo timezone người dùng. Forecast hiện nhóm theo ngày UTC.
- List: `?limit=20&offset=0`, limit 1–100. `items`, `total` nếu route hỗ trợ đếm. Danh sách session/history có thể chỉ có items/limit/offset.

## Authentication, profile, capabilities

```json
POST /auth/register
{"name":"Người học","email":"learner@example.com","password":"at least 10 characters"}

POST /auth/login
{"email":"learner@example.com","password":"at least 10 characters"}

POST /auth/logout
{}

PATCH /me
{"name":"Tên hiển thị","settings":{"ui_language":"vi","native_language":"vi","learning_languages":["en"],"theme":"light","daily_goal":20,"study":{"auto_advance":true}}}
```

`GET /me`: id/email/name/settings/created_at. `GET /capabilities`: feature flags thật. Google/Apple OAuth, thanh toán và audio pronunciation assessment chưa kết nối. Curriculum API đã có, nhưng `original_course_bodies=false`: mới có metadata A1 và engine nhập bài của dự án. UI settings được lưu vào `/me`; chỉ những setting được nêu ở session API mới ảnh hưởng thuật toán BE.

## Bộ từ và từ vựng

`GET /sets?q=...&learning_language=en&tag=TOEIC&filter=mine|saved|studying&limit=20&offset=0`.

`POST /sets` hoặc `/sets/import` cùng payload JSON đã chuẩn hóa:

```json
{
  "title":"Tuyển dụng & việc làm",
  "description":"Từ vựng công việc",
  "learning_language":"en","native_language":"vi",
  "visibility":"private","tag":"TOEIC",
  "words":[{
    "term":"apply","definition":"nộp đơn, áp dụng",
    "part_of_speech":"verb","phonetic":"/əˈplaɪ/",
    "example":"You should apply for the job before the deadline.",
    "synonyms":"submit; use; employ","image_url":""
  }]
}
```

CSV/TSV được FE parse thành payload trên. BE không nhận đường dẫn máy người dùng hoặc tự tải URL bên ngoài. JSON phải có đủ term/definition; trường tùy chọn mặc định chuỗi rỗng; tối đa 5.000 từ/request. image_url chỉ HTTPS, BE không fetch ảnh.

`GET /sets/:id`: card + words. Card có author/saved/word_count/mastered_count/source/content_status. Word có id/set_id/term/definition/part_of_speech/phonetic/example/synonyms/image_url/position/status/starred/due_at.

- `PATCH /sets/:id`: title, description, visibility (owner).
- `DELETE /sets/:id`: xóa bộ thuộc sở hữu; tài nguyên đang được tham chiếu có thể trả conflict, không xóa im lặng bài giao.
- `POST /sets/:id/clone`: `{ "title": "Bản sao" }`; tạo bản private thuộc tài khoản hiện tại.
- `POST /sets/:id/words`: `{ "words": [...] }`.
- `PATCH /sets/:id/words/:word_id`: các trường từ cần sửa.
- `DELETE /sets/:id/words/:word_id`.
- `PUT /sets/:id/order`: `{ "word_ids": [3,1,2] }`, phải đủ ID hiện có đúng một lần.
- `GET /sets/:id/export`: JSON đầy đủ. FE tạo Blob/download.
- `PATCH /words/:id/progress`: `{ "starred": true, "status": "learning" }`; mỗi trường tùy chọn.
- `GET /sets/:id/progress`: total/new/learning/mastered/words.
- `POST /sets/:id/progress/reset`: `{ "confirm": true }`, chỉ reset tiến độ của tài khoản hiện tại.

Status dùng `new`, `learning`, `mastered`; FE map thành Chưa học, Đang học, Đã thành thạo. Không lấy word_count làm số từ đã thuộc.

## Lộ trình

`GET /paths` dùng cùng filter với /sets. `GET /paths/:id` trả card + `sets` theo thứ tự, chỉ gồm bộ người dùng được xem.

```json
POST /paths
{"title":"TOEIC","description":"...","learning_language":"en","native_language":"vi","visibility":"private","tag":"TOEIC","set_ids":[163,164]}

PUT /paths/:id/sets
{"set_ids":[164,163]}

PATCH /paths/:id
{"title":"Tên mới","visibility":"public"}
```

Public path chỉ được chứa public sets. Thay thứ tự/set chỉ owner. Xóa path không xóa các bộ từ.

`PUT /bookmarks/:kind/:id`: `{ "saved": true }`, kind = set/path/word; gọi lại không tạo bản ghi trùng.

## Trang chủ, tìm kiếm, folder, dictionary

- `GET /dashboard`: user, due_today, studying_paths, studying_sets, recommended (nhóm tag), recent, activity, promotion (hiện null).
- `GET /search?q=...`: sets và paths. Chưa có tìm người dùng toàn cục.
- `GET /dictionary?q=apply`: tra trong bộ từ local được phép xem; không giả là từ điển bao phủ mọi ngôn ngữ.
- `GET /activity`; `GET /ranking?period=week|month|all`: từ điểm học thật.
- `GET/POST /folders`, POST `{ "name":"IELTS", "color":"#94a3b8" }`.
- `PUT /folders/:id/sets`: `{ "set_ids":[163] }`; `DELETE /folders/:id` không xóa bộ.

## Phiên học từng câu

```json
POST /study/sessions
{
  "set_id":163,"mode":"learn",
  "settings":{"shuffle":false,"starred_only":false,"due_only":false,"direction":"term_to_definition","limit":20}
}
```

Mode: flashcard, learn, write, dictation, quiz, exam, match, comprehensive. Direction: term_to_definition hoặc definition_to_term.

Response:

```json
{"id":"uuid","set_id":163,"mode":"learn","settings":{},"status":"active","total":12,"completed":0,"correct":0,"question":{"id":"question-uuid","word_id":1,"type":"write","prompt":"apply","phonetic":"/əˈplaɪ/","part_of_speech":"verb"}}
```

`GET /study/sessions/:id` để resume; `GET /study/sessions` cho lịch sử.

```json
POST /study/sessions/:id/answers
{"question_id":"uuid","answer":"áp dụng"}
```

- quiz: thêm `option_id`; dùng ID của option, không gửi cờ correct.
- flashcard: thêm `known: true|false`; đây là tự đánh giá, không phải kiểm tra khách quan.
- Tôi không biết: answer rỗng và `skip:true`.
- FE disable nút khi đang gửi. Retry cùng question_id được xử lý idempotent.
- Response: correct, expected, progress, points, replayed, session (câu tiếp theo).
- Câu hỏi chưa nộp không trả expected. Đáp án được so bằng Unicode NFKC, không phân biệt hoa thường, chuẩn hóa khoảng trắng; câu trả lời nghĩa chấp nhận các mảnh tách bằng dấu phẩy/chấm phẩy. Chưa có chấm ngữ nghĩa bằng AI.
- dictation: question.speech_text để FE đọc bằng TTS; không in text đáp án lên màn hình trước khi trả lời.
- match: `GET /study/sessions/:id/match` trả terms và definitions đã xáo trộn; gửi cặp khớp qua answers với question_id của term, có thể theo thứ tự bất kỳ. Minigame Vượt Sa Mạc/Húc Cổng chưa có engine tương ứng.
- comprehensive hiện ghép ba chặng quiz/write/dictation; **chưa phải** toàn bộ chương trình nhiều bài của bản gốc.
- Tối đa settings.limit từ, không phải tổng số câu ở mode comprehensive. `total` và `completed` trong response mới là số câu thực tế. FE không hardcode 20 hay 12.

## Bài kiểm tra nộp cả bài

Tạo mode `exam`. Mặc định hỏi nghĩa → trả lời từ và trộn câu điền/trắc nghiệm.

`GET /study/sessions/:id/questions`: session + questions không có answer key.

```json
POST /study/sessions/:id/submit
{"answers":[{"question_id":"uuid1","answer":"apply"},{"question_id":"uuid2","answer":"","option_id":"option-uuid"}]}
```

Phải đủ ID mỗi câu đúng một lần; câu bỏ qua gửi answer rỗng. Server nộp/chấm trong một transaction, cập nhật progress một lần. Gửi lại trả replayed=true. Đọc `results` để hiển thị đúng/sai; không chấm ở FE.

## Lặp lại ngắt quãng

- `GET /srs/summary?set_id=163` hoặc `path_id=14`: due/learning/mastered/tracked/forecast.
- `GET /srs/queue?set_id=163&limit=20&offset=0`: các từ đã đến hạn.
- Một lần trả lời đúng được quality 4; sai được 1; scheduler độc lập dựa SM-2. Sai ôn lại sau 10 phút; đúng lần đầu 1 ngày, lần hai 6 ngày; các lần sau theo ease.
- Không khẳng định scheduler giống thuật toán riêng của OpenQuiz. Hiện review queue gom theo set; chưa có phiên mixed-set/path tự động.
- Điểm: tối đa 10 điểm cho cùng một từ trả lời đúng trong một ngày UTC; retry không cộng lặp.

## Lớp học

```json
POST /classes
{"name":"Lớp TOEIC","description":"..."}

POST /classes/join
{"code":"join_code từ giáo viên"}

POST /classes/:id/assignments
{"title":"Bài 1","set_id":163,"mode":"write","due_at":"2026-11-01T00:00:00Z"}

POST /classes/:id/assignments/:assignment_id/submit
{"session_id":"completed-session-uuid"}
```

`GET /classes`; `GET /classes/:id`: roster + assignments. Chỉ thành viên xem lớp. Bài giao private được chia sẻ đọc cho thành viên lớp. Chỉ giáo viên giao bài/xem `/classes/:id/assignments/:assignment_id/results`. Học sinh chỉ nộp phiên của chính mình, đúng bộ, mode và đã hoàn thành. Chưa có editor đề thi tự luận/chấm bài nói của giáo viên như các tính năng mở rộng của bản gốc.

## Bài Kết hợp: 5 từ/bài và 5 bước

Luồng này tách khỏi mode comprehensive ba chặng cũ của session API:

- `GET /sets/:id/lessons`: chia mỗi 5 từ thành bài; trả word_ids, terms, completed_steps và tên 5 bước đã quan sát.
- `GET /sets/:id/lessons/:lesson_index`: words và các step có available/completed.
- `POST /sets/:id/lessons/:lesson_index/steps/:step_index/start`: khởi tạo đúng subset từ cho bước tương ứng. Bài và bước đánh số từ 1.
- Bước 1–3 tạo session flashcard/learn/dictation. Bước 3 hiện nghe-gõ từ; bản gốc là nghe-chép điền từ trong câu ví dụ, nên API trả variant/reference_variant để FE thấy khác biệt.
- Bước 4/5 trả action speaking/conversation và nhóm từ mục tiêu; chưa có AI => 503.
- `POST .../complete`: bước 1–3 gửi `{ "session_id":"..." }`; server kiểm tra phiên đã hoàn thành đúng bộ, mode, đúng các từ bài này.
- Bước 4 gửi `{ "feedback_ids":["..."] }` trỏ feedback speaking của chính user/bộ đó; transcript đã lưu phải chứa đủ các từ mục tiêu. Đây là kiểm tra dùng từ, không phải xác minh phát âm.
- Bước 5 gửi `{ "conversation_id":"..." }`; chỉ hoàn thành khi các lời nhắn user đã lưu có đủ từ mục tiêu.
- Không thể nhảy bước bằng cờ completed ở FE; bước trước phải có evidence. Hoàn thành lại không tạo progress trùng.
- Flashcard bước 1 vẫn là tự đánh giá nhớ từ; yêu cầu xác minh phát âm từ audio của bản gốc chưa được tái tạo.

## Khóa học có curriculum

`GET /courses?language=en&competence=A1`; `GET /courses/:id`: course + parts + lessons và progress cá nhân.

Seed A1 gồm 6 phần/30 **tên bài** đã quan sát, chưa có lesson bodies. Đọc `/course-lessons/:id` khi chỉ có metadata trả 409 CONTENT_NOT_IMPORTED; không dựng nội dung giả cho người học.

Có thể nhập tài liệu được phép dùng vào khóa học của tài khoản hiện tại:

```json
POST /courses
{"title":"English A1","language":"en","competence":"A1","visibility":"private"}

POST /courses/:id/parts
{"title":"Greetings"}

POST /courses/:id/parts/:part_id/lessons
{"title":"Hello","instruction":"Choose or write the answer","questions":[{"type":"write","prompt":"Xin chào","answer":"hello"},{"type":"choice","prompt":"Cảm ơn","options":["hello","thank you"],"correct_option_index":1}]}
```

`GET /course-lessons/:id` trả instruction/questions, không trả answer key. Server cấp question IDs và option IDs dưới dạng string; correct_option_index khi nhập đếm từ 0.

`POST /course-lessons/:id/submit`: `{ "answers":[{"question_id":"1","answer":"Hello"},{"question_id":"2","option_id":"2"}] }`. Server chấm/lưu score,total,results,completed_at; retry không chấm lại. Hiện mỗi learner lưu một lần hoàn thành cho mỗi lesson, chưa có nhiều lượt thi/lesson như curriculum gốc có thể hỗ trợ.

## AI, lịch sử, hội thoại

`AI_SERVICE_URL`/`AI_SERVICE_KEY` trong .env trỏ đến gateway riêng do dự án quản lý. POST gateway JSON:

```json
{"task":"speaking_question","input":{"set":{"title":"...","learning_language":"en","native_language":"vi"},"words":[{"term":"apply","definition":"nộp đơn","example":"..."}],"instruction":"...","transcript":"..."}}
```

`POST /ai/generate`: `{ "set_id":163,"kind":"speaking_question","instruction":"...","transcript":"..." }`.

| kind | Gateway output tối thiểu | Ghi chú |
| --- | --- | --- |
| speaking_question | question: string | FE đọc bằng TTS, nhận câu trả lời bằng mic/nhập |
| speaking_feedback | feedback: string | Không suy ra pronunciation từ transcript |
| grammar | explanation: string | Có thể mở rộng questions trong gateway |
| reading | passage: string, questions: array | Word-bank/gap structure cần gateway và FE thống nhất thêm |
| flashcards | words: array | FE preview trước khi import /sets/import |
| translation | translation: string | Dịch câu được chọn |
| pronunciation | luôn 501 | Chưa tích hợp audio assessment |

Trả 503 nếu chưa cấu hình, 502 nếu gateway lỗi/sai schema, 429 khi quá lượt; không sinh điểm giả. Backend gọi gateway có timeout 30 giây và không gửi password/session cookie của app. AI output là dữ liệu không tin cậy: FE render text, không dùng dangerouslySetInnerHTML.

`GET /ai/history`; `GET /ai/history/:id` chỉ user sở hữu.

`POST /conversations`: `{ "set_id":163,"title":"Practice" }`; `GET /conversations`; `GET /conversations/:id`.

`POST /conversations/:id/messages`: `{ "message":"Hello..." }`; gateway task conversation nhận history và từ mục tiêu, cần trả `{ "reply":"..." }`. Chỉ lưu cặp user/assistant sau khi provider thành công. Tránh gửi trùng; hiện chưa có idempotency key cho lời nhắn AI.

`POST /feedback`: `{ "category":"bug", "message":"..." }`, lưu local để xử lý; chưa gửi email bên ngoài.

## Giới hạn triển khai cần biết

BE hiện dành cho local development/đối chiếu FE. SQLite, rate limiter trong một process, email/password riêng. Chưa có OAuth, quên mật khẩu qua email, production distributed storage, audio uploads/ASR/TTS cloud, thanh toán/webhook, marketplace/xu/avatar, video, extension backend, hoặc đầy đủ curriculum. Không dùng khóa Firebase, URL ảnh có chữ ký, session/token của web gốc cho bản dựng.

Seed lấy phần nhìn thấy trong ảnh người dùng: bộ 163 có 12 từ; path 14 có tên và tham chiếu bộ đầu. `content_status=partial`, `expected_set_count=50` là metadata từ ảnh, không có nghĩa database đã có đủ 600 từ. Tài liệu có quyền sử dụng có thể nhập qua /sets/import; chưa thu thập hàng loạt nội dung khóa học gốc.
