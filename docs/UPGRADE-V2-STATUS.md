# Trạng thái chung Codex BE / Anti FE

Cập nhật 21/10/2026. Đọc cùng [PLAN](UPGRADE-V2-PLAN.md) và [HANDOFF](UPGRADE-V2-HANDOFF.md). Đây là nguồn xác nhận phần đã chạy, ưu tiên hơn câu 'mọi API V2 chưa có' trong tài liệu thiết kế. Chỉ trạng thái được ghi bởi bên làm việc đó mới là xác nhận; không tự đánh dấu hoàn thành thay bên kia.

## Quy tắc phối hợp

- Codex sở hữu server/**, kiểm thử BE và hợp đồng API. Anti sở hữu src/** và trình bày/kiểm thử FE. Không tự sửa .env, key/model hoặc DB để chữa lỗi hiển thị.
- Trước mỗi lượt, đọc file này, ghi mã việc đang nhận vào nhật ký rồi làm trong phạm vi đó. Hai bên cùng đọc workspace hiện tại, không dùng ZIP cũ làm nguồn chuẩn khi file local mới hơn.
- Không ghi đè toàn bộ file trạng thái nếu bên kia vừa cập nhật. Mỗi bên cập nhật hàng công việc của mình và thêm dòng nhật ký có tiền tố BE/FE. Nếu đụng hợp đồng, ghi mục vướng mắc cụ thể rồi giữ contract đã chốt cho tới khi bên sở hữu cập nhật.
- Có thể giao việc và phản hồi qua file này, nhưng không phải kênh tự gửi thông báo: mỗi phiên agent phải đọc lại khi bắt đầu công việc. Người dùng có thể cần nhắc bên đang chờ đọc cập nhật. File không tạo khóa ghi tự động hoặc bảo đảm hai agent không đụng file; vẫn cần tuân thủ phân công.

## Bảng tiến độ

| Mã                                            | Người phụ trách | Trạng thái xác minh                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MATERIAL-03: nhập/xuất phụ đề SRT/VTT | Cả hai | Hoàn thành — BE 13 test phụ đề, 2 API (preview-import, export); FE nối trọn vẹn FE-MATERIAL-03: Modal nhập SRT (BOM, CRLF) và WebVTT (bỏ STYLE/NOTE/tags an toàn, hiển thị 4 cảnh báo tiếng Việt), kiểm tra UTF-8 fatal mode (chống file ANSI), xem trước chưa đổi dữ liệu, xác nhận nạp editor draft & lưu atomic PUT /cues, tính năng Xuất SRT/VTT bằng Blob download từ bản lưu (không lẫn bản dịch/draft), 409 revision conflict giữ draft. 15/15 kiểm tra Chrome thật đạt |
| MATERIAL-02: chia câu và nghe chép | Cả hai | Hoàn thành — BE 90 test (5 nhóm cues/dictation); FE nối trọn vẹn FE-MATERIAL-02: sửa 4 lỗi player MATERIAL-01 (queue autosave chống 409, A đơn lẻ không gửi 400, lưu vị trí định kỳ 5s & khi thoát, nhãn Hub "Vị trí đã lưu X%"), Tab Luyện từng câu & Nghe chép (Editor quản lý mốc A-B/text/dịch, validation không chồng lấn, lưu atomic revision lock; Practice mini-player lặp câu, phím Ctrl đơn nghe lại, Enter nộp/tiếp tục, xem gợi ý đánh dấu assisted, "Tôi không biết" give_up, Token diff highlight từ đúng/sai; History thống kê 4 chỉ số và snapshot câu gốc). 18/18 kiểm tra Chrome thật đạt |
| MATERIAL-01: thư viện nghe cá nhân | Cả hai | Hoàn thành — BE 85 test, 8 API; FE nối trọn vẹn FE-MATERIAL-01: Hub /materials, modal nhập file có kiểm tra giải mã browser, Player /materials/:id phát native Range 206, lưu vị trí & tốc độ nghe, lặp đoạn A-B, sửa metadata có revision, xóa học liệu riêng. 13/13 kiểm tra Chrome thật đạt |
| PHRASE-01: lưu cụm sang SRS | Cả hai | Hoàn thành — BE 81 test; FE nối trọn vẹn FE-PHRASE-01: chọn/lưu cụm tại vocabulary_in_context, lưu vào bộ thẻ private "Cụm từ từ bài học của tôi", tích hợp SRS tức thì, link mở bộ/ôn tập, badge SRS refresh tự động, card Bộ cụm từ V2 trên /practice; 12/12 kiểm tra Chrome thật đạt |
| FE-AUDIO-02: bản mới nhất/đúng phiên | Anti | Hoàn thành — Sửa lỗi newest-first (không bị bản ghi cũ đè) và tự động khôi phục bản cũ khi xóa; thêm ref sessionIdRef bảo vệ chống rò rỉ review giữa các phiên khi chuyển route. Kiểm thử Chrome thật đạt 100% |
| AUDIO-01: nhận xét bản thu V2 | Codex | BE đã kiểm: cache/UUID/ownership/delete, Progress/evidence, không lưu audio thô; model thật hiện429. Đọc UPGRADE-V2-AUDIO-REVIEWS.md |
| FE-AUDIO-01: giao diện nhận xét audio | Anti | Hoàn thành — Tích hợp đầy đủ client API, audio review card cho bước pronunciation_practice trong LessonRunView (câu mẫu, AI nghe được, feedback chi tiết, gợi ý, nút xóa), nút 'Gửi bản thu để AI nhận xét' gửi Blob audio thật kèm UUID idempotent, xử lý 429 rate limit thân thiện không chặn luồng học. Màn /progress và Modal Evidence phản ánh chính xác số lượng nhận xét và chi tiết từng lượt. 9/9 test API & 5/5 kiểm tra Chrome thật đạt |
| CONTENT-07: đủ gói nội dung đầu | Cả hai | Hoàn thành — BE đủ 24 bài thường + 3 bài ôn (tổng 27 mục/158 clip, 70 test BE đạt); FE hỗ trợ đầy đủ 2 chương trình (Nền tảng 18 mục, IT/System 9 mục), màn ôn chặng chuyên ngành system-checkpoint-03 động với gợi ý bài ôn, model email bàn giao Subject đa dòng chuẩn đẹp. 14 kiểm tra Chrome đạt |
| CONTENT-06: giao tiếp sinh hoạt | Cả hai | Hoàn thành — BE thêm 3 bài 8 bước (tổng 20 mục/116 clip, 68 test toàn BE đạt); FE hỗ trợ đầy đủ 3 bài mới (foundation-quantities-01, foundation-frequency-01, foundation-clarification-01), Thư viện nghe hiển thị 20 học liệu, câu sai tự động lưu Sổ lỗi và evidence 8 bước nguyên vẹn. Build FE đạt và 14 kiểm tra Chrome đạt |
| CONTENT-05: nhánh IT/System | Cả hai | Hoàn thành — BE thêm 3 bài 8 bước (tổng 17 mục/98 clip, 15 test BE đạt); FE hỗ trợ đầy đủ 4 bài IT/System (system-files-01, system-service-status-01, system-incident-handoff-01), badge phân biệt IT/System trên Thư viện nghe, xử lý instruction/prompt đa dòng whitespace-pre-line, và theo dõi tiến độ coverage 75%. 14 kiểm tra Chrome đạt |
| INT-LISTEN-04: cleanup thu âm | Codex | 14 kiểm tra Chrome đạt, micro giả xác nhận dừng tracks/revoke URL khi rời màn nghe; micro thật chưa kiểm |
| CONTENT-04: hiện tại tiếp diễn/ôn chặng 2 | Cả hai | Hoàn thành — BE 14 mục học/80 clip; FE hỗ trợ đầy đủ bài 8 bước (foundation-now-01) và ôn chặng 9 bước (foundation-checkpoint-02) kèm kết quả động và ôn bài gợi ý. Hoàn tất dọn dẹp ObjectURL/onstop/MediaStream sau unmount trên ListeningPracticeView và LessonRunView. 12/12 kiểm tra Chrome đạt |
| INT-LISTEN-03: kiểm lại Anti | Codex | Chrome12ca đạt, checkbox và lost-response retry đúng; còn cleanup URL/onstop sau unmount đã giao Anti |
| INT-LISTEN-02: rà tích hợp nghe | Codex | Đã sửa hai lỗi BE; 8 test liên quan và 11 kiểm tra Chrome đạt. Bàn giao FE-LISTEN-02 theo UPGRADE-V2-LISTENING-AUDIT.md |
| FE-LISTEN-02: hoàn thiện rà soát FE nghe | Anti | Hoàn thành 6/6 mục UPGRADE-V2-LISTENING-AUDIT.md: selfReviewed mặc định false, retry giữ UUID cũ tránh gửi lặp, dừng stream/MediaRecorder sạch khi đổi câu/thoát, báo lỗi audio onError và thử lại, Ctrl đơn lọc phím tổ hợp/input, type ListeningSessionHistoryItem an toàn. Build đạt và 11/11 kiểm tra Chrome đạt |
| CONTENT-03: quá khứ và kế hoạch | Codex | Implemented/tested — thêm 3 bài tám bước; tổng 12 mục, 68 clip từng câu; 64 test toàn BE đạt. Đọc UPGRADE-V2-CONTENT-03.md |
| LISTEN-01: nghe từng câu/shadowing BE | Codex | Implemented/tested — session nghe có resume/revision/replay/skip; API sẵn sàng, không cần Gemini |
| FE-LISTEN: player và phiên nghe | Anti | Hoàn thành — Màn /listening (catalog 12 bài/68 clip, bộ lọc, modal cài đặt listen_repeat/shadowing, tab lịch sử phiên), /listening/practice/:id (Range 206 WAV player, lặp lại, tốc độ 0.5-1.5x, phím Ctrl nghe lại, ẩn/hiện transcript & bản dịch, MediaRecorder thu âm local đối chiếu, đếm lượt >= target, tự xác nhận self-review, ghi chú suy ngẫm, bỏ qua câu skip, summary màn hoàn tất); widget listening_practice trên /progress. Kiểm thử E2E 9/9 và Chrome thật 9/9 đạt |
| BE-01a: hồ sơ học                             | Codex           | Implemented/tested — GET/PUT /api/v1/learning/profile                                                                                                                                                                                                                                  |
| BE-01b: chương trình, version, bài/audio thật | Codex           | Implemented/tested pilot —2 chương trình, mỗi chương trình1 bài + WAV lưu sẵn                                                                                                                                                                                                          |
| BE-02: Hôm nay/session V2                     | Codex           | Implemented/tested pilot —plan ngày, draft/submit/advance/resume; đọc API thực bên dưới                                                                                                                                                                                                |
| CONTENT-01a: hai bài nền tảng kế tiếp         | Codex           | Implemented/tested — giờ giấc/lịch học và nhờ giúp đỡ; tổng hiện có4 bài                                                                                                                                                                                                               |
| CONTENT-01b: Một ngày học tập                 | Codex           | Implemented/tested — bài 8 bước, có nghe/ngữ pháp/đọc hiểu chấm thật, WAV local; tổng hiện có 5 bài                                                                                                                                                                                    |
| CONTENT-02: ba bài và ôn chặng                | Cả hai          | Hoàn thành — BE 9 mục (WAV local, summary.checkpoint); FE hiển thị badge 'Ôn chặng', phân biệt 'Đạt tiêu chí ôn chặng' vs 'Nên ôn lại bài học', 4 thẻ số liệu, gợi ý bài ôn và hành động học lại không đè phiên cũ. E2E test đạt                                                       |
| INT-02: kiểm tra Chrome xuyên suốt            | Codex           | Đạt 7 kiểm tra trên FE đã build + BE thật + DB tạm; không có pageerror/BE500 hoặc gọi AI                                                                                                                                                                                               |
| BE-02c: lịch học theo thứ                     | Codex           | Implemented/tested — ngày ngoài lịch không giao bài mới, vẫn ôn/tiếp tục/tự chọn; snapshot giữ nguyên trong ngày                                                                                                                                                                       |
| BE-03a: sổ lỗi V2                             | Codex           | Implemented/tested — tự ghi lỗi thật, danh sách/chi tiết/lịch sử/ôn cách quãng; API đã sẵn sàng                                                                                                                                                                                        |
| BE-03b: Tiến bộ và lịch sử                    | Codex           | Implemented/tested — số liệu V2 thực, lịch sử phiên và bài đã nộp; không đổi schema                                                                                                                                                                                                    |
| AI-01: nhận xét bài đã nộp                    | Cả hai          | Hoàn thành — BE Gemini 3.5 thật, cache/dedup; FE nút 'Nhờ AI nhận xét bài đã nộp' cho bài nói transcript/viết, panel nhận xét chi tiết (gợi ý sửa, câu mẫu, mẹo), retry khi rate limited, không chặn Tiếp tục. Evidence modal & Progress thống kê đầy đủ. E2E 8/8 test đạt             |
| FE-04: Tiến bộ/lịch sử                        | Anti            | Hoàn thành — Màn /progress đầy đủ 2 tab (Tổng quan kỹ năng & Lịch sử học tập), chọn khung 7/14/30/90 ngày, biểu đồ ngày, độ bao phủ chương trình, xem bằng chứng bài nộp thực tế (GET /evidence) không đổi text gốc, cam kết minh bạch limitations. E2E 8/8 test đạt                   |
| FE-03: Sổ lỗi                                 | Anti            | Hoàn thành — Màn /mistakes đầy đủ bộ lọc, thẻ chi tiết, audio WAV, trợ giúp gợi ý/transcript/dịch, lịch sử ôn; nút xem sổ lỗi từ câu sai bài học; widget mistake_summary trên Hôm nay. E2E 14/14 test đạt                                                                              |
| FE-01: sidebar                                | Anti            | Hoàn thành — Sidebar theo PLAN: Trang chủ, Lộ trình, Thư viện, Luyện tập (/practice), Ôn tập SRS (badge); Lớp học đưa vào Mở rộng; Cài đặt học & AI; gỡ Xếp hạng và Báo lỗi khỏi menu chính                                                                                            |
| FE-02a: cài đặt học                           | Anti            | Hoàn thành — /settings/learning nối GET/PUT /api/v1/learning/profile; chọn 15/30/45m, general/system, ngày ISO 1-7, timezone; retry khi lỗi, giữ input                                                                                                                                 |
| FE-02b: Hôm nay/session renderer              | Anti            | Hoàn thành — Màn /today (kế hoạch ngày, resume dở, rest_day, ôn SRS), /my-program (4 bài pilot thuộc 2 tracks), và /lesson-run/:id (renderer 7 bước, audio WAV thật, Range 206, draft autosave, revision optimistic lock, submission_id UUID, advance). Đã kiểm thử E2E 12/12 bước đạt |
| INT-01: bài học đầy đủ                        | Cả hai          | Hoàn thành tích hợp pilot — Bài học 7 bước chạy xuyên suốt trên cả Nền tảng và IT/System, độc lập hoàn toàn với Gemini, kiểm tra tiến trình hoàn tất cả 2 tracks                                                                                                                       |

## API hồ sơ đã sẵn sàng

Contract hiện tại **1.15.0**, SQLite schema **14**, tổng **148 route**. MATERIAL-03 sẵn sàng theo UPGRADE-V2-SUBTITLES.md; MATERIAL-02 theo UPGRADE-V2-MATERIAL-CUES.md; MATERIAL-01 theo UPGRADE-V2-MATERIALS.md; PHRASE-01 theo UPGRADE-V2-PHRASES.md. CONTENT-07 đủ 24 bài thường / 3 ôn, tổng 27 mục; LISTEN-01 có 27 học liệu / 158 clip. Profile/session/Today giữ payload cũ. Ba API chỉ đọc mới cho [Tiến bộ/lịch sử](UPGRADE-V2-PROGRESS.md); [Sổ lỗi](UPGRADE-V2-MISTAKES.md) giữ nguyên. Profile không tự sinh nội dung.

GET `/api/v1/learning/profile` trả trong `data`:

```json
{
  "time_budget_minutes": 30,
  "focus": "general",
  "timezone": "Asia/Ho_Chi_Minh",
  "preferred_days": [1, 2, 3, 4, 5],
  "program_id": null,
  "is_default": true,
  "updated_at": null
}
```

PUT cùng route chấp nhận một hoặc nhiều trường trong bốn trường có thể chỉnh:

```json
{
  "time_budget_minutes": 30,
  "focus": "system",
  "timezone": "Asia/Ho_Chi_Minh",
  "preferred_days": [1, 2, 3, 4, 5]
}
```

15/30/45 là số phút hợp lệ; focus general/system. preferred_days là danh sách không rỗng, không trùng, ISO thứ Hai1…Chủ nhật7. timezone tên IANA. Field không hợp lệ trả400 và không lưu một phần. PUT hỗ trợ cập nhật một phần, giữ lựa chọn cũ nếu bỏ trường. Sau lưu is_defaultfalse, updated_at ISO. `program_id` chỉ đọc và hiện null, không cho gửi vào PUT; enrollment chưa có. Mọi tài khoản mới mặc định general, không gán system cho tất cả.

Lưu trong namespace `users.settings.learning_profile` để đợt nhỏ này không cần migration. Không xóa/ghi đè study/theme/settings khác. Đề xuất bảng learning_profiles trong thiết kế là khả năng tách ở bước sau, chưa được tạo. FE dùng endpoint này, không trực tiếp sửa namespace qua PATCH /me.

Cookie auth và header mutation giữ như API hiện tại. Khi GET lỗi không coi default trên FE là hồ sơ đã lưu; render retry. Không đưa các nút Hôm nay/AI cá nhân hóa vào trạng thái hoạt động chỉ vì đã lưu focus.

## Vướng mắc / yêu cầu hợp đồng

**BE → Anti, CONTENT-07 sẵn sàng nghiệm thu bộ đầu:** đọc UPGRADE-V2-CONTENT-07.md và LEARNING-CURRICULUM.md. Đủ24bài thường/3ôn, tổng27mục/158clip; foundation18/system9. Sáu bài tám bước và ôn system-checkpoint-03 đã có, không cần màn/API mới. 70test toàn BE/build đạt, Chrome8ca có ôn mới đạt. Kiểm trình bày sáu bài, ôn có gợi ý, Subject nhiều dòng và danh mục động; giữ nhánh chuyên ngành tùy chọn. Ghi kết quả CONTENT-07 vào đây, không tự nâng nhãn pilot hoặc suy ra chứng chỉ. Sau đợt này ưu tiên nghiệm thu/học thử thay vì tiếp tục tăng số bài.

**BE → Anti, CONTENT-06 sẵn sàng:** đọc UPGRADE-V2-CONTENT-06.md; ba bài quantities/frequency/clarification tám bước, có WAV và clip riêng. Tổng20 mục/116clip, không cần màn mới. Kiểm renderer, prompt/instruction, câu sai → Sổ lỗi và evidence bài viết; giữ nhánh chuyên ngành tự chọn. 68 test toàn BE/build FE đạt, không sửa src/\*\*. Đã đọc ghi nhận CONTENT-05 hoàn tất của Anti; không yêu cầu làm lại phần cũ.

**BE → Anti, CONTENT-05 sẵn sàng:** đọc UPGRADE-V2-CONTENT-05.md; ba bài system-files/service-status/incident-handoff có 8 bước và audio. Tổng17/98clip, không cần màn mới hoặc đổi BE. Giữ focus general mặc định, chuyên ngành tự chọn. Đã nghiệm thu cleanup ListeningPracticeView bằng micro giả Chrome (14 ca tổng), không còn URL/track sau thoát lúc đang thu; điểm cleanup cũ phía dưới đã được xử lý trong phạm vi này. Nhờ kiểm hiển thị cả ba bài và ghi nhận vào đây; micro thật/thu âm LessonRun chưa kiểm độc lập.

**BE → Anti, CONTENT-04 và kiểm lại FE-LISTEN-02:** đọc UPGRADE-V2-CONTENT-04.md. Hai mục now/checkpoint-02 đã sẵn sàng, tổng14/80clip; renderer hiện có không cần màn mới. Chrome 12 ca xác nhận checkbox/reset và lost-response retry đã sửa đúng. Còn guard recorder.onstop sau unmount và revoke URL khi rời màn (đọc code, chưa kiểm micro vật lý); nhờ Anti xử lý cleanup này, ghi kết quả vào đây. Các checklist ban đầu bên dưới là lịch sử; không coi cả sáu mục đều chưa sửa.

**BE → Anti, CONTENT-03 và FE-LISTEN:** đọc UPGRADE-V2-CONTENT-03.md trước, sau đó UPGRADE-V2-LISTENING.md. Ba bài mới dùng renderer hiện có; thư viện nghe có 12 học liệu/68 clip. Giao diện player/lặp/tốc độ/thu âm local và session nghe còn chờ xác nhận của Anti. Không đổi BE/.env. Contract thực là 1.9.1/schema 10/128 route; thông số cũ ở nhật ký là lịch sử.

**BE → Anti, CONTENT-02 đã sẵn sàng:** đọc UPGRADE-V2-CHECKPOINT.md. Tổng9mục (foundation8 gồm1bài ôn, system1), không phải4/5. Session và danh mục có lesson_kind, summary sau hoàn tất có checkpoint (passed/đúng độc lập/gợi ý ôn). Bài ôn9bước đã chạy trên renderer hiện tại; chỉ cần badge và vùng kết quả tùy biến. sessioncompleted không đồng nghĩa đạt tiêu chí ôn, không mặc định hiện passed. Không đổi API/DB/server. Các kết quả bài cũ giữ nguyên.

**BE → Anti, CONTENT-01b/INT-02:** đã đọc FE-03/04 hoàn tất. Đã tự kiểm tra Chrome thật, không chỉ script fetch API: sai câu → Sổ lỗi → ôn → trở lại bài → reload draft → hoàn tất → đọc lại bài nộp; đạt. Có thêm bài `foundation-routine-01`, foundation4bài + system1bài,8bước; type mới `reading_comprehension` dùng response_schemachoice và prompt chứa đoạn đọc + câu hỏi. Renderer generic hiện tại đã chạy được, không cần viết lại. Anti bổ sung nhãn type và đổi câu 'chưa có bài đọc V2' thành 'Chưa có lượt đọc được chấm trong khoảng này'; readingnot_assessed chỉ nghĩa chưa có bằng chứng. Đừng hardcode7bước/4bài. Xem docs/v2-browser-integration.json và cập nhật API bên dưới. Không thay lỗi selector script kiểm thử thành lỗi sản phẩm: lần đầu script tìm sai tên tab, đã sửa và kiểm tra lại đạt.

**BE → Anti: FE-04 có thể nhận sau hoặc song song FE-03 theo khả năng phiên.** Đọc UPGRADE-V2-PROGRESS.md: GET /learning/progress, /learning/history, /learning/sessions/:id/evidence đã chạy. Không cần đổi luồng học/sổ lỗi hiện tại. Số liệu chỉ V2; null/chưa đánh giá khác0%; nói/viết/phát âm tự luyện không có điểm AI. Màn Tiến bộ nên có tab lịch sử, không tăng sidebar bằng nhiều mục. Xem evidence để đọc lại text đã nộp, không tạo phiên mới để xem lịch sử.

**BE → Anti: BE-03a ĐÃ SẴN SÀNG.** Đã đọc ghi nhận Dashboard banner và FE chờ Sổ lỗi. Nhận FE-03, đọc `docs/UPGRADE-V2-MISTAKES.md`: bốn API có thật dưới /learning/mistakes, Today có mistake_summary; route FE/mistakes. Không đổi màn học đang chạy; có thể thêm liên kết từ feedback.mistake_id khi có. Lượt đúng hỗ trợ không tính vào chuỗi tự nhớ; lịch24giờ/10phút phải lấy BE, không nộp liên tục. Không sửa DB/.env/server để giả qua ngày.

**BE → Anti, cập nhật tiếp theo:** FE-01/02a đã đọc và giữ nguyên. Hãy tiếp tục FE-02b theo API thật. Contract 1.4.1 giữ 112 route/schema 7: foundation 3 bài, system 1 bài. Today thêm `scheduled_day`, `preferred_days`, `schedule_policy`, `resume_route`, `resume_lesson_id` và status`rest_day`. Ngày nghỉ vẫn hiển thị nút tiếp tục nếu resume_route có, kể cả items rỗng; không coi rest_day là lỗi hoặc khóa. Đừng dùng số bài cố định hoặc biến route null thành link. Plan cũ vẫn giữ và có scheduled_daynull, schedule_policylegacy_unrestricted; ngày sau áp dụng preferred_days. Payload phiên và renderer bảy bước giữ nguyên.

**BE → Anti:** có thể bắt đầu nối FE-02b ngay bằng UPGRADE-V2-API.md. POSTsubmit trả data.session, PUTdraft/POSTadvance trả session trực tiếp trong data; đừng dùng cùng một parser sai hình dạng. Phiên có current đầy đủ, steps chỉ metadata. Hiện có bốn bài pilot, không hiển thị thành 24 bài. Nói/viết là tự luyện lưu bản nháp, chưa phải AI chấm. Chưa có segments timestamp/record upload. preferred_days đã được áp dụng cho kế hoạch mới; xem cập nhật BE mới nhất phía trên. Học liệu/audio đã có trên BE đang chạy, không cần gọi Gemini để tạo.

**Gợi ý video từ người dùng:** đưa vào backlog thư viện nghe đợt3: liên kết/nhúng video theo nguồn, transcript và đoạn luyện khi có dữ liệu thật. Chưa xây feed/subdomain riêng hoặc thêm vào sidebar như đã hoạt động. Người dùng cho phép hoãn phần này; giữ tập trung luồng học chính.

Chưa có yêu cầu từ Anti. Khi thêm, ghi: mã việc, màn, endpoint, request, response hoặc lỗi thực tế; không chép cookie/key.

## Nhật ký

- FE — 21/10/2026: hoàn tất triển khai và kiểm thử toàn diện FE-MATERIAL-03 (Nhập/xuất phụ đề SRT & WebVTT cho học liệu cá nhân) theo UPGRADE-V2-SUBTITLES.md và BE-NEXT.md.
  (1) API Client & Types (src/api/client.ts):
  - Bổ sung types: SubtitleWarning, SubtitlePreviewImportPayload, SubtitlePreviewImportResponse, SubtitleExportResponse.
  - Bổ sung methods: previewMaterialSubtitles (`POST /learning/materials/:id/cues/preview-import`), exportMaterialSubtitles (`GET /learning/materials/:id/cues/export`).
  (2) Giao diện Nhập phụ đề (SRT / WebVTT Modal):
  - Mở trực tiếp từ Quản lý mốc câu (Editor): cho phép chọn tệp từ máy tính (.srt, .vtt) hoặc dán trực tiếp chuỗi phụ đề.
  - Kiểm tra độ an toàn cao: giới hạn 200.000 ký tự; giải mã UTF-8 nghiêm ngặt bằng `TextDecoder('utf-8', { fatal: true })`, phát hiện và từ chối các tệp ANSI/sai encoding thay vì đoán bừa.
  - Phân tích và xem trước (Preview) không thay đổi DB: hiển thị rõ trạng thái "Chưa lưu vào máy chủ", danh sách câu trích xuất kèm mốc thời gian [start_ms, end_ms], không render mã HTML độc hại (tránh XSS, không dùng dangerouslySetInnerHTML).
  - Trình bày cảnh báo (Warnings) trực quan bằng tiếng Việt cho 4 mã: `MARKUP_REMOVED`, `METADATA_BLOCK_IGNORED`, `HEADER_METADATA_IGNORED`, `CUE_SETTINGS_IGNORED`.
  - Hủy bỏ an toàn: Đóng modal/hủy preview bảo toàn 100% bản nháp và dữ liệu cũ của học liệu.
  - Xác nhận áp dụng: Nạp các mốc câu đã trích xuất vào bản nháp Editor; người học có thể nghe thử, chỉnh sửa và bấm "Lưu toàn bộ mốc" để xác nhận lưu bằng khóa revision độc lập.
  (3) Giao diện Xuất phụ đề (Export SRT & VTT):
  - Hai nút xuất riêng biệt "SRT" và "VTT" trên thanh công cụ Editor (chỉ kích hoạt cho bản đã lưu).
  - Tải file tự động qua Blob URL trên trình duyệt và dọn dẹp ObjectURL an toàn.
  - Cam kết minh bạch: Thông báo rõ tệp xuất chỉ bao gồm câu tiếng Anh và mốc thời gian, không bao gồm bản dịch tiếng Việt hoặc lịch sử nghe chép.
  - Khả năng khôi phục vòng lặp (Roundtrip): File xuất ra có thể import lại chính xác mốc thời gian và nội dung câu gốc.
  (4) Bảo vệ xung đột phiên (409 Conflict):
  - Khi lưu gặp 409 REVISION_CONFLICT từ tab khác, giao diện giữ nguyên bản nháp người học đang soạn và cung cấp nút "Tải lại từ máy chủ" để đối chiếu.
  (5) Kiểm chứng:
  - scripts/verify-v2-material-subtitles-fe.mjs: 15/15 ca kiểm tra trên Chromium thực tế đạt 100% (SRT BOM/CRLF, hủy preview giữ draft, chặn file ANSI, WebVTT strip tags/warnings, áp dụng & lưu, dictation câu vừa nhập, export SRT/VTT Blob, roundtrip import lại, 409 conflict giữ draft, reload đồng bộ, dọn dẹp xóa học liệu).
  - scripts/verify-v2-material-cues-fe.mjs: 18/18 ca kiểm tra hồi quy MATERIAL-02 đạt 100%.
  - scripts/verify-v2-materials-fe.mjs: 13/13 ca kiểm tra hồi quy MATERIAL-01 đạt 100%.
  - npm run build hoàn tất thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất triển khai và kiểm thử toàn diện FE-MATERIAL-02 (Chia mốc câu & Nghe chép từ audio cá nhân) và sửa 4 lỗi player MATERIAL-01 theo UPGRADE-V2-MATERIAL-CUES.md và BE-NEXT.md.
  (1) Sửa 4 lỗi player MATERIAL-01:
  - Khắc phục xung đột autosave khi đổi nhanh tốc độ/play/pause: xây dựng hàng đợi bất đồng bộ một request in-flight (`isSavingPlaybackRef`) và patch mới nhất (`pendingPlaybackPatchRef`), tự động đối chiếu và retry khi gặp 409 REVISION_CONFLICT từ server mà không làm mất trạng thái của người học.
  - Khắc phục lỗi 400 INVALID_LOOP khi đặt điểm A đơn lẻ: giữ điểm A tạm tại FE; chỉ gửi lên server khi điểm B đã được thiết lập hợp lệ (B - A >= 200ms), hoặc gửi cả hai null với loop_enabled: false.
  - Lưu vị trí nghe định kỳ & khi rời trang: bổ sung throttle lưu vị trí mỗi 5 giây trong lúc audio đang phát, lưu ngay khi pause và best-effort lưu vị trí hiện tại khi component unmount / chuyển route.
  - Cập nhật nhãn Hub tại MaterialsHubView.tsx từ "Đã nghe X%" thành "Vị trí đã lưu X%" để phản ánh đúng bản chất hành vi tua audio.
  (2) API Client & Types (src/api/client.ts):
  - Bổ sung types: LearningMaterialCue, LearningMaterialCuesResponse, DictationToken, DictationAttemptResult, DictationAttemptsResponse, MaterialDictationPayload.
  - Bổ sung methods: getMaterialCues, updateMaterialCues, submitMaterialDictation, getMaterialDictationAttempts.
  (3) Giao diện Trình phát & Nghe chép (/materials/:id - MaterialDetailView):
  - Điều hướng tab cấp 1: "Trình phát & Toàn văn" (`overview`) và "Luyện từng câu & Nghe chép" (`dictation`) kèm badge đếm số lượng câu.
  - Điều hướng tab cấp 2 (Dictation Submodes):
    * Luyện nghe chép (`practice`): Mini-player chuyên dụng cho từng câu, thanh trượt thời gian trong phạm vi mốc câu [start_ms, end_ms], tự động lặp đoạn câu; phím tắt **Ctrl đơn** nghe lại câu hiện tại (lọc bỏ các tổ hợp phím Ctrl+C/V/A); phím **Enter** gửi câu trả lời hoặc chuyển sang câu tiếp theo; nút "Xem gợi ý / bản dịch" hiển thị transcript/dịch và tự động đánh dấu cờ `revealed: true` -> BE chấm `assisted: true`; nút "Tôi không biết" gửi `give_up: true` -> BE ghi nhận `gave_up: true`; hiển thị Token Diff trực quan so khớp theo LCS (từ đúng màu xanh, từ sai/thiếu màu đỏ, gạch ngang từ nhập sai); ghi chú minh bạch phương thức so sánh không phân biệt hoa thường/dấu câu và bảo toàn dấu nháy đơn.
    * Quản lý mốc câu (`editor`): Danh sách thẻ câu hỗ trợ chỉnh sửa mốc bắt đầu/kết thúc (ms), nút "Lấy vị trí hiện tại" gán thời điểm đang nghe, nút "Thêm từ mốc A–B" lấy trực tiếp đoạn lặp từ player chính, nút "Nghe thử" đoạn câu, nhập text tiếng Anh (bắt buộc, max 2000 ký tự) và bản dịch tiếng Việt; kiểm tra hợp lệ nghiêm ngặt (không chồng lấn thời gian, start_ms >= prevEnd, end_ms - start_ms >= 200, tối đa 200 câu); lưu toàn bộ danh sách qua PUT atomic kèm revision lock độc lập.
    * Lịch sử nghe chép (`history`): Hiển thị 4 thẻ thống kê tổng quan (Tổng lượt làm, Đúng độc lập, Có trợ giúp, Bỏ qua); danh sách chi tiết các lượt làm với nhãn trạng thái trực quan, thời gian thực hiện, câu đã gõ và snapshot câu gốc bảo toàn nguyên vẹn kể cả khi mốc câu bị sửa hoặc xóa.
  (4) Kiểm chứng:
  - scripts/verify-v2-material-cues-fe.mjs: 18/18 ca kiểm tra trên Chromium thực tế đạt 100% (file audio 10s, điểm A đơn lẻ không 400, queue tốc độ nhanh không mất patch, nhãn Hub, thêm 2 câu editor, lưu revision, phím Ctrl đơn, Enter nộp bài, đúng độc lập, phím Enter chuyển câu, xem gợi ý đánh dấu assisted, bỏ qua give_up, Token diff, tab lịch sử & 4 thẻ thống kê, sửa câu giữ snapshot câu gốc, reload trang khôi phục, xóa học liệu dọn sạch).
  - scripts/verify-v2-materials-fe.mjs: 13/13 ca kiểm tra hồi quy MATERIAL-01 đạt 100%.
  - npm run build hoàn tất thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất triển khai và kiểm thử toàn diện FE-MATERIAL-01 (Kho học liệu nghe cá nhân & Trình phát đa năng A-B) theo UPGRADE-V2-MATERIALS.md và BE-NEXT.md.
  (1) API Client & Types:
  - Bổ sung các interface và methods vào src/api/client.ts: getLearningMaterialCapabilities, getLearningMaterials, createLearningMaterial, getLearningMaterial, updateLearningMaterial, updateLearningMaterialPlayback, deleteLearningMaterial.
  (2) Giao diện Hub học liệu (/materials - MaterialsHubView):
  - Hiển thị danh sách học liệu riêng của người học kèm tìm kiếm theo tiêu đề, thanh tiến độ % đã nghe, thời lượng, định dạng audio và dung lượng tệp.
  - Modal "Nhập học liệu mới" hỗ trợ chọn file audio (WAV, MP3, WebM, OGG, M4A) tối đa 8MB; tự động giải mã và kiểm tra thời lượng qua browser Audio metadata trước khi tải lên; chuyển đổi base64 thuần bỏ prefix; gửi UUID idempotent chống nộp trùng.
  - Cam kết tính minh bạch: lưu trữ hoàn toàn riêng tư trong cơ sở dữ liệu nội bộ tài khoản, không gửi file tới AI khi nhập, và tách biệt độc lập với 27 bài học chính thức.
  (3) Giao diện Trình phát & Chi tiết (/materials/:id - MaterialDetailView):
  - Player âm thanh native kết nối trực tiếp endpoint binary Range 206 /learning/materials/:id/audio.
  - Các nút điều khiển tua lùi/tiến 5 giây, thanh trượt thời gian, 6 mức tốc độ phát (0.5x, 0.75x, 0.9x, 1.0x, 1.25x, 1.5x).
  - Vòng lặp A–B chuyên sâu: Đặt mốc A, đặt mốc B (kiểm tra B >= A + 200ms), bật/tắt lặp đoạn và xóa mốc; thanh tiến độ hiển thị trực quan đoạn lặp; âm thanh tự động quay về A khi tới B.
  - Tự động lưu vị trí nghe, tốc độ và cấu hình vòng lặp A-B về server qua PUT /playback (có debounce và optimistic revision lock).
  - Tấm hiển thị Transcript tiếng Anh và Bản dịch tiếng Việt với nút bật/tắt linh hoạt; Modal "Sửa thông tin" cho phép chỉnh sửa tiêu đề và văn bản qua PATCH có revision độc lập mà không reset vị trí nghe.
  - Xóa học liệu an toàn: Hộp thoại xác nhận, giải phóng tài nguyên âm thanh và chuyển hướng về Hub.
  (4) Tích hợp điều hướng:
  - Thêm nút chuyển nhanh "Học liệu cá nhân của tôi" trên Thư viện nghe (/listening).
  - Thêm phương thức luyện tập "Học liệu nghe cá nhân" trong Trung tâm kỹ năng (/practice).
  (5) Kiểm chứng:
  - scripts/verify-v2-materials-fe.mjs: 13/13 ca kiểm tra trên trình duyệt Chromium thực tế đạt 100% (file picker giải mã browser, nhập học liệu, player phát native Range 206, chỉnh tốc độ 1.25x, mốc A-B, sửa metadata, khôi phục sau reload, điều hướng từ listening/practice, xóa học liệu và 404).
  - npm run build hoàn tất thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất toàn diện FE-PHRASE-01 và sửa triệt để FE-AUDIO-02 theo UPGRADE-V2-PHRASES.md.
  (1) FE-PHRASE-01:
  - Bổ sung types (LearningPhraseItem, LearningPhraseLibrary, LearningStepPhrasesResponse, LearningSavePhrasesResult) và methods API (getLearningPhraseLibrary, getLearningStepPhrases, saveLearningStepPhrases) vào src/api/client.ts.
  - Tại bước vocabulary_in_context trong LessonRunView: hiển thị danh sách thẻ cụm từ tương tác với checkbox chọn từng cụm, nút "Chọn tất cả", "Bỏ chọn", nút lưu kèm đếm số lượng cụm đã chọn "Lưu vào bộ ôn ({count})".
  - Thể hiện trạng thái đã lưu rõ ràng với huy hiệu xanh "Đã lưu vào bộ thẻ" và nút "Xem trong bộ thẻ" mở thẳng thẻ từ vựng (/study-set/:id).
  - Khối điều khiển lưu cung cấp banner thành công với số lượng thẻ tạo mới/liên kết, nút "Mở bộ thẻ" và "Ôn tập SRS".
  - Xử lý mã lỗi 409 PHRASE_COLLECTION_CHANGED / PHRASE_LINK_CHANGED thân thiện, hướng dẫn người học đặt lại bộ thẻ về chế độ Private mà không chặn học.
  - Tự động phát sự kiện 'openquiz:srs-updated' khi lưu thành công, AppLayout lắng nghe và làm mới số thẻ đến hạn (due badge) trên Sidebar/Top bar tức thì mà không cần tải lại trang.
  - Tại trang Luyện tập (/practice): bổ sung thẻ nổi bật "Bộ cụm từ V2" khi người học có bộ cụm từ cá nhân, hiển thị tiêu đề bộ, số từ vựng, số liên kết bài học, số thẻ đến hạn ôn, cùng nút điều hướng nhanh "Xem bộ từ" và "Ôn tập ngay".
  (2) FE-AUDIO-02:
  - Khắc phục lỗi Bug A (newest-first): Trong LessonRunView, đảm bảo nhận xét mới nhất được giữ lại bằng cách chỉ lưu bản đầu tiên của mỗi step_id (`if (!map[item.step_id]) map[item.step_id] = item`); khi xóa bản nhận xét đang hiển thị, hệ thống tự động tải lại danh sách nhận xét để khôi phục hiển thị bản cũ trước đó nếu có.
  - Khắc phục lỗi Bug B (stale session race condition): Bổ sung `sessionIdRef` guard trên toàn bộ các hàm bất đồng bộ (fetchSession, handleRequestAudioReview, handleDeleteAudioReview, handleRequestAiFeedback, fetchStepPhrases) và reset sạch trạng thái reviews/phrases khi sessionId thay đổi, ngăn chặn tuyệt đối tình trạng nhận xét của phiên cũ rò rỉ sang phiên mới khi người dùng chuyển trang nhanh.
  (3) Kiểm chứng:
  - scripts/verify-v2-phrases-fe.mjs: 12/12 ca kiểm tra trình duyệt Chromium thực tế đạt 100% (tính lặp idempotent, lưu thẻ private, thẻ vào ngay hàng đợi SRS, giao diện LessonRunView và PracticeView, kiểm thử newest-first và khôi phục khi xóa, bảo vệ chuyển phiên).
  - scripts/verify-fe-audio-reviews-browser.mjs: 5/5 ca kiểm tra trình duyệt đạt 100%.
  - scripts/verify-v2-curriculum-complete.mjs: Toàn bộ 27 mục học / 158 clip WAV vượt qua 100%.
  - npm run build hoàn tất thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất triển khai và kiểm thử toàn diện FE-AUDIO-01 (Nhận xét phát âm định tính từ bản thu âm thật cho bước pronunciation_practice). (1) Cập nhật client types & API methods: getLearningSessionAudioReviews, requestLearningStepAudioReview, deleteLearningSessionAudioReview, hỗ trợ đầy đủ LearningAudioReviewItem, LearningAudioReviewCapability, SkillProgressItem với evidence_status ai_audio_feedback, và LearningProgressData audio_feedback. (2) Tại bước pronunciation_practice trong LessonRunView: lưu trữ song song Blob thật và ObjectURL, kiểm tra kích thước Blob (44 đến 450.000 byte), chuyển đổi base64 thuần (bỏ tiền tố data URL); nút "Gửi bản thu để AI nhận xét" chỉ kích hoạt theo yêu cầu chủ động sau khi thu âm hoàn tất; giữ UUID idempotent ổn định khi retry; hiển thị Audio Review Card chi tiết (câu mẫu, văn bản AI nghe được, nhận xét phát âm định tính, gợi ý cải thiện, giới hạn minh bạch, nút xóa nhận xét); xử lý 429 rate limit với banner hướng dẫn thời gian thử lại mà không chặn nút "Tiếp tục" hoặc tự luyện của học viên. (3) Màn Tiến bộ (/progress) & Modal Bằng chứng (/evidence): hiển thị thẻ tóm tắt nhận xét âm thanh trong kỳ, badge "Nhận xét audio" trên kỹ năng Phát âm (không cộng điểm giả lập hoặc suy diễn CEFR), Modal Bằng chứng tải và trình bày đầy đủ các bản nhận xét âm thanh trong phiên. Kiểm thử verify-v2-audio-reviews.mjs đạt 9/9 điểm hợp đồng, verify-fe-audio-reviews-browser.mjs trong Chrome thật đạt 5/5 tiêu chí với 0 page errors / 0 server errors, npm run build thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất tiếp nhận và nghiệm thu toàn diện CONTENT-07 (Đủ gói giáo trình V2: 24 bài thường + 3 bài ôn chặng = 27 mục học, 158 clip WAV câu riêng). (1) Kiểm thử trọn vẹn giáo trình qua verify-v2-curriculum-complete.mjs: xác nhận 2 chương trình (Nền tảng 18 bài, IT/System 9 bài); Thư viện nghe (/listening) cập nhật động đủ 27 học liệu. (2) Nghiệm thu bài viết email bàn giao (system-handoff-email-01): model câu mẫu chứa Subject và nội dung email đa dòng hiển thị hoàn hảo nhờ whitespace-pre-line leading-relaxed; bản nộp của học viên lưu giữ nguyên vẹn trong Bằng chứng (/evidence). (3) Nghiệm thu bài ôn chặng chuyên ngành IT/System (system-checkpoint-03, 9 bước): hiển thị chính xác kết quả 6 câu chấm, tỷ lệ đúng độc lập so với chuẩn 4/6, danh sách bài học gợi ý ôn lại kèm nút mở bài ôn độc lập không đè phiên cũ. Toàn bộ 14/14 ca kiểm tra trình duyệt Chrome đạt 100%, npm run build thành công 0 lỗi. Sẵn sàng cho giai đoạn nghiệm thu thực tế và nghe duyệt giọng đọc.

- BE — 21/10/2026: nghiệm thu CONTENT-07, contract1.10.0/schema10/128route. Hoàn tất thêm6bài thường/1ôn; tổng24bài thường/3ôn =27mục,158clip. Foundation16bài/2ôn, System8bài/1ôn. 70test toàn BE đạt; build FE đạt;8ca Chrome xuyên suốt có ôn system-checkpoint-03 đạt,0pageerror/BE500/AI. Không sửa src/\*\* hoặc model/key/schema. Thêm danh mục sinh từ nguồn BE không kèm đáp án. Bàn giao UPGRADE-V2-CONTENT-07.md, vẫn pilot chờ người thật duyệt audio và nghiệm thu giao diện từng bài mới.

- BE — 21/10/2026: nhận CONTENT-07: hoàn tất gói biên soạn đầu với 2 bài nền tảng, 4 bài IT/System và ôn chặng chuyên ngành. Mục tiêu tổng24bài thường/3ôn, không đổi schema/API hoặc src/\*\*. Đã đọc nghiệm thu CONTENT-06 của Anti; audio local, không gọi Gemini.

- FE — 21/10/2026: tiếp nhận CONTENT-06 (giao tiếp sinh hoạt: số lượng đồ vật, tần suất/thói quen và nhờ nói lại khi chưa hiểu). (1) Kiểm thử toàn diện cả 3 bài học mới qua verify-v2-content-06.mjs: 8 bước mỗi bài chạy mượt mà; các câu trắc nghiệm ngữ pháp/nghe/đọc hiểu được chấm độc lập; câu sai được tự động ghi nhận vào Sổ lỗi (/learning/mistakes); bản nộp và bằng chứng (/evidence) lưu giữ chính xác văn bản gốc. (2) Thư viện nghe (/listening) cập nhật động hiển thị đầy đủ 20 bài học / 116 clip WAV câu riêng; Range 206 audio streaming hoạt động chuẩn xác. (3) Lộ trình Nền tảng ghi nhận đầy đủ 16 mục học (14 bài thường + 2 ôn chặng), không làm thay đổi trạng thái snapshot của Hôm nay hay nhánh IT/System. Kiểm thử trình duyệt Chrome thực tế 14/14 ca đạt, npm run build thành công 0 lỗi.

- BE — 21/10/2026: hoàn tất CONTENT-06, contract1.9.5/schema10/128route. Thêm3bài nền tảng số lượng, tần suất và yêu cầu làm rõ; 3WAV/18clip. Tổng20mục (18bài thường/2ôn),116clip. 68test toàn BE đạt, FE build thành công; không gọi AI thật, sửa src/\*\*, schema hoặc key/model. Giao Anti kiểm giao diện theo UPGRADE-V2-CONTENT-06.md. Còn6bài thường/1ôn theo mục tiêu24/3; chưa phải toàn giáo trình hoàn chỉnh.

- BE — 21/10/2026: nhận CONTENT-06: số lượng/danh từ, tần suất/thói quen và yêu cầu làm rõ lịch sự; ba bài nền tảng có nghe/đọc/ngữ pháp chấm thật và nói/viết. Đã đọc nghiệm thu FE CONTENT-05 của Anti, không sửa src/\*\* hoặc gọi AI để dựng bài.

- FE — 21/10/2026: tiếp nhận CONTENT-05 (nhánh IT/System mở rộng). (1) Kiểm thử toàn diện 3 bài chuyên ngành mới (system-files-01, system-service-status-01, system-incident-handoff-01): cả 3 bài 8 bước đều chạy thông suốt, lưu giữ bản nộp và bằng chứng 8 bước nguyên vẹn, audio WAV câu riêng Range 206 hoạt động chuẩn xác; tổng cộng nhánh IT/System đạt 4/4 bài (độ bao phủ 75%). (2) Thư viện nghe (/listening) tự động cập nhật lên 17 mục học / 98 clip câu riêng, bổ sung badge trực quan phân biệt 'IT / System' và 'Nền tảng' cho từng thẻ bài nghe. (3) Tinh chỉnh LessonRunView xử lý instruction và prompt nhiều dòng với whitespace-pre-line leading-relaxed để các đoạn hướng dẫn dòng lệnh, tình huống dịch vụ không bị dính dòng trên trình duyệt. (4) Giữ nguyên vẹn thiết kế: lộ trình Nền tảng luôn là mặc định, nhánh IT/System là tùy chọn riêng biệt, không tự đổi focus hay làm thay đổi kế hoạch snapshot trong ngày của Today. Toàn bộ 14/14 ca kiểm tra trình duyệt Chrome đạt 100%, scripts/verify-v2-it-lessons.mjs đạt 100%, npm run build thành công 0 lỗi.

- BE — 21/10/2026: hoàn tất CONTENT-05, contract1.9.4/schema10/128route. Thêm3bài IT/System tám bước, 3WAV nguyên bài/18clip; tổng17mục/98clip. 15test BE liên quan đạt, không chạy lại toàn suite hoặc gọi AI thật. FE build đạt,14ca Chrome đạt gồm micro giả thu/dừng/rời màn: tracks ended, URL được revoke, không tạo lại sau unmount. Không sửa src/\*\*. Bàn giao UPGRADE-V2-CONTENT-05.md; micro vật lý/chất lượng audio chưa kiểm.

- BE — 21/10/2026: nhận CONTENT-05 (ba bài IT/System riêng: thao tác tệp, trạng thái dịch vụ, báo sự cố/bàn giao). Đã đọc sửa cleanup recorder/ObjectURL của Anti; sẽ kiểm thêm bằng micro giả trong Chrome, không phải đánh giá phát âm/micro thật. Giữ nền tảng chung độc lập và không sửa src/\*\*.

- FE — 21/10/2026: tiếp nhận CONTENT-04 và hoàn tất trọn vẹn dọn dẹp MediaRecorder/ObjectURL sau unmount. (1) Đồng bộ cả ListeningPracticeView và LessonRunView với ref isMountedRef, recordingStreamRef, và recordedAudioUrlRef: chặn tuyệt đối recorder.onstop tạo ObjectURL hoặc gọi setState sau khi component unmount; thu hồi URL (URL.revokeObjectURL) ngay khi unmount, đổi câu/bước hoặc bắt đầu thu âm mới; dừng toàn bộ stream tracks an toàn kể cả khi getUserMedia vừa resolve sau unmount. (2) Tương thích hoàn toàn với 14 mục học và 80 clip (gồm bài 8 bước foundation-now-01 và bài ôn 9 bước foundation-checkpoint-02); màn hoàn tất bài ôn hiển thị chính xác tiêu đề bài học, tỷ lệ đúng độc lập và danh sách bài gợi ý ôn lại. Kiểm thử build FE thành công 0 lỗi, toàn bộ 12/12 ca kiểm tra trình duyệt Chrome đạt 100%, không phát sinh lỗi trang hay cảnh báo rò rỉ bộ nhớ.

- BE — 21/10/2026: hoàn tất CONTENT-04 và kiểm lại Anti. Contract1.9.3/schema10/128route. Thêm foundation-now-01 (8bước), foundation-checkpoint-02 (9bước), 2WAV/12clip; tổng14mục/80clip. 66test toàn BE đạt; không gọi AI thật, không sửa src/\*\*. Trước khi tăng danh mục, FE build thành công và Chrome12ca đạt, có lost-response retry giữ UUID + checkbox false/câu mới/reload. Còn cleanup ObjectURL/onstop sau unmount bàn giao Anti; micro vật lý chưa kiểm. Chi tiết UPGRADE-V2-CONTENT-04.md.

- BE — 21/10/2026: nhận kiểm lại FE-LISTEN-02, bổ sung kiểm Chrome trường hợp mất response sau khi server đã lưu. Bước tiếp theo CONTENT-04: hiện tại tiếp diễn và ôn chặng về thời gian/quá khứ/kế hoạch, tận dụng renderer hiện có; không sửa src/\*\* hoặc gọi AI.

- FE — 21/10/2026: hoàn tất toàn diện 6/6 mục FE-LISTEN-02 theo UPGRADE-V2-LISTENING-AUDIT.md. (1) Đổi selfReviewed mặc định false trên mỗi câu mới, câu đầu và sau reload; chỉ cho lưu khi người học tự tích xác nhận. (2) Lưu giữ submission_id UUID ổn định qua các lần retry cùng câu/payload, tránh tạo UUID mới gây nhân bản hoặc lệch trạng thái, xóa retry tracker khi thành công. (3) Dọn dẹp an toàn microphone stream & MediaRecorder: dừng tracks nếu component unmount khi getUserMedia đang resolve, bắt lỗi MediaRecorder init, dọn ObjectURL khi chuyển câu và rời màn, chặn nút Lưu/Bỏ qua khi đang thu âm. (4) Bổ sung xử lý lỗi âm thanh onError và play().catch với thông báo rõ ràng và nút thử lại; micro lỗi không làm gián đoạn việc nghe audio. (5) Tinh chỉnh phím Ctrl đơn: reset cờ sạch sẽ, không kích hoạt khi dùng tổ hợp Ctrl+C/V/A hoặc đang gõ input/contenteditable. (6) Định nghĩa type ListeningSessionHistoryItem riêng biệt, an toàn với optional settings/summary. Build FE thành công 0 lỗi và 11/11 kiểm tra Chrome thực tế đạt 100%.

- BE — 21/10/2026: nghiệm thu INT-LISTEN-02, contract 1.9.2/schema 10/128 route. Sửa history thiếu settings/summary và last_practised_at tính nhầm skip. Hai lỗi tái hiện trước sửa, 8 test liên quan sau sửa đều đạt; build FE đạt, 11 kiểm tra Chrome thật gồm history/resume/reload đạt. Không gọi AI hoặc sửa src/\*\*. Bàn giao FE-LISTEN-02 theo UPGRADE-V2-LISTENING-AUDIT.md; checkbox tự tích được ghi nhận trực tiếp trên Chrome, các mục retry/micro/audio là lỗi đọc code cần Anti xử lý và kiểm thêm.

- FE — 21/10/2026: hoàn tất FE-LISTEN (Thư viện nghe câu và Shadowing) theo UPGRADE-V2-LISTENING.md và UPGRADE-V2-CONTENT-03.md. Nối trọn vẹn 6 API (/learning/listening, /learning/listening/:lesson_id, /learning/listening/sessions, v.v.). Xây dựng 2 views mới: ListeningLibraryView (/listening) và ListeningPracticeView (/listening/practice/:id), tích hợp vào PracticeView và ProgressView (widget listening_practice). Hỗ trợ phím tắt Ctrl nghe lại (bỏ qua Ctrl+C/V/A và input), thu âm micro local đối chiếu trên trình duyệt (MediaRecorder), Range 206 audio WAV, tự ghi nhận số lượt và tự đánh giá (self-reported) trung thực không giả lập điểm phát âm tự động. Kiểm thử E2E scripts/verify-v2-listening-flow.mjs 9/9 ca đạt, kiểm thử trình duyệt Chrome thực tế scripts/v2-browser-listening.mjs 9/9 ca đạt, 0 pageerror/server error. npm run build thành công 0 lỗi.

- BE — 21/10/2026: nghiệm thu CONTENT-03. Ba bài mới quá khứ/quá khứ với did/kế hoạch going to, mỗi bài 8 bước có 3 câu chấm thật; đã có 3 WAV nguyên đoạn và 18 clip riêng mới. Tổng 12 mục và 68 clip. 64 test toàn BE đạt, không gọi Gemini hoặc sửa FE/schema. LISTEN-01 vẫn hoạt động, bàn giao FE-LISTEN được khôi phục vào trạng thái chung sau khi file bị quay về thông số cũ. Giao diện mới và micro/audio bằng tai chưa nghiệm thu.

- BE — 21/10/2026: nhận CONTENT-03: ba bài nền tảng tiếp theo về quá khứ và kế hoạch, có audio và câu hỏi nghe/đọc/ngữ pháp chấm thật, nói/viết tự luyện. Giữ nội dung và tiến độ cũ; không sửa FE hoặc gọi Gemini. LISTEN-01 ở server vẫn là contract 1.9.0/schema 10/128 route; phần trạng thái bị quay lại thông số cũ sẽ được đồng bộ khi nghiệm thu.

- BE — 21/10/2026: nhận LISTEN-01: thư viện nghe từ học liệu đã có, clip từng câu thật và session luyện nghe/shadowing có resume. Không căn timestamp giả vào audio nguyên đoạn; câu sẽ được tổng hợp riêng và có duration thật. Không sửa FE hoặc gọi Gemini.

- FE — 21/10/2026: hoàn tất AI-01 (Nhận xét AI cho bài nói dạng transcript và bài viết đã nộp) theo UPGRADE-V2-AI-FEEDBACK.md. Bổ sung types client (LearningAiFeedbackItem, ai_feedback_count, ai_feedback progress) và methods API (getLearningSessionAiFeedback, requestLearningStepAiFeedback). Tích hợp nút 'Nhờ AI nhận xét bài đã nộp' vào LessonRunView sau khi nộp bài nói/viết, hiển thị lỗi provider/giới hạn lượt gọi (429/503) với cơ chế retry chủ động mà không chặn chuyển tiếp bài học, trình bày panel nhận xét chi tiết (điểm tốt, sửa câu gốc->gợi ý, câu mẫu tham khảo, mẹo luyện tập) và giữ nguyên vẹn bài nộp gốc. Cập nhật EvidenceModal trong ProgressView để hiển thị nhận xét AI đã lưu, đồng thời cập nhật chỉ số kỹ năng và tổng hợp nhận xét trong ProgressView. Viết scripts/verify-v2-ai-feedback.mjs kiểm thử toàn diện 8/8 ca đạt. npm run build thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất tiếp nhận CONTENT-02 / UPGRADE-V2-CHECKPOINT.md. Cập nhật types client (lesson_kind, LearningCheckpointSummary), thêm badge 'Ôn chặng' nổi bật và phân biệt hành động 'Ôn lại chặng' / 'Bắt đầu ôn chặng' trong MyProgramView (/my-program). Xây dựng vùng hiển thị kết quả ôn chặng trong LessonRunView (/lesson-run/:id): nhận biết rõ ràng trạng thái Đạt tiêu chí ôn chặng (passed=true) vs Nên ôn lại bài học (passed=false), hiển thị 4 thẻ số liệu (câu đúng, đúng độc lập so với chuẩn tối thiểu 4/6, nói/viết tự luyện rubric, bước hoàn thành), cam kết minh bạch tiêu chuẩn nội bộ (không quy đổi điểm CEFR/chứng chỉ), và danh sách bài học đề xuất ôn lại kèm nút 'Ôn bài này' mở phiên học mới độc lập không đè phiên cũ. Viết scripts/verify-v2-checkpoint-flow.mjs kiểm thử trọn vẹn cả 2 ca passed và review_needed. npm run build thành công 0 lỗi.

- BE — 21/10/2026: nhận AI-01: nhận xét bài nói dạng transcript và bài viết đã nộp, người học chủ động yêu cầu. Cache/deduplicate, lưu riêng, không thay bài gốc/điểm/SRS; lỗi provider không chặn học. Chưa có API sẵn sàng cho đến nghiệm thu. Không sửa FE/.env/model.

- BE — 21/10/2026: hoàn tất CONTENT-02. Ba bài nền tảng và một bài ôn có WAV local, tổng 9 mục. Thêm lesson_kind và summary.checkpoint (đạt khi đúng độc lập tối thiểu4/6câu, gợi ý bài ôn), không khóa bài sau.10 test BE liên quan và8 kiểm tra Chrome đạt,0 request AI; không sửa FE hoặc schema. Contract1.7.0/schema8/119route. Giao Anti vùng hiển thị kết quả theo UPGRADE-V2-CHECKPOINT.md; chưa coi toàn bộ giáo trình đã xong.

- FE — 21/10/2026: tiếp nhận CONTENT-01b và INT-02 từ Codex. Bổ sung loại bước mới `reading_comprehension` (Đọc hiểu) vào client types, LessonRunView và MistakesView; hiển thị prompt giữ định dạng đa dòng (whitespace-pre-wrap) cho đoạn đọc ngữ cảnh; cập nhật thông điệp kỹ năng đọc trong ProgressView ('Chưa có lượt đọc được chấm trong khoảng này') và loại bỏ hoàn toàn các chuỗi đếm tĩnh (7 bước / 4 bài). Viết scripts/verify-v2-reading-lesson.mjs kiểm thử trọn vẹn bài 8 bước Một ngày học tập (foundation-routine-01), xác nhận đọc hiểu được chấm điểm, cập nhật vào phân tích kỹ năng và lưu trữ trong bằng chứng nộp bài (5/5 ca đạt). npm run build thành công 0 lỗi. Sẵn sàng đón nhận CONTENT-02.

- BE — 21/10/2026: nhận CONTENT-02: thêm ba bài nền tảng (người/vật, vị trí, câu phủ định/câu hỏi) và một bài ôn chặng đầu, dùng renderer hiện có. Không thêm màn hoặc gọi AI; giữ nội dung/phiên cũ. Sẽ bàn giao metadata bài ôn sau kiểm thử.

- BE — 21/10/2026: nghiệm thu CONTENT-01b/INT-02. Build FE hiện tại thành công; kiểm Chrome bằng script v2-browser-integration.mjs trên DB tạm đạt 7 kiểm tra, không lỗi trang/BE và0 request AI.13 test BE học/sổ lỗi/progress đạt. Không sửa src/\*\* hoặc model/key. Thêm bài Một ngày học tập có WAV và reading_comprehension, cập nhật thống kê đọc; không đổi schema/payload cũ. Contract1.6.1/schema8/119route. Audio/micro vật lý chưa được kiểm tra.

- FE — 21/10/2026: hoàn tất FE-04 (Tiến bộ & Lịch sử học tập). Triển khai ProgressView (/progress) với 2 tab hoàn chỉnh: (1) Tổng quan kỹ năng theo khung 7/14/30/90 ngày, biểu đồ ngày địa phương kết hợp bài học và ôn Sổ lỗi, số liệu kỹ năng thực tế (không làm tròn null thành 0%, nhãn tự luyện rõ ràng không giả điểm AI), độ bao phủ chương trình Nền tảng và IT/System, cam kết tính minh bạch limitations; (2) Lịch sử các phiên học với bộ lọc Tất cả/Đang dở/Đã hoàn thành, nút Tiếp tục học và Modal xem bằng chứng bài nộp thực tế (GET /learning/sessions/:id/evidence) giữ nguyên vẹn text người học nộp. Thêm mục Tiến độ trên Sidebar. Viết scripts/verify-v2-progress-flow.mjs kiểm thử toàn bộ 8/8 ca đạt. npm run build thành công 0 lỗi.

- FE — 21/10/2026: hoàn tất FE-03 (Sổ lỗi & ôn tập ngắt quãng). Xây dựng MistakesView (/mistakes) với đầy đủ 4 tab lọc (Cần ôn ngay, Đang theo dõi, Đã giải quyết, Tất cả), tổng quan thống kê, thẻ câu hỏi, trình phát audio WAV Range 206, hỗ trợ gập (gợi ý, transcript, bản dịch, lịch sử ôn trước), nộp bài với UUID idempotency và chặn nộp trước hạn 409 REVIEW_NOT_DUE. Tích hợp liên kết 'Xem trong Sổ lỗi' từ feedback câu sai trong LessonRunView, hiển thị widget mistake_summary trên TodayView, thêm mục Sổ lỗi có badge trên Sidebar. Viết scripts/verify-v2-mistakes-flow.mjs kiểm thử toàn bộ 14/14 ca đạt. npm run build thành công 0 lỗi. Tiếp nhận bàn giao FE-04 (Tiến bộ và lịch sử) qua UPGRADE-V2-PROGRESS.md.

- BE — 21/10/2026: hoàn tất BE-03b, bàn giao FE-04 qua UPGRADE-V2-PROGRESS.md.3 test mới và10 test hồi quy học/sổ lỗi đạt; không chạy lại toàn suite trong lượt này. Contract1.6.0/schema 8/119 route. Không sửa FE/DB/.env hoặc gọi AI. Chưa xác nhận Anti đã tích hợp FE-03/04.

- BE — 21/10/2026: nhận BE-03b (Tiến bộ/lịch sử/bài đã nộp), chỉ thêm API đọc dữ liệu V2, không đổi schema hoặc payload màn học/sổ lỗi. Không đợi FE-03 để làm độc lập; sẽ bàn giao FE-04 khi kiểm thử xong.

- BE — 21/10/2026: nghiệm thu BE-03a, đã bàn giao FE-03.51 test toàn BE đạt; sau bổ sung mistake_id/lịch sử kiểm lại10 test liên quan đạt. Backup trước schema 8: server/data/pre-mistakes-1792575570310.sqlite. Không sửa FE hoặc gọi Gemini. Sổ lỗi mới chỉ tích hợp bài V2 chấm lựa chọn; chưa gom lỗi của mọi công cụ cũ hoặc lỗi nói/viết AI.

- FE — 21/10/2026: bổ sung V2 Today banner lên DashboardView (hiển thị trạng thái kế hoạch ngày, nút tiếp tục phiên đang dở hoặc mở /today). Sẵn sàng nhận FE-03 (màn Sổ lỗi & ôn câu sai) khi Codex hoàn thành BE-03a.

- BE — 21/10/2026: đã đọc xác nhận FE-02b/INT-01 pilot của Anti. Nhận BE-03a: sổ lỗi tự ghi từ câu nghe/ngữ pháp sai, API ôn lại và tiến độ sửa lỗi; giữ nguyên payload phiên hiện tại, không sửa FE. Chưa có API sổ lỗi sẵn sàng cho đến dòng nghiệm thu tiếp theo.

- FE — 21/10/2026: hoàn tất FE-02b và nghiệm thu INT-01 pilot. Triển khai trọn vẹn 3 view: TodayView (/today), MyProgramView (/my-program), và LessonRunView (/lesson-run/:sessionId). Hỗ trợ đầy đủ contract 1.4.1: xử lý kế hoạch ngày, resume_route ngay cả khi rest_day, ôn SRS, trình chiếu 7 bước (nghe hiểu, từ vựng ngữ cảnh, ngữ pháp, phát âm thu âm local, tự luyện nói/viết có rubric, tổng kết reflection). Trình phát audio WAV thật từ BE với Range 206, autosave nháp debounced, khóa lạc quan revision, submission_id UUID chống nộp trùng. Viết verify-v2-full-flow.mjs kiểm thử toàn bộ 12/12 bước đạt trên cả Foundation và IT/System pilot. npm run build thành công 0 lỗi. Đã sẵn sàng phục vụ người học.

- BE — 21/10/2026: hoàn tất CONTENT-01a và BE-02c; kiểm tra6 test V2 và 1 test profile đều đạt. Hai bài mới có WAV local; không gọi Gemini, không sửa FE. Kế hoạch ngày giữ snapshot preferred_days, ngày ngoài lịch chỉ ôn/tiếp tục; manual study luôn mở và resume hoạt động ngay cả plan trống. Đã kiểm tương thích plan cũ dạng mảng; không đổi schema. Các kết quả 45 test toàn BE ở lượt trước vẫn là báo cáo lịch sử, không giả là vừa chạy toàn bộ lại.

- BE — 21/10/2026: đã đọc bàn giao FE-01/02a của Anti. Nhận tiếp lịch học theo preferred_days và CONTENT-01 (hai bài nền tảng kế tiếp); không sửa FE. FE-02b có thể tiếp tục theo API hiện có, thay đổi thêm sẽ ghi trong UPGRADE-V2-API.md.

- FE — 21/10/2026: hoàn tất FE-01 và FE-02a. Đã cập nhật sidebar theo đúng UPGRADE-V2-PLAN: gỡ Xếp hạng và Báo lỗi khỏi menu chính (giữ route/component); gom Lớp học vào khu Mở rộng; thêm Luyện tập (/practice) trung tâm cho 6 kỹ năng; thêm Cài đặt học (/settings/learning) và Cài đặt AI. Màn Cài đặt học nối GET/PUT /api/v1/learning/profile thật (15/30/45m, general/system, ngày ISO 1-7, timezone, trạng thái is_default, updated_at). Viết script verify-v2-learning-profile.mjs kiểm thử 7/7 ca đạt. npm run build thành công 0 lỗi. Đã đọc UPGRADE-V2-API.md để sẵn sàng nối FE-02b.

- BE — 21/10/2026: nghiệm thu BE-01b/02 pilot.45 kiểm thử toàn BE đạt; WAV/range, kế hoạch theo ngày, session/revision/replay và phiên bản nội dung đã kiểm tra. Backup trước migration lưu server/data/pre-learning-v2-1792572527058.sqlite. Livehealth200/schema 7; không sửa FE/.env/model, không gọi AI. Anti đọc UPGRADE-V2-API.md và nối một bài trước khi tăng số màn/bài.

- BE — 21/10/2026: nhận BE-01b/BE-02; chỉ sửa server, tests và tài liệu. Video được ghi nhận vào thư viện nghe ở đợt3, chưa mở rộng phạm vi hiện tại. Anti có thể làm FE-01/02a và component FE-02b theo contract; chưa gọi các API đang làm như đã sẵn sàng.

- BE — 21/10/2026: bắt đầu và hoàn tất BE-01a. Thêm server/learning-profile.mjs, đăng ký route và test. Kiểm thử profile + hồi quy API/auth/SRS:15 đạt,0 lỗi trên DB tạm, không gọi Gemini. Các phần V2 khác chưa triển khai. Không sửa FE/DB schema.
