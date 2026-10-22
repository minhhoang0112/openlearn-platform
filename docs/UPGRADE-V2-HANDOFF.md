# Bàn giao triển khai V2 cho Codex BE và Anti FE

> Cập nhật triển khai ưu tiên: [UPGRADE-V2-STATUS.md](UPGRADE-V2-STATUS.md) và [API V2 thực tế](UPGRADE-V2-API.md). Profile, programs, today, media và session/draft/submit/advance đã có ở mức pilot; phần thiết kế bên dưới không thay cho payload thực tế.

Đọc [thiết kế sản phẩm](UPGRADE-V2-PLAN.md) trước. Ngày 21/10/2026. **Các API/tables V2 dưới đây là đề xuất, chưa được cài.** BE đang có contract1.3.0/schema6/101route theo [bàn giao hiện tại](ANTI-BE-HANDOFF.md); không nâng version/chạy migration chỉ vì tài liệu này tồn tại.

**Phạm vi đã chỉnh:** chương trình nền tảng dùng chung; English for IT/System là khóa riêng cho người dùng hiện tại. Không hardcode system cho mọi user. Đợt 1 phục vụ tài khoản cá nhân hiện tại; AI xây lộ trình theo hồ sơ của nhiều người là giai đoạn sau.

## 1. Phân công và cách làm song song

| Người làm | Sở hữu | Không tự sửa khi bên kia đang làm |
| --- | --- | --- |
| Codex BE | server/**, migration, seed bài V2, API, kiểm thử BE và hợp đồng | src/**/FE, CSS |
| Anti FE | src/**, giao diện, audio player/recording, nối API, kiểm thử UI | server/**, DB, .env, key/model |
| Hợp đồng chung | Hai tài liệu V2 này và sau đó route/type export | Không đổi tên trường/payload âm thầm |

Anti có thể làm sidebar và màn trình bày đợt 1 ngay, theo mock chỉ chạy ở chế độ phát triển/story/demo riêng có nhãn rõ. Bản chạy bình thường không dùng mock khi API thiếu hoặc lỗi. Codex làm API/seed song song. Khi API đã kiểm tra, nối một bài xuyên suốt trước rồi mới mở các màn mới khác. Không cần giao tiếp bằng cách ghi đè file của nhau.

Khi bắt đầu một đợt, ghi một dòng trạng thái bên dưới bảng công việc: endpoint nào implemented/tested, FE nào integrated. Tài liệu thiết kế không được tính là đã triển khai. Chỉ thêm route vào OpenAPI sau khi handler tồn tại. Nếu cần đổi contract, cập nhật cả mô tả và consumer liên quan trong cùng đợt, báo rõ thay đổi.

## 2. Kế thừa BE hiện tại

- Giữ auth/cookie, envelope `{data,request_id}`, mutation `X-Requested-With: OpenQuiz`, quyền theo tài khoản và giới hạn body hiện tại.
- Giữ `/study/sessions`, `/study/options`, word_progress/SRS; `/exercise-attempts`; `/conversations`; `/ai/generate`; course_learning_sessions và course_progress. Không thay bảng/ID để đồng nhất chương trình V2 với khóa cũ.
- Phần course lesson hiện tại chỉ có vocab/speaking/quiz. V2 cần nhiều kiểu bước hơn: dùng service mới để điều phối, adapter liên kết các service cũ bằng evidence ID; không tạo điểm giả hoặc ghi hai lần activity/SRS.
- Giữ schema6. Migration tiếp theo phải đọc version thực tại lúc triển khai; backup trước thay đổi, transaction, kiểm tra mở lại. Không reset seed/database.
- Không chuyển SRS từ sang SRS câu bằng cách thay word_id; câu/cụm mới có bảng tiến độ riêng hoặc model review-item rõ ràng trong đợt 2.

## 3. Route FE dự kiến

`/today`, `/my-program`, `/lesson-run/:sessionId`, `/practice`, `/listening-library`, `/mistakes`, `/progress`, `/settings/learning`. Các route hiện có vẫn giữ. `/` có thể điều hướng tới `/today` sau khi luồng đã tích hợp; trước đó dashboard cũ hoạt động bình thường. /practice gom liên kết chức năng cũ, chưa tự tạo endpoint riêng nếu không cần.

Sidebar theo PLAN; bỏ Xếp hạng/Báo lỗi khỏi điều hướng, giữ route/API để tránh phá dữ liệu. Không sửa sâu học liệu/ngữ nghĩa trong component chỉ để khớp ảnh. Phần mới theo workflow của mình; phần cũ tiếp tục tham khảo gallery OpenQuiz.

## 4. API đợt 1 dự kiến — base /api/v1/learning

| Method/path | Request chính | Response data chính |
| --- | --- | --- |
| GET /profile | — | time_budget_minutes, focus, timezone, preferred_days, program_id |
| PUT /profile | time_budget_minutes:15/30/45, focus:general/system, timezone:IANA, preferred_days:1..7 | profile đã lưu, ISO ngày cập nhật |
| GET /programs | — | items gồm id/title/version/status/lesson_count thực |
| GET /programs/:id | — | units, lesson metadata, objectives, progress thực |
| GET /today | — | plan_id, local_date, budget_minutes, items, resume_session_id, status |
| POST /sessions | lesson_id, resume:true mặc định | session với steps/cursor/version/status |
| GET /sessions/:id | — | session riêng của người học |
| PUT /sessions/:id/draft | step_id, revision, response | session/draft revision mới |
| POST /sessions/:id/submit | step_id, revision, submission_id(UUID), response, assistance_used | feedback, session, evidence |
| POST /sessions/:id/advance | step_id, revision | cursor tiếp, trạng thái mới |

Mỗi dòng là route đầy đủ, ví dụ `/api/v1/learning/today`. Chưa có các endpoint này. API import, mistake bank, progress tổng hợp và plan-rebuild ở đợt sau cần đặc tả thêm trước triển khai, không giả là đã gồm trong đợt 1.

`timezone` mặc định Asia/Ho_Chi_Minh. `preferred_days` ISO: thứ Hai1…Chủ nhật7. User settings hiện tại không bị thay toàn bộ khi cập nhật profile. GET/profile khi chưa lưu trả default có `is_default:true`; không tự suy kết quả placement.

`focus:general|system` là phạm vi tối thiểu của đợt cá nhân, không phải thiết kế cố định cho mọi nghề. Chuẩn bị chương trình với `kind:foundation|specialist` và stable slug; kế hoạch tham chiếu bài từ khóa đã chọn. Người dùng mới mặc định general, người dùng hiện tại có thể chọn system; không seed ghi đè hồ sơ mọi tài khoản. Khi mở rộng mới bổ sung enrollment nhiều khóa và bộ mục tiêu dạng danh mục qua migration/contract riêng; không giả hỗ trợ y khoa/kinh doanh khi chưa có nội dung.

Kế hoạch hôm nay tạo một lần theo tài khoản/ngày địa phương khi cần, lưu snapshot để reload không xáo trộn. Items chỉ tham chiếu nội dung published và ôn thực có quyền. Phiên chưa xong được ưu tiên. Không ép có bài mới nếu hết học liệu. Ngày không đăng ký học vẫn cho tự học. Đổi hồ sơ áp dụng kế hoạch ngày sau; muốn đổi hôm nay cần hành động rõ, không xóa session đang làm. Budget là ước lượng, không chấm điểm dựa vào phút mở tab.

### Ví dụ session response tối thiểu

```json
{
  "id":"uuid",
  "lesson_id":"foundation-introductions-01",
  "content_version":1,
  "revision":3,
  "status":"active",
  "cursor":0,
  "steps":[{"id":"listen-main","type":"listen_comprehension","title":"Nghe ý chính","state":"ready"}],
  "current":{
    "id":"listen-main",
    "type":"listen_comprehension",
    "state":"ready",
    "prompt":"Where does Linh study?",
    "media":{"url":"/media/published/example.mp3","duration_ms":18000},
    "options":[{"id":"a","text":"At a university"},{"id":"b","text":"At a hospital"}],
    "response_schema":"choice",
    "draft":null
  },
  "completed_steps":0,
  "total_steps":7
}
```

Đây là ví dụ hình dạng, file example.mp3 không được giả là đã có. Tất cả đáp án chuẩn, rubric chấm riêng, expected token và câu trả lời mẫu có thể tiết lộ đáp án phải nằm BE trước submit. Transcript là hỗ trợ chủ động được phép mở; đáp án câu hỏi không mặc định nhét vào transcript response. Độ dài/media/assets đã có phải được validate khi publish.

### Submit và phản hồi

```json
{
  "step_id":"listen-main",
  "revision":3,
  "submission_id":"client-generated-uuid",
  "response":{"option_id":"a"},
  "assistance_used":[]
}
```

Payload theo response_schema: choice dùng option_id; text dùng text; order dùng token_ids; self_reflection dùng acknowledged và reflection tùy chọn. Speech step đợt 1 dùng transcript và/hoặc tự nghe lại; audio có pipeline riêng sau, không gửi file lớn vào JSON route mặc định. Mỗi loại có validation riêng; từ chối đáp án type sai/ID lạ.

Trạng thái bước: ready → draft → submitted → feedback → completed; session active → completed. Submit giữ bước để người học đọc feedback; advance mới chuyển cursor. Sai vẫn được tiếp tục theo quy tắc bài, đồng thời thêm mục ôn; không khóa toàn khóa. Retake tạo lượt mới, không sửa âm thầm lịch sử lượt cũ. Tasks mở có assessment_status `self_review|pending_ai|reviewed`, không giả grade100 khi AI lỗi. Hoàn thành hoạt động và thành thạo là hai trường khác nhau.

submission_id idempotent theo user/session: phát lại cùng payload trả kết quả trước, khác payload409. Submit phải kiểm revision, quyền/cursor và content snapshot; toàn bộ chấm+tiến độ+evidence trong transaction. Draft mới hơn không bị request cũ ghi đè: stale revision409 `REVISION_CONFLICT`, FE tải phiên lại và giữ bản nhập chưa gửi cho người học xử lý. Không tự lặp submit lỗi409 bằng submission_id mới.

Thiết kế duplicate tabs: session có revision tăng đơn điệu; GET không tiến bước. session bước đã chấm không chấm lại nếu double click. Không dùng điểm localStorage làm nguồn thật; chỉ lưu session_id/UI preference nếu cần.

## 5. Nội dung và dữ liệu dự kiến

Thiết kế bảng mới theo phạm vi, chưa tạo trong lượt tài liệu:

- learning_profiles: user unique, ngân sách/thứ/ngày/mục tiêu; không nhét key AI.
- programs/program_units/learning_lessons: ID ổn định, slug, position, objectives, version, published/draft, nguồn và metadata học liệu.
- lesson_content_versions: nội dung bất biến theo lesson+version; answer keys server-only. Phiên bám version đã bắt đầu; sửa lỗi nghiêm trọng thì đánh dấu retired và hướng dẫn học lại rõ, không chấm bằng version khác.
- daily_learning_plans: unique(user,local_date), timezone snapshot, items và estimates; có quan hệ session.
- learning_sessions: user, lesson/content_version, revision/cursor/state/timestamps.
- learning_step_attempts: unique(session,submission_id), request hash, step_id, response, feedback, evidence/timestamp.
- skills_evidence và mistake_items: đợt2; FK rõ, bản ghi dẫn về task thực, nguồn đánh giá deterministic/AI/self.

Không dùng generated_content AI làm kho duy nhất cho bài published: bài cốt lõi cần biên tập/version và asset tồn tại. Không import đáp án private của nguồn. Seed upsert lesson theo stable slug; không overwrite content version đang dùng, không reseed progress.

Content schema cần có objective, level_hint (tự gán, không chứng nhận CEFR), prerequisites gợi ý, estimated_minutes, steps typed, assets với transcript/segments/duration, keys/rubrics và provenance. Listening segment phải 0≤start<end≤duration; không tự có timestamp chỉ nhờ PDF/audio.

Loại bước đợt1: listen_comprehension, vocabulary_in_context, grammar_practice, pronunciation_practice, speaking_task, writing_task, reflection. Có thể dùng bài ngắn ít bước hơn; không tăng total bằng bước rỗng. Native renderer chọn theo type; chưa hỗ trợ type thì chặn publish, không hiện 'sắp ra mắt' giữa phiên.

## 6. Bài đầu tiên để hai bên tích hợp

Slug `system-introductions-01` trong khóa English for IT/System, mục tiêu: tự giới thiệu sinh viên IT bằng 3 câu; trọng tâm I am/I study, phân biệt danh từ và động từ trong mẫu. Đây là bài tích hợp đầu cho người dùng hiện tại, không phải bài nền tảng bắt buộc của mọi người. Bài giới thiệu nền tảng chung dùng ví dụ trung tính được biên soạn riêng. Nội dung tự soạn, chưa publish:

> Hi, I'm Linh. I'm a university student. I study information technology. I want to work with computer systems. What do you study?

Nghĩa: Chào, mình là Linh. Mình là sinh viên đại học. Mình học công nghệ thông tin. Mình muốn làm việc với các hệ thống máy tính. Bạn học ngành gì?

Trong bài đầu, 'I want to work with computer systems' có thể là câu mở rộng được hỗ trợ, không bắt người mới giải thích cấu trúc toàn câu. Cụm chính: university student, study, information technology, computer systems. Nghĩa của system được giải thích theo ngữ cảnh, không gán mọi trường hợp là hệ điều hành.

Các bước: nghe chọn Linh học ngành gì → học cụm → điền am/study → nghe lại trọng âm một cụm → tự giới thiệu theo mẫu → viết 3 câu → chọn điều cần ôn. Audio phải thực sự được thu/tạo và lưu, không ghi media URL rỗng. Nếu chỉ có TTS tạm, gắn nhãn rõ và chưa gọi đó là bài audio đã duyệt. Nội dung/đáp án kiểm tra thủ công trước publish.

## 7. Công việc theo đợt và nghiệm thu

| Mã | Chủ trì | Công việc | Điều kiện nghiệm thu |
| --- | --- | --- | --- |
| FE-01 | Anti | Sidebar và nhóm thư viện/luyện tập | Route cũ dùng được; mục chưa có backend không hiện giả |
| BE-01 | Codex | Profile + content schema/version + một bài thật | Migration giữ dữ liệu, không leak keys, media hợp lệ |
| BE-02 | Codex | Today plan + sessions/draft/submit/advance | Quyền riêng, revision, replay, transaction, resume qua restart |
| FE-02 | Anti | Hôm nay/lộ trình/session renderer | Dựng đủ loading/empty/error/feedback; bàn phím và mobile |
| INT-01 | Cả hai | Một bài xuyên suốt | Nghe được, nhập/chấm/lưu/tiếp tục được khi Gemini không hoạt động |
| BE/FE-03 | Cả hai | Sổ lỗi + ôn câu + checkpoint | Có bằng chứng thật, không điểm kỹ năng tự sinh |
| CONTENT-01 | Codex chuẩn bị, người dùng duyệt trải nghiệm | Cụm bài kế tiếp | Text/audio/questions/keys cùng mục tiêu, không placeholder |
| BE/FE-04 | Cả hai | Thư viện nghe/shadowing/viết IT | Theo đặc tả bổ sung sau nghiệm thu đợt1 |

Trạng thái ban đầu của mọi mã: **chưa triển khai V2**. Đừng đồng nhất lesson-session hiện có với learning-session V2 chưa xây.

Kiểm thử BE thiết yếu: ownership, keys, duplicate submit, invalid option/token, stale revision, save/reopen, timezone qua ngày, content version, seed không mất dữ liệu, AI lỗi không làm hỏng bài. FE kiểm tra một luồng E2E trên dữ liệu tạm và media thật; không dùng DB người học để chạy reset. Không chạy test toàn bộ sau từng CSS; full regression ở cuối đợt tích hợp hoặc khi thay đổi logic chung.

## 8. Lệnh giao việc cho Anti

```text
Đọc docs/UPGRADE-V2-PLAN.md và docs/UPGRADE-V2-HANDOFF.md trong D:\Project\openquiz. Đây là đặc tả tương lai; API /learning chưa được triển khai. Bạn phụ trách FE, Codex phụ trách BE. Làm FE-01 trước, rồi dựng component FE-02 theo contract; mock chỉ trong môi trường demo riêng có nhãn, không fallback mock ở ứng dụng thật. Giữ các chức năng/dữ liệu cũ, bỏ Xếp hạng và Báo lỗi khỏi sidebar, gom công cụ theo tài liệu. Không sửa server/**, database, .env hay model AI. Khi API BE sẵn sàng, nối một bài thật xuyên suốt và kiểm tra tải lại/nháp/nộp trùng/lỗi mạng. Mọi điểm cần đổi API ghi rõ request/response để Codex xử lý. Đọc thêm docs/ANTI-BE-HANDOFF.md cho các API hiện có cần giữ. Không coi tạo màn hình là đã hoàn thành chức năng; báo rõ trạng thái từng mã công việc.
```

## 9. Tiết kiệm token và giữ ngữ cảnh cho lượt sau

Mỗi lượt chỉ nhận một nhóm mã, ví dụ BE-01 rồi BE-02; đọc hai tài liệu này và file liên quan, không đọc lại toàn repo/ảnh/REA nếu chưa có câu hỏi mới. Cuối lượt ghi file đã đổi, API đã chạy, kiểm thử và bước còn lại trong `docs/UPGRADE-V2-STATUS.md` khi thực sự bắt đầu triển khai. Chưa tạo status giả hoàn thành ở lượt đặc tả. Không gọi model thật hàng loạt để test luồng deterministic. Không đổi provider/key khi lỗi503. Không viết lại tài liệu nền chỉ để thay vài dòng trạng thái.
