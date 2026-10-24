> Mới nhất: contract1.17.0/schema14/151 route, LEARNING-CONSISTENCY-ANTI.md và BE-NEXT.md. CLARITY-02 FE còn pending.

> Mới nhất24/10: contract1.16.0/schema14/149 route; đọc BE-NEXT.md và LEARNING-CLARITY-ANTI.md. Báo cáo chốt cũ chưa bao phủ lỗi SRS/UX mới.

> Mới nhất: contract1.15.0 / schema14 /148 route. Đọc BE-NEXT.md và UPGRADE-V2-SUBTITLES.md cho MATERIAL-03. Thông báo bên dưới là lịch sử.

> Mới nhất: contract1.14.0 / schema14 / 146 route. Đọc BE-NEXT.md và UPGRADE-V2-MATERIAL-CUES.md cho MATERIAL-02; các thông báo dưới đây là lịch sử.

> Bàn giao BE mới nhất: [BE-NEXT.md](BE-NEXT.md), contract1.13.0/schema13/142route. MATERIAL-01 đã có API, FE-MATERIAL-01 chờ nối. Nhật ký BE ở BE-WORKLOG.md; STATUS giữ tiến độ FE, tránh lưu đè từ buffer cũ.

# Bàn giao BE hiện tại cho Anti

> Bổ sung V2 đã triển khai: GET/PUT `/learning/profile`, contract1.3.1/schema6/103route. Xem [trạng thái chung Codex/Anti](UPGRADE-V2-STATUS.md) cho payload và phân công mới nhất. Bản bên dưới ghi nhận nền BE1.3.0.

Cập nhật 21/10/2026 sau khi đọc lại code Anti đã chỉnh. **Anti phụ trách giao diện; Codex phụ trách BE.** Tài liệu này ưu tiên hơn các báo cáo cũ về model 3.8, hạn mức AI và liên kết bài học. Không chép lại trạng thái khóa Pro từ website nguồn.

Contract **1.3.0**, SQLite schema **6**, **101 route**. Đã chạy toàn bộ **40 kiểm thử BE thành công**, build TypeScript/Vite thành công và kiểm tra HTTP 200 trên FE 3000/API 4000. Các kiểm thử gateway kiểm tra logic, không thay cho đánh giá chất lượng model. Các báo cáo Chrome có thời điểm riêng; ảnh local không phải cam kết FE Anti hiện tại đã nối hết API mới.

## Trạng thái đã xác minh

- `.env` và BE đang chạy đều chọn **gemini-3.5-flash**. Model có trong danh sách API được key hiện tại cho phép. Yêu cầu thật trả HTTP 200; lời mở đầu/gợi ý/dịch hội thoại và gợi ý Speaking đã gọi thật thành công. Xem [kiểm tra kết nối hiện tại](current-ai-connection.json) và [luồng AI thật](live-functional-validation.json).
- Báo cáo 429 khoảng bốn giờ ở lượt trước thuộc `gemini-3.8-flash`. Không dùng lỗi của model cũ để hiện “AI hết lượt” trên cấu hình mới. Không tự đổi model hay billing; `.env` hiện tại được giữ nguyên.
- Đã sửa việc xem lại ví dụ có sẵn vẫn tiêu tốn giới hạn AI local. Cache trả trực tiếp, chỉ khi cần model mới tính lượt. Hai yêu cầu dịch cùng một tin đang chạy dùng chung lời gọi; xóa hội thoại xóa luôn bản dịch cache của nó.
- Lưu API key riêng mà không gửi `model` nay kế thừa model hiện tại, không âm thầm chuyển về default cũ. `GET /settings/ai` có `configuration_source: environment|account|gateway`; không bao giờ trả key.
- Đã sửa liên kết A1 theo chủ đề, thay cho ghép bài số N với bộ từ số N. Ví dụ bài “What's Your Name?” liên kết bộ Chào hỏi, “Numbers & Age” liên kết Số đếm. Bài cũ được sửa metadata liên kết, giữ nguyên nội dung và điểm/tiến độ.

## Quy tắc nối FE

API `/api/v1`, cookie phiên, mutation có `X-Requested-With: OpenQuiz`, JSON. Success đọc `data`; lỗi đọc `error.code/message/details`. Không tự tăng tiến độ, tạo điểm hoặc câu trả lời mẫu. Không dùng `original_course_bodies:false` hay các cờ provenance để khóa học liệu local.

| Màn hình | BE cần gọi | FE cần giữ |
| --- | --- | --- |
| Bộ thẻ | `GET /sets/:id`; `POST /words/:id/learning-details`; `PUT /words/:id/notes` | Mặt sau có nghĩa/đồng nghĩa/ví dụ/nghe/dịch. Không gọi AI lại khi đã có ví dụ và bản dịch |
| Cài đặt học/nghe | `GET /study/options?set_id=:id&mode=learn|dictation`; `PATCH /me` | Hiện số từ sao/chưa thuộc thực tế, gửi settings thật khi tạo phiên |
| Học/nghe chép | `POST /study/sessions`, GET session, POST answers/correction | Giữ câu đang phản hồi tới khi Tiếp tục; Ctrl đơn nghe, Enter kiểm tra/tiếp; không chiếm tổ hợp Ctrl hoặc Enter trên nút |
| Ngữ pháp | `/exercise-attempts` kind grammar_order + draft/answers/next | Token ID ổn định, chọn/bỏ, ba dạng bài, độ khó, đáp án chỉ xuất hiện sau chấm |
| Đọc hiểu cả trang | `/exercise-attempts` kind reading + GET questions + PUT drafts + POST submit | Ngân hàng từ và MCQ cùng trang giống ảnh; gửi đủ question_id đúng một lần, không tự chấm |
| Hội thoại | POST conversations/settings, start, messages, hint, translation; GET history | Có setup và lời mở đầu; lỗi giữ input, không lưu nửa cuộc hội thoại |
| Speaking | `/ai/generate` với word_ids đúng mục tiêu; `/ai/history` | Đổi câu hỏi/gợi ý/dịch/feedback và khôi phục đúng từ/câu trả lời |
| Khóa học | GET courses/course/lesson + **GET /course-lessons/:id/activities** | Lấy route thật và tiến độ thật; không trỏ tất cả về 163, không đánh dấu bài đầu hoàn thành sẵn |
| Luồng trong bài khóa học | POST lesson sessions; GET course-learning-session; PUT draft; POST step complete | Dựng từ `steps` của BE; lưu/khôi phục đúng bước, không tự tạo bảy hoạt động/câu chào hỏi dự phòng |

## Học: đừng đồng nhất “trả lời đúng một lần” với “đã hoàn thành từ”

Đối chiếu mới trên nguồn: màn bộ 163 hiển thị 12 từ và bộ đếm ban đầu 20 câu; sau ba câu đã gửi, bộ đếm hoàn thành từ vẫn bằng 0. Quan sát ba bước chưa đủ suy ra thuật toán riêng của nguồn. Xem [bằng chứng REA](anti-reference/REA-BACKEND-AUDIT-2026-10-21.json).

BE nay hỗ trợ tiêu chí luyện nhớ rõ ràng qua `required_correct`. Cấu hình từ `GET /study/options` đề xuất 2 lần đúng liên tiếp mỗi chiều, giới hạn 3 lượt. Đây là lựa chọn của ứng dụng, không khẳng định là thuật toán độc quyền của OpenQuiz.

```json
{
  "set_id": 163,
  "mode": "learn",
  "settings": {
    "direction": "both",
    "question_types": ["write", "quiz"],
    "answer_mode": "meaning",
    "required_correct": 2,
    "max_attempts": 3,
    "adaptive": true,
    "accept_synonyms": true,
    "auto_advance_on_correct": false
  }
}
```

- Đúng lần đầu chưa tăng `completed_words` khi mục tiêu là 2; BE xếp lượt nhớ lại vào cuối hàng đợi. Sai đặt chuỗi đúng liên tiếp về 0.
- Hai chiều: mỗi chiều có chuỗi riêng; từ chỉ hoàn thành khi đủ mục tiêu ở cả hai chiều đã chọn. Trả lời lại cùng question_id không tạo lượt hoặc điểm mới.
- `word_mastery:[{word_id,direction,correct_streak,required_correct,complete}]` giải thích tiến độ thật. `completed` là lượt đã chấm, `correct` là lượt đúng, `completed_words` là từ đạt mục tiêu trong phiên. Các số này khác SRS `mastered`.
- Khi đạt giới hạn mà chưa đủ mục tiêu, `retry_limit_reached:true`; hiển thị “còn từ cần ôn”, không tuyên bố đã thuộc hết.
- Để tương thích, POST không có `required_correct` giữ hành vi cũ là 1. **Anti cần lấy settings từ GET /study/options hoặc gửi rõ `required_correct:2`** để dùng tiêu chí mới; không chỉ đổi nhãn trên giao diện.
- `max_attempts` phải lớn hơn hoặc bằng `required_correct`; phiên cũ không bị viết lại. Lưu lựa chọn vào `settings.study.learn` của `/me`.
- Không gắn cứng mẫu số 20: đó là điều quan sát ở nguồn, chưa có đủ bằng chứng về cách tính. Dùng `session.total` và trạng thái hàng đợi từ BE.

Ví dụ `GET /study/options?set_id=163&mode=learn` trả `defaults`, `saved`, `settings`, danh sách lựa chọn hợp lệ và `counts:{total,starred,unmastered}`. `settings` gộp mặc định với tùy chọn người dùng; không dùng số từ mẫu để bật/tắt bộ lọc.

## Khóa học: hoạt động và bộ từ liên quan

`GET /course-lessons/:id/activities` trả:

```json
{
  "course_id": 1,
  "lesson_id": 2,
  "linked_set": {"id": 13575, "title": "[A1 Level] Chào hỏi và giới thiệu"},
  "activities": [
    {"key":"lesson","scope":"lesson","title":"Bài học","route":"/courses/1/lesson/2"},
    {"key":"flashcards","scope":"lesson","title":"Flashcards và nghe mẫu câu","route":"/courses/1/lesson/2?tab=cards"},
    {"key":"practice","scope":"lesson","title":"Bài tập chấm trên server","route":"/courses/1/lesson/2?tab=practice"}
  ],
  "progress": null,
  "completion_rule": "submit_course_lesson"
}
```

Ví dụ trên rút gọn mảng activities. Khi có bộ từ liên kết thật, BE thêm vocabulary/grammar/dictation/speaking/conversation/reading với `scope:topic`, set_id và route tương ứng. Không có set liên kết thì không có các hoạt động chủ đề đó; không fallback 163. Chỉ hiển thị số hoạt động thực trả về.

`scope:lesson` là chính mẫu câu/bài tập của bài. `scope:topic` là ôn mở rộng theo bộ từ chủ đề, không được ghi là toàn bộ từ của đúng bài. Nộp bài qua `/course-lessons/:id/submit` mới cập nhật `course_progress`; chỉ mở flashcards hoặc nghe âm thanh không tự đánh dấu hoàn thành bài. Bài đã nộp có thể vẫn điểm thấp, không được đồng nhất với “đã thành thạo”.

## Luồng bài khóa học: thay `buildActivities` và tiến độ tạm của FE

`src/views/CourseLessonView.tsx` hiện tự dựng các bước học và có mẫu chào hỏi dự phòng khi bài thiếu mẫu câu. **Anti cần thay phần điều khiển này bằng session BE bên dưới.** Không chỉ đổi CSS. BE không tạo câu chào hỏi cho bài không có mẫu câu; bài chỉ có questions sẽ có đúng bước quiz.

1. Bắt đầu/tiếp tục: `POST /course-lessons/:lesson_id/sessions` body `{}`. BE mặc định tiếp tục lượt chưa hoàn thành cùng phiên bản nội dung. Chủ động học lại gửi `{"resume":false}`. Trả session trong `data`.
2. Khôi phục theo ID: `GET /course-learning-sessions/:id`. Lịch sử: `GET /course-learning-sessions?lesson_id=:lesson_id`.
3. Render `session.current`, thanh tiến độ dùng `index/total`. `steps` được tạo từ mẫu câu thật của bài: mỗi mẫu có bước vocab rồi speaking, cuối là quiz. Ba mẫu có bảy bước, năm mẫu có mười một bước; không gắn cứng số bảy.
4. Chuyển bước bằng `POST /course-learning-sessions/:id/steps/:step_id/complete`. Dùng đúng step_id hiện tại, nhận lại session đầy đủ. Bước đã hoàn thành gửi lại trả `replayed:true`, không cộng điểm hay tiến độ lần nữa. Gửi bước tương lai trả 409 `STEP_OUT_OF_ORDER`.
5. Chỉ quiz cuối cập nhật `course_progress`. Không gọi thêm direct `/course-lessons/:id/submit` sau khi đã nộp quiz qua session.

Payload cho từng loại bước:

```json
{"acknowledged":true}
```

Dùng với `type:vocab` sau người học xác nhận đã xem/nghe. Hiển thị `english`, `vietnamese`, `phrases`, đọc bằng TTS hiện có.

```json
{"transcript":"Hello, my name is Anna."}
```

Dùng với `type:speaking`. Đây là kiểm tra từ nhận dạng với câu mẫu, chuẩn hóa dấu câu/hoa thường/một số dạng rút gọn. **Không phải chấm phát âm.** Không khớp: giữ bước, lưu feedback để reload vẫn thấy; cho nghe/nói lại. Người học có thể chủ động gửi `{"skip":true}`: BE ghi `skipped:true,matched:false`, không giả là nói đúng. Muốn nhận xét âm thanh thật, dùng endpoint pronunciation đã có, không tự suy điểm từ transcript. Ctrl đơn đọc câu mẫu của bước, tổ hợp Ctrl giữ nguyên.

```json
{"answers":[{"question_id":"1","answer":"hello"},{"question_id":"2","option_id":"2"}]}
```

Dùng với `type:quiz`, lấy đúng questions/options trong session (ID minh họa). Phải gửi đủ câu đúng một lần. Đáp án trước chấm đã bị loại khỏi response. `PUT /course-learning-sessions/:id/draft` cùng dạng answers cho phép lưu một phần khi đang ở quiz; reload lấy `quiz_draft`. Lỗi câu/option trùng hoặc không hợp lệ không ghi điểm và không chuyển bước. Kết quả cuối có `grade:{score,total,results,completed_at}`, status `completed`, current `null`. Hoàn thành lượt không có nghĩa điểm tuyệt đối; render score thật.

Session lưu riêng theo tài khoản; người khác đọc trả 404. Nội dung bài thay đổi trong lúc học trả 409 `COURSE_LESSON_CHANGED`: giải thích và cho bắt đầu lượt mới, không tự nộp đáp án cũ. SQLite đã có backup trước migration 6; giữ nguyên DB để bảo toàn lịch sử. Các bộ từ `scope:topic` trong activities là hoạt động mở rộng, không được đưa vào session bài rồi đánh dấu hoàn thành giả.

## AI: phân biệt ba trạng thái

1. `configured:true`: có cấu hình/key, chưa phải kết quả kiểm tra kết nối hay đánh giá chất lượng.
2. `POST /settings/ai/test` thành công: model hiện tại trả lời thật. Hiển thị tên model từ GET, không ghi cứng 3.8 ở FE.
3. Lỗi provider: `AI_RATE_LIMITED` là 429 phía Gemini, có `details.retry_after_seconds` nếu được cung cấp; `RATE_LIMITED` là bộ giới hạn local. Timeout/network/JSON không hợp lệ có code riêng. Giữ nội dung đang nhập, không biến lỗi thành khóa Pro.

Không sinh ví dụ toàn bộ hàng nghìn từ khi chỉ mở dashboard. Đọc cache trước; tạo theo thẻ/bộ đang học, chia lô khi người học yêu cầu. Không tự đổi model trả phí hoặc xóa key để “sửa quota”.

`run.bat` chạy cả FE/BE. Launcher kiểm tra cổng 3000/4000 trước, báo rõ khi đang bận; không cưỡng bức tắt mọi tiến trình trên hai cổng. Giữ cửa sổ server hiện tại nếu Anti đang làm, hoặc dừng server từ chính cửa sổ đã mở nó rồi chạy lại.

## Ảnh và tài liệu để dựng giao diện

Mở [gallery nguồn/local](anti-reference/index.html). Ảnh người dùng và ảnh nguồn đã được lưu trong cùng thư mục, có cặp câu hỏi/phản hồi/cài đặt/nghe chép/ngữ pháp/đọc hiểu/hội thoại/Speaking. Anti dùng ảnh nguồn để dựng CSS/bố cục, giữ hành vi BE theo tài liệu này.

- [Học và nghe chép — hợp đồng chi tiết](STUDY-LOGIC-CONTRACT.md)
- [Ngữ pháp/đọc hiểu — cả API từng câu và cả trang](EXERCISE-FE-HANDOFF.md)
- [Hội thoại/Speaking](CONVERSATION-SPEAKING-CONTRACT.md)
- [Ma trận chức năng và danh mục ảnh](ANTI-FUNCTIONAL-HANDOFF.md)
- [Route API](API-ROUTES.md) và [OpenAPI](openapi.json)

Phần FE vẫn cần Anti xử lý: bố cục màn học riêng, modal đúng ảnh, render reading toàn trang qua batch API, nút khóa học dùng activities endpoint, thay `CourseLessonView` bằng course learning sessions, và lấy cấu hình học từ study/options. Dashboard hiện còn đoạn search điều hướng sang courses thay vì dùng kết quả search; API `/search?q=` đã có, Anti cần nối, không sửa BE để trả dữ liệu giả theo giao diện đó.

Các bổ sung BE được kiểm tra trong `server/tests/backend-audit.test.mjs`: cache không tiêu lượt AI, đồng thời dịch chỉ gọi một lần, xóa hội thoại sạch, kế thừa model, giữ dữ liệu khi sửa liên kết khóa học, quyền sở hữu và chuỗi nhớ lại/resume. Không khẳng định đã giống 100% các màn chưa quan sát hoặc micro/loa vật lý chưa thử.
