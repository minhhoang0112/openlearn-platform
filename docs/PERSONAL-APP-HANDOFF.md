> Bàn giao mới nhất: [ANTI-BE-HANDOFF.md](ANTI-BE-HANDOFF.md), contract 1.3.0, schema 6. Bản dưới đây giữ làm tham khảo nền; thay đổi khóa học, model AI và cài đặt học ưu tiên tài liệu mới.

# Bàn giao BE cho Anti — ứng dụng học tiếng Anh cá nhân

Cập nhật 21/10/2026. Tài liệu này thay thế các nhận định cũ về khóa Pro, thiếu key AI, khóa học chỉ có tiêu đề và chưa hỗ trợ âm thanh. Anti đang sửa FE cùng thư mục. Theo yêu cầu mới bổ sung ví dụ và nút dịch trên mọi thẻ, Codex đã sửa thêm các điểm FE được mô tả dưới đây.

## Phạm vi và nguyên tắc FE

- Ứng dụng cá nhân, không thanh toán, không gói Pro/Plus, không nhập trạng thái quyền hạn tài khoản OpenQuiz gốc. Đăng nhập local chỉ để lưu dữ liệu riêng.
- Tiếng Anh: Nền tảng, TOEIC, Công việc. Catalog khóa học tích hợp chỉ liệt kê A1, A2, TOEIC; dữ liệu legacy được giữ để không mất lịch sử. Khóa do người dùng tự tạo vẫn được giữ.
- Bỏ mọi điều kiện kiểu `idx >= 3`, blur, biểu tượng khóa ví dụ, yêu cầu nâng cấp và khóa bước trước. Thiếu kết nối AI thì hướng dẫn cấu hình; không gọi đó là giới hạn tài khoản.
- Không ghi cứng phần trăm tiến độ, streak hay bộ đang học. Lấy API dashboard, danh mục, tiến độ và ôn tập; trạng thái trống phải hiển thị thật.
- Không đọc `.env` từ FE, không tạo `VITE_GEMINI_API_KEY`, không gọi Gemini trực tiếp trong trình duyệt.

## BE đã có

Contract 1.1.0, SQLite schema 4; [80 route](API-ROUTES.md), [OpenAPI](openapi.json), [hợp đồng nền](API-CONTRACT.md). OpenAPI là kiểm kê route; payload chi tiết phần mới nằm bên dưới.

Base `/api/v1` qua Vite proxy, hoặc `http://127.0.0.1:4000/api/v1`. Dùng cookie phiên; `credentials: 'include'`. Request thay đổi dữ liệu phải có `Content-Type: application/json`, `X-Requested-With: OpenQuiz`. Success trả `{data, request_id}`; đọc lỗi theo cấu trúc trong API-CONTRACT. Không tự tạo câu trả lời mẫu khi lỗi.

`GET /capabilities` trả `personal_use: true`, `subscription_required: false`, `payments: false`. `ai.configured` là trạng thái cấu hình provider; `ai.pronunciation_audio` là khả năng xử lý audio hiện tại. Không dùng các trường provenance `original_course_bodies`, `full_original_catalog` để khóa bài học của ứng dụng.

### Học liệu thực tế

- 10 lộ trình, 180 bộ, 8.363 mục từ đã đối chiếu trường hiển thị: từ, nghĩa, loại từ, IPA khi có. TOEIC: 50 bộ, 600 từ khác nhau. Nguồn và thứ tự trong `server/content/visible-english.json`.
- Các ví dụ bị ẩn ở nguồn không được đoán là đã thu thập. Có ví dụ tự soạn cho màu sắc/hình dạng và ba ví dụ nhìn thấy trong ảnh bộ 163; ví dụ còn thiếu có thể nhập hoặc tạo bằng AI, lưu riêng từng người dùng.
- Khóa A1 có 30 bài tự soạn, mỗi bài có mẫu câu, dịch, giải thích và bài tập. A2 có 15 bài, TOEIC 15 bài luyện từ vựng dựa trên thư viện đã đối chiếu. Đây là giáo trình của ứng dụng, không phải toàn bộ bài Pro gốc hay bộ đề TOEIC chính thức.
- Không suy ra ID từ nguồn: đọc ID API. Import giữ ID từ và tiến độ; dữ liệu nháp cũ không đề xuất trong thư viện.

### Ví dụ từ vựng và ghi chú

Mới: `POST /words/:id/learning-details` body `{}` trả một `ApiWord` đầy đủ ví dụ, `example_translation`, `synonyms`. Đã có ví dụ và bản dịch thì dùng lại, không gọi AI. Chưa đủ thì gọi provider và lưu ghi chú riêng; giữ nguyên câu ví dụ đang có để dịch đúng câu đó. Các request đồng thời cùng người/từ dùng chung một lời gọi; ghi chú thay đổi trong lúc AI đang chạy được ưu tiên, không bị ghi đè bằng kết quả cũ.

FE dùng `WordLearningDetails` chung trong `StudySetView`, `WordExample` và `SessionRunner`. Mặt sau thẻ tự bổ sung khi học lần đầu; nút nghe đọc nguyên câu, nút dịch hiện/ẩn bản dịch. Nút con và phím Enter không làm lật thẻ. Không gọi AI tự động trên hàng nghìn từ khi tải danh mục. Đây là bổ sung theo nhu cầu học từng thẻ, không có nghĩa đã tạo sẵn toàn bộ ví dụ cho 8.363 mục từ. Xem [kiểm tra tương tác](flashcard-details-validation.json).

`GET /sets/:id` trả `words`; mỗi từ có thêm `example_translation`, `example_source` (`library`, `manual`, `ai`). Ví dụ riêng của người dùng ghi đè ví dụ thư viện khi đọc.

Nhập/sửa ví dụ: `PUT /words/:id/notes`:

```json
{"example":"I applied for a new job.","translation":"Tôi đã ứng tuyển một công việc mới.","synonyms":""}
```

Trả từ đã cập nhật. Không cần quyền sở hữu bộ công khai để ghi chú cá nhân; không sửa ví dụ của người khác.

Tạo ví dụ: `POST /ai/generate`:

```json
{"set_id":163,"kind":"word_examples","word_ids":[123,124]}
```

ID chỉ minh họa: lấy ID thực trong `words`. Tối đa 20 ID khác nhau, phải thuộc bộ. Trả `data.result.examples` gồm `{word_id,example,translation,synonyms}` và đã lưu SQLite. Làm cả bộ thì chia lô tối đa 20, nối tuần tự, hiển thị tiến độ, dừng khi lỗi; không tạo hàng loạt trên mọi bộ lúc tải trang. Đọc lại bộ sau thành công hoặc merge theo `word_id`.

### Kết nối AI

Key người dùng cung cấp đã lưu trong `.env` ở BE và đã gọi Gemini thật thành công. Không cần nhập lại trong FE nếu dùng cấu hình chung hiện tại. `.env` được ignore; tuyệt đối không chép key vào tài liệu hoặc bundle FE.

- `GET /settings/ai`: `{provider,model,configured,key_configured,supported_providers,subscription_required}`; không trả key.
- `PUT /settings/ai`: `{"provider":"gemini","model":"gemini-3.8-flash"}`. Có thể thêm `api_key` để lưu key riêng trên BE. Bỏ trường `api_key` giữ key riêng hiện có; chuỗi rỗng xóa key riêng nhưng vẫn có thể dùng key chung `.env`. Cấu hình riêng ưu tiên hơn cấu hình chung.
- `POST /settings/ai/test` body `{}`: gọi provider thật, trả `{connected:true,reply}`. Không chỉ kiểm tra có chuỗi key.
- Provider `ollama` có adapter loopback, mặc định `qwen3:8b`; chưa cài/chạy model trên máy, không hiển thị như đã thử thành công.

Các kind khác của `POST /ai/generate`: `speaking_question`, `speaking_feedback`, `grammar`, `reading`, `flashcards`, `translation`, `pronunciation`. Truyền `set_id`, `transcript` hoặc `instruction` nếu phù hợp. Kết quả trong `data.result`, có ID lịch sử. Grammar dùng `exercises[].question/options/correct/rule`; reading dùng `passage`, `questions[].q/options/correct`. `correct` là chỉ số bắt đầu từ 0; đây là bài luyện AI, không phải endpoint bài kiểm tra giấu đáp án.

Hội thoại: tạo `POST /conversations` với `{set_id}`, sau đó `POST /conversations/:id/messages` với `{message}`; BE lưu hai lượt sau khi provider thành công. `GET /conversations/:id` đọc lịch sử riêng. Không gửi đồng thời nhiều lượt cùng một thread.

503 `AI_PROVIDER_BUSY`: đã thử lại tối đa ba lần khi upstream quá tải; FE cho thử lại. 429 `AI_RATE_LIMITED`: hạn mức dịch vụ. Không chuyển model trả phí tự động, không mở màn hình mua Pro. Giới hạn 20 yêu cầu AI/phút/người dùng để chống gọi lặp.

### Nhận xét bản ghi âm

`POST /ai/generate`:

```json
{"set_id":163,"kind":"pronunciation","instruction":"Nhận xét cách đọc từ apply.","audio":{"mime_type":"audio/webm","data":"BASE64_WITHOUT_DATA_URL_PREFIX"}}
```

Gemini nhận âm thanh thực dạng inline data. Hỗ trợ webm/wav/mp3/mpeg/ogg/mp4/m4a/aac; base64 tối đa 600.000 ký tự, request tổng dưới 1 MB. FE nên giới hạn khoảng 15 giây và file dưới 440 KB, xin quyền microphone khi người dùng bấm ghi âm. Chuỗi ví dụ trên là placeholder, không phải dữ liệu hợp lệ.

Trả `{transcript,feedback,improvements:string[]}` trong `data.result`. Đây là nhận xét định tính dựa trên âm thanh; không tạo điểm phát âm từ transcript. Bản chép lời qua SpeechRecognition dùng cho sửa ngữ pháp/nội dung Speaking, không thay thế file âm thanh.

### Khóa học và chấm bài

1. `GET /courses?language=en` lấy danh mục thực.
2. `GET /courses/:id` lấy `parts[].lessons[]` cùng `score,total,completed_at,content_status`.
3. `GET /course-lessons/:id` lấy `content.instruction`, `phrases` nếu có, `questions`; các trường đáp án được BE loại trước khi trả. Dùng `set_id` trong nội dung nếu có để mở bộ liên quan, không hardcode bộ 163.
4. `POST /course-lessons/:id/submit`:

```json
{"retry":true,"answers":[{"question_id":"1","answer":"hello"},{"question_id":"2","option_id":"2"}]}
```

Gửi đúng toàn bộ question ID thực một lần, dùng `answer` cho write, `option_id` cho choice. Trả `score,total,results,completed_at,replayed`. BE chấm và lưu, FE không tự ghi hoàn thành. Không gửi `retry:true` thì bài đã nộp trả lại kết quả cũ; khi người học chủ động làm lại phải gửi `retry:true` để chấm lại và cập nhật kết quả gần nhất. Sau nộp tải lại tiến độ khóa học.

### Học kết hợp và tiến độ

`GET /sets/:id/lessons` trả kế hoạch nhóm 5 từ, 5 bước. Mọi bước đều `available:true`; không khóa bước sau hoặc bắt mua gói. Start/complete vẫn dùng các route hiện có trong API-CONTRACT.

Hoàn thành cần bằng chứng thật: session đúng mode/đúng nhóm từ cho flashcard, learn, dictation; feedback/history đúng từ cho Speaking; hội thoại của chính người dùng có dùng các từ mục tiêu. Không gọi complete khi mới mở bài. Dictation hiện luyện từ, chưa tái tạo bài nghe điền câu riêng của nguồn.

## FE đã được Codex sửa trước khi xác nhận phân công

Anti cần đọc và giữ kết nối API khi chỉnh giao diện, tránh ghi đè bằng dữ liệu mẫu:

- `WordExample`, `StudySetView`: bỏ khóa dòng thứ tư, nhập ví dụ, sinh ví dụ theo từ/lô.
- `AiSettingsView`, AuthContext: cấu hình AI, refresh capabilities sau đăng nhập/đổi cấu hình; tránh race phiên cũ.
- `PronunciationPractice`, Speaking: ghi âm/upload và nhận xét audio thực.
- `CourseLessonView`, `CoursesView`: mở nội dung bài, TTS, nộp chấm trên BE, hỗ trợ retry.
- Comprehensive và các view AI: chọn bước tự do, điều hướng cấu hình nếu chưa có provider.
- Dashboard: đã nối dashboard/search API và trạng thái trống; Anti có thể đang tiếp tục sửa file này. Không đưa lại tiến độ mẫu 25/45/15 phần trăm.
- Sidebar: đã thêm Cài đặt AI, bỏ điều hướng lớp học/xếp hạng khỏi phạm vi học cá nhân. BE cũ vẫn giữ route để không phá dữ liệu.

## Kiểm chứng và vận hành

- 25 kiểm thử BE đã qua: auth/CSRF/quyền riêng tư, giữ ID/tiến độ khi seed, chấm bài/ôn tập, làm lại khóa học, ví dụ riêng, cấu hình AI, JSON provider, retry quá tải, inline audio và bổ sung chi tiết thẻ có cache/dedup/quyền riêng tư.
- Sáu tác vụ Gemini thật đã qua trong [live-ai-validation.json](live-ai-validation.json): câu hỏi, sửa Speaking, ví dụ, ngữ pháp, đọc hiểu, audio. Audio dùng WAV giọng tổng hợp để kiểm tra đường truyền; chưa đánh giá chất lượng bằng bản ghi giọng người dùng.
- [browser-qa.json](browser-qa.json): 10 luồng trình duyệt đã qua tại thời điểm kiểm tra. Anti đang sửa FE nên cần kiểm tra lại FE sau khi hợp nhất thay đổi.
- `run.bat` chạy cả FE/BE, `run-backend.bat` chạy BE. BE hiện đã khởi động lại để nhận endpoint chi tiết thẻ mới; FE chạy riêng được giữ nguyên. Với lần sửa tiếp theo, BE qua `dev:all` không tự theo dõi file. Không chạy chồng hai BE trên cổng 4000.
- SQLite ở `server/data/openquiz.sqlite`; không xóa/reset. Đã có backup trước cập nhật thư viện; khóa tài khoản và tiến độ được giữ. Không gửi `.env`, database hay backup cho người khác cùng tài liệu FE.

Kiểm thử BE không cần provider thật:

```sh
node --test --test-isolation=none server/tests/api.test.mjs server/tests/features.test.mjs server/tests/providers.test.mjs server/tests/content-import.test.mjs server/tests/personal.test.mjs
```
