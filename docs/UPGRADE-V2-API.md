> Mới nhất: contract1.15.0 / schema14 /148 route. Đọc BE-NEXT.md và UPGRADE-V2-SUBTITLES.md cho MATERIAL-03. Thông báo bên dưới là lịch sử.

> Mới nhất: contract1.14.0 / schema14 / 146 route. Đọc BE-NEXT.md và UPGRADE-V2-MATERIAL-CUES.md cho MATERIAL-02; các thông báo dưới đây là lịch sử.

# API V2 đã chạy — bản pilot đầu tiên

> Mới nhất **1.13.0/schema 13/142 route**: MATERIAL-01 thư viện audio/transcript riêng, lưu playback/A–B và chỉnh sửa. FE-MATERIAL-01 chưa có UI. Đọc UPGRADE-V2-MATERIALS.md và BE-NEXT.md; nhật ký BE tách sang BE-WORKLOG.md để tránh xung đột STATUS. Bộ27mục/158clip không đổi.

> Mới nhất **1.12.0/schema 12/134 route**: PHRASE-01 nối lưu cụm từ bài học vào bộ riêng/SRS hiện có, không gọi AI. Đọc UPGRADE-V2-PHRASES.md để nối FE-PHRASE-01 và xử lý hai điểm FE-AUDIO-02. Nội dung27mục/158clip giữ nguyên.

> Mới nhất **1.11.0/schema 11/131 route**: AUDIO-01 thêm nhận xét từ bản thu thật của bước phát âm, cache/retry riêng và thống kê định tính. FE-AUDIO-01 chưa tích hợp; thử Gemini thật hiện429. Đọc UPGRADE-V2-AUDIO-REVIEWS.md trước khi nối UI. Nội dung27mục/158clip giữ nguyên.

> Mới nhất **1.10.0/schema 10/128 route**: CONTENT-07 đủ24 bài thường/3 ôn chặng (27 mục,158 clip). Nền tảng18mục/IT-System9mục; API giữ nguyên, chương trình vẫn pilot chờ duyệt học liệu thực tế. Danh mục LEARNING-CURRICULUM.md; bàn giao UPGRADE-V2-CONTENT-07.md.

> Mới nhất **1.9.5/schema 10/128 route**: CONTENT-06 bổ sung ba bài nền tảng số lượng/tần suất/yêu cầu làm rõ. Tổng20 mục/116 clip, API không đổi. Xem UPGRADE-V2-CONTENT-06.md.

> Mới nhất **1.9.4/schema 10/128 route**: CONTENT-05 thêm ba bài IT/System, tổng17 mục/98 clip. Không đổi API; nhánh chuyên ngành vẫn tự chọn. Cleanup thu âm màn nghe đã kiểm bằng micro giả Chrome. Xem UPGRADE-V2-CONTENT-05.md.

> Mới nhất **1.9.3/schema 10/128 route**: CONTENT-04 thêm hiện tại tiếp diễn và ôn chặng thời gian. Tổng 14 mục học/80 clip. API và renderer giữ nguyên. Xem UPGRADE-V2-CONTENT-04.md; bản sửa FE-LISTEN-02 đã được kiểm lại bằng Chrome với lost-response retry.

> Mới nhất **1.9.2/schema 10/128 route**: sửa projection lịch sử nghe, bổ sung settings/cursor/summary/created_at; last_practised_at chỉ tính event tự luyện. Xem UPGRADE-V2-LISTENING-AUDIT.md, có checklist FE-LISTEN-02 sau kiểm Chrome thật.

> Mới nhất **1.9.1/schema 10/128 route**: [CONTENT-03](UPGRADE-V2-CONTENT-03.md) thêm ba bài quá khứ/kế hoạch. Tổng 12 mục học, thư viện nghe 12 học liệu/68 clip. Giữ API cũ; FE-LISTEN vẫn cần tích hợp theo UPGRADE-V2-LISTENING.md.

> Mới nhất **1.9.0/schema 10/128 route**: [nghe từng câu và shadowing](UPGRADE-V2-LISTENING.md), 9 học liệu/50 WAV từng câu, session riêng có resume/replay và thống kê tự luyện. Không đổi hợp đồng phiên bài học; Progress thêm listening_practice. Các thông số phiên bản phía dưới là lịch sử.

> Mới nhất1.8.0/schema9/121route: thêm [AI nhận xét bài đã nộp](UPGRADE-V2-AI-FEEDBACK.md), do người học chủ động yêu cầu; giữ bài gốc, đọc lại cache không gọi model. Bài học/điểm/tiêu chí ôn cũ không đổi.

> Mới nhất1.7.0/schema8/119route:9mục học (foundation8/system1), thêm [bài ôn chặng và metadata kết quả](UPGRADE-V2-CHECKPOINT.md). Payload phiên cũ giữ nguyên, bổ sung lesson_kind và summary.checkpoint khi có; completion khác với đạt tiêu chí ôn.

> Mới nhất1.6.1/schema8/119route:5bài (foundation4,system1). `foundation-routine-01` có8bước, thêm `reading_comprehension` với response_schemachoice; prompt gồm đoạn đọc và câu hỏi, options/submit/feedback giữ như choice khác. Dùng total_steps/steps thật. BE chấm đọc, Sổ lỗi tự ghi nếu sai và Progress.reading có bằng chứng sau nộp; chưa nộp vẫnnot_assessed, không phải 'không có bài đọc'. Chrome đã kiểm bài này chạy trên renderer hiện tại. Những thông số số bài/bước cũ bên dưới là lịch sử.

> Contract mới nhất1.6.0/schema8/119route: thêm [Tiến bộ/lịch sử/bài đã nộp](UPGRADE-V2-PROGRESS.md). Các ghi nhận version thấp hơn bên dưới là lịch sử; payload phiên học giữ nguyên.

> Contract hiện tại1.5.0/schema8/116route. Bổ sung [Sổ lỗi](UPGRADE-V2-MISTAKES.md): Today.mistake_summary và feedback.mistake_id; các payload phiên trong tài liệu này giữ nguyên. Thông số1.4.1 bên dưới ghi nhận bước trước.

21/10/2026, contract **1.4.1**, schema **7**, tổng112 route. Ưu tiên tài liệu này và [STATUS](UPGRADE-V2-STATUS.md) hơn API dự kiến trong HANDOFF. Không có AI cá nhân hóa, kho video, sổ lỗi hay24 bài trong lượt này. Không sửa FE ở lượt BE này.

### Cập nhật tiếp theo cho Anti

- Hiện có **4 bài**: foundation3 bài (giới thiệu, giờ giấc/lịch học, nhờ giúp đỡ), IT/System1 bài giới thiệu. Giữ statuspilot, không gắn cứng số bài trong FE. ID mới: `foundation-time-01`, `foundation-help-01`; cùng renderer/payload bảy bước như trước, có WAV thật và câu hỏi riêng.
- `GET /learning/today` thêm `scheduled_day:boolean|null`, `preferred_days:number[]|null`, `schedule_policy:preferred_days|legacy_unrestricted`, `resume_lesson_id`, `resume_route`. Profilepreferred_days có tác dụng với kế hoạch mới; không giao bài mới ngoài lịch đã chọn, vẫn ôn SRS và tiếp tục bài dở. Bài tự chọn vẫn start được bất cứ ngày nào.
- `status:rest_day` là ngày ngoài lịch, không có item; không phải lỗi. Hiện thông điệp và nút Thư viện. Nếu resume_route có thì luôn hiện Tiếp tục, kể cả items rỗng/rest_day: nó có thể là phiên người học vừa tự mở ngoài kế hoạch. Liên kết này không viết lại items của kế hoạch đã chốt.
- Snapshot ngân sách/ngày đã chọn/items được giữ trong ngày; đổi hồ sơ áp dụng kế hoạch ngày sau. Kế hoạch tạo ở bản trước được giữ nguyên với schedule_policylegacy_unrestricted, scheduled_daynull; không xóa/rebuild dữ liệu người học.
- 7 kiểm thử tập trung profile/V2 đạt sau cập nhật này; 45 kiểm thử toàn BE ở cuối tài liệu là baseline lịch sử, không vừa chạy lại. Không đổi schema, không gọi AI, không sửa FE.

## Nội dung thực

GET `/api/v1/learning/programs`: `data.items` gồm hai chương trình `english-foundation` (foundation,3 bài) và `english-it-system` (specialist,1 bài), status `pilot`. Không hiển thị thành24 bài hoặc giáo trình đã hoàn thiện.

GET `/api/v1/learning/programs/:id`: metadata + `units[].lessons[]` với id/title/version/estimated_minutes/objectives/recommended_prerequisites/completed_at. Prerequisite là khuyến nghị, không khóa. Có thể bắt đầu cả bài IT trực tiếp; kế hoạch của profile general chỉ chọn nền tảng; profile system chọn nền tảng trước rồi IT.

ID bài: `foundation-introductions-01`, `foundation-time-01`, `foundation-help-01`, `system-introductions-01`. Nội dung tự soạn; có bản dịch và **file WAV thật**. Audio là Microsoft David Desktop TTS lưu sẵn, chưa được người nghe thẩm định; không gắn nhãn giọng người thật/chuẩn phát âm đã chấm. Đã kiểm tra WAV có sample và duration, request range hoạt động. Chưa kiểm tra loa/micro của người dùng.

## Kế hoạch Hôm nay

GET `/api/v1/learning/today` trả `data`:

```json
{
  "plan_id":"uuid",
  "local_date":"2026-10-21",
  "timezone":"Asia/Ho_Chi_Minh",
  "budget_minutes":30,
  "items":[{
    "id":"lesson","kind":"lesson",
    "lesson_id":"foundation-introductions-01","content_version":1,
    "title":"Giới thiệu bản thân","estimated_minutes":20,
    "session_id":null,"route":null,"status":"ready"
  }],
  "resume_session_id":null,
  "status":"ready",
  "profile_changes_apply":"next_local_day"
}
```

Trên là hình dạng ví dụ; UUID và số phút lấy response thật. Có ôn SRS đến hạn thì thêm item kindreview, route `/repetition-study`, due_count thực; không giả có từ phải ôn. Kế hoạch được lưu một lần theo user/ngày địa phương, không đổi bài/budget khi reload hoặc đổi focus giữa ngày. Trạng thái bài và ôn được cập nhật từ dữ liệu thật. Session đang dở ưu tiên; preferred_days áp dụng theo cập nhật đầu tài liệu. Chưa có thuật toán tối ưu khối lượng dài hạn hoặc dồn bù bài lỡ.

- Item có session_id: mở `/lesson-run/:id`.
- Chưa có session: POST `/learning/sessions` với lesson_id rồi mở route bằng id trả về. Không navigate tới route null.
- statuscompleted: có thể xem kết quả hoặc chủ động học lại/tự chọn trong thư viện. Không tự sinh vô hạn bài mới cùng ngày.
- statuscontent_exhausted + itemsempty: chưa có nội dung mới, hiện trạng thái trống và các lựa chọn học lại/thư viện. Không giả đang tạo bằng AI.
- Budget là thời gian dự kiến. Bài20phút với budget15phút có thể học hai phiên, không cắt mất bước. UI cho dừng và tiếp tục.
- Các lựa chọn thời gian/focus ảnh hưởng kế hoạch ngày sau; thay timezone có thể chuyển sang ngày địa phương khác. Profile không tự đăng ký/chứng nhận trình độ; program_id hiện vẫnnull.

## Session — endpoint và envelope

| Route dưới `/api/v1` | Body | `data` trả |
| --- | --- | --- |
| POST /learning/sessions | `{lesson_id,resume:true}` | session, thêm replayed; 201 nếu mới |
| GET /learning/sessions/:id | — | session |
| PUT /learning/sessions/:id/draft | `{step_id,revision,response}` | session với revision mới |
| POST /learning/sessions/:id/submit | `{step_id,revision,submission_id,response,assistance_used:[]}` | `{feedback,session,replayed}` |
| POST /learning/sessions/:id/advance | `{step_id,revision}` | session |

resume mặc địnhtrue, false tạo lượt mới. Người khác đọc/sửa session trả404. Session bám phiên bản nội dung khi bắt đầu, không bị seed cập nhật ngầm. Bài cũ và bảng tiến độ course/SRS giữ riêng, không cộng điểm hai lần giữa các hệ thống.

Session gồm id, lesson_id, program_id, title, objectives, content_version, revision, cursor, statusactive/completed, steps, current, media, transcript, translation, provenance, results, summary và timestamps. `steps` chỉ là metadataid/type/title/state để vẽ tiến độ; **render nội dung từ current**. `current:null` khi xong.

Mỗi current có id/type/title/prompt/response_schema, media và các trường tùy loại (options, instruction, phrases, target, guidance, model, rubric), draft, feedback. Answer/explanation của câu chưa chấm không trả. Transcript được gửi như công cụ hỗ trợ: FE mặc định gập ở bước nghe, bật khi người học yêu cầu; ghi assistance_used khi mở, không giả transcript bị BE khóa.

## Renderer cho7bước đang có

| type | response_schema | Điều FE làm |
| --- | --- | --- |
| listen_comprehension | choice | Player + prompt + options; transcript/dịch mở theo yêu cầu |
| vocabulary_in_context | acknowledge | Render phrases[{text,translation}], nghe lại và xác nhận đã luyện |
| grammar_practice | choice | instruction + prompt + options, chỉ hiện đáp án khi feedback |
| pronunciation_practice | self_reflection | Audio/target/guidance, cho thử nói và tự đánh giá; không hiện điểm phát âm giả |
| speaking_task | text | Cho nói hoặc nhập bản chép lời, hiện model/rubric, xác nhận tự kiểm tra |
| writing_task | text | Nhập bài viết, model/rubric, xác nhận tự kiểm tra; lưu bản gốc |
| reflection | self_reflection | Xác nhận hoàn tất và reflection tùy chọn |

Các payload response:

```json
{"option_id":"a"}
```

```json
{"acknowledged":true}
```

```json
{"acknowledged":true,"reflection":"Tôi muốn ôn cụm university student."}
```

```json
{"text":"I am a student. I live in Hanoi.","self_reviewed":true}
```

Trường response.text dùng chung cho bản chép lời Speaking và bài viết, không gửi `transcript` thay text vào endpoint này. Draft text cho phép rỗng/chưa self_reviewed; submit bắt buộc text không rỗng và self_reviewedtrue. Không kiểm chất lượng ngữ nghĩa bằng độ dài; bước này là **tự luyện**, không chấm đúng giả. Chưa có skip API trong pilot; không gửi skip:true rồi cho UI coi là hoàn thành.

### Ví dụ submit đầy đủ

```json
{
  "step_id":"listen-main",
  "revision":0,
  "submission_id":"de84b086-e11a-45da-9a11-030dc9c25268",
  "response":{"option_id":"a"},
  "assistance_used":["transcript"]
}
```

submission_id tạo bằng crypto.randomUUID(), giữ lại khi retry cùng nội dung. assistance_used chỉ nhận transcript/translation/model, tối đa3, không trùng. Đây là ghi nhận hỗ trợ, không tự giảm điểm bằng FE.

Choice feedback có assessment_statusgraded, correct, expected_option_id, explanation. Bước mở trả assessment_statusself_review, correctnull, rubric/message. Sau submit giữ nguyên cursor để đọc feedback; nhấn Tiếp tục mới POSTadvance bằng revision mới từ session trả về. Sai vẫn được tiếp, không giả là đã đúng. Không gọi advance ngay khi nhận feedback rồi làm mất phản hồi.

Kết thúc có summary.completedtrue nhưng masteredfalse; graded_correct/graded_total chỉ tính các câu có chấm (pilot2câu). Không đưa self-review vào tử/mẫu số như câu đúng. results lưu theo step_id. Chưa tạo sổ lỗi/lịch ôn câu tự động — đợt2 mới làm.

## Đồng thời, replay và lỗi

- Lưu draft nối tuần tự hoặc debounce có hàng đợi; lấy revision từ response mới nhất. Không gửi draft song song rồi ghi đè input mới bằng response cũ. Khi submit chờ draft đang lưu xong.
- revision cũ:409 REVISION_CONFLICT, details.revision; GET lại session và giữ bản nhập cục bộ chưa gửi để giải quyết. Không lặp request vô hạn.
- Cùng submission_id + cùng nội dung: trả replayedtrue, không chấm/ghi thêm lần nữa. Cùng ID khác nội dung:409 IDEMPOTENCY_CONFLICT. Sửa đáp án sau submit bằng IDmới không được; muốn học lại tạo phiên mới.
- Tiến trước nộp:409 SUBMIT_REQUIRED; sai bước:409 STEP_OUT_OF_ORDER; nộp thêm cùng bước:409 ALREADY_SUBMITTED. Self-review chưa xác nhận:400 SELF_REVIEW_REQUIRED. Invalid option/type/assistance:400.
- Save/submit/advance lỗi giữ input, hiện retry, không tự tăng tiến độ FE. Lỗi AI không liên quan đường học pilot này: không gọi Gemini trong start/get/draft/submit/advance.

## Audio

media.url là `/api/v1/learning/media/:id` qua Vite proxy, có cookie cùng ứng dụng. GET trả binaryaudio/wav, không envelope JSON. Có Range206 và Content-Range/Accept-Ranges. Không dùng api.getJSON cho media. HTMLaudio/player có thể dùng url trực tiếp; tốc độ 0.75/0.9/1.0 tùy UI. Không có timestamp câu trong pilot, `segments:[]`: không vẽ segment giả. Có thể lặp cả audio; luyện từng câu dùng TTS hiện có và ghi nhãn khác.

Có media id, duration_ms thật, sourcewindows_tts, voice, human_audio_reviewedfalse. Chưa có upload/record endpoint hoặc file audio cá nhân được lưu BE. FE có thể ghi âm/nghe lại tại máy nếu làm được, không ghi 'đã lưu lên BE'. Microphone chỉ xin quyền sau nút người học bấm.

## Nghiệm thu BE

`node --test --test-isolation=none server/tests/*.test.mjs`:45 đạt,0 lỗi, không gọi AI thật. Bốn bài test V2 bao gồm WAV/range, quyền, revision/draft/replay/feedback, hoàn thành, ngày địa phương/plan ổn định và version/seed/DB. Livehealth schema 7 trả200. Không có xác nhận tích hợp FE hoặc loa/micro thật ở lượt này; Anti kiểm tra sau khi nối.
