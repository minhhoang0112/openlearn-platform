# Nhật ký BE do Codex quản lý

File này ghi chi tiết công việc BE, tách khỏi STATUS để giảm xung đột với bản đang mở của Anti. STATUS và từng hợp đồng API vẫn là nơi bàn giao. Anti ghi nghiệm thu FE ở STATUS; không lưu đè file này từ bản cũ.

- 21/10/2026 — MATERIAL-01: nhận thư viện học liệu nghe cá nhân. Nhập audio và transcript do người học cung cấp, phát/lặp A–B, lưu vị trí/tốc độ riêng; không tải nội dung bên ngoài hoặc gọi AI. Dữ liệu người dùng tách khỏi27bài chính thức. Đang triển khai, chưa có API sẵn sàng.

- 21/10/2026 — MATERIAL-01 nghiệm thu BE: contract1.13.0/schema13/142route,8API riêng tư, upload tối đa8MiB (body12MiB chỉ route import), transcript/edit metadata và playback CAS tách biệt.85test toàn BE đạt;5kiểm native Chrome decode/Range/resume/delete đạt, không phải UI Materials. Không sửa src/**/model/key hoặc gọi AI. Backup pre-learning-materials-1792595301518.sqlite. Anti nhận FE-MATERIAL-01 qua BE-NEXT.md và UPGRADE-V2-MATERIALS.md.
- 21/10/2026 — kiểm lại FE-PHRASE-01/FE-AUDIO-02: build thành công,12ca verify-v2-phrases-fe.mjs trong Chrome đạt; không còn lỗi chọn bản cũ/chuyển session trong các ca đã kiểm. STATUS không sửa trong lượt này để tránh xung đột buffer với Anti.

## 2026-10-21 — MATERIAL-02: manual cues + personal dictation

- Kiểm bản Anti: build qua, verify-v2-materials-fe.mjs13 ca Chrome qua trên DB riêng; phát hiện thêm các ca autosave/A tạm/nhãn tiến độ qua đọc source, bàn giao FE sửa. Không sửa src/ hoặc STATUS.
- Thêm4 API cues và dictation-attempts, schema14; optimistic cue revision độc lập, bounds/order/atomic save, server exact-token comparison, bounded LCS diff, explicit assisted/give-up, immutable source snapshots, UUID retry và owner/delete cascade. Không gọi AI; không đổi Today/SRS/điểm kỹ năng.
- Backup trước migration: server/data/pre-material-cues-1792596878130.sqlite. Contract1.14.0 /146 route; tài liệu UPGRADE-V2-MATERIAL-CUES.md. FE-MATERIAL-02 chưa triển khai.
- Bộ đầy đủ90 test qua sau cập nhật schema fixtures; giới hạn500 token được kiểm thêm sau đó, xem learning-v2-validation.json cho kết quả cuối.

- Xác minh cuối: health200 schema14; capabilities contract1.14.0. Sau guard500 token,5 test cues chạy lại đạt;90 full BE trước guard đạt. Đã xuất146 route. Không sửa STATUS hoặc src/, không dùng live Gemini.

## 2026-10-21 — MATERIAL-03: subtitle preview/export

- Kiểm Anti MATERIAL-02: npm run build qua;18 ca Chrome thực tế qua,0 page/server error; báo cáo material-cues-ui-validation.json. Không gọi AI, không sửa src/STATUS.
- Thêm2 API private preview-import và export SRT/VTT, contract1.15.0/schema14/148 route; không đổi schema nên không migration/backup mới. Preview không ghi DB, xác nhận dùng PUT cues hiện có; shared validator đảm bảo bounds/order/limits như nhập tay. Cảnh báo markup/settings/metadata bị bỏ, timestamp-map/overlap bị từ chối, text HTML không render. Export chỉ text/mốc đã lưu, không bản dịch/đáp án/audio.
-13 test liên quan materials/cues/subtitles đạt, trong đó4 nhóm subtitle mới. Không chạy lại toàn suite sau thay đổi nhỏ này; báo cáo full90 ở lượt trước vẫn là lịch sử. FE-MATERIAL-03 bàn giao tại UPGRADE-V2-SUBTITLES.md và BE-NEXT.md.

## 2026-10-21 — Nghiệm thu và chốt tạm bản cá nhân

- Build qua;94 test BE toàn bộ sau sửa và7 suite Chrome qua. Cập nhật selectors của study-browser-qa và functional-browser-qa theo FE hiện tại; không bỏ phạm vi kiểm thử.
- Tái hiện và sửa lỗi thật: submit đọc hiểu không trả questions làm trắng trang; reload completed reading tự tạo attempt/gọi AI mới. Shared readingView cho GET/submit/replay; resume reading giữ phiên hoàn thành khi không yêu cầu bài mới. Có regression tests và UI submit/reload. Ngữ pháp giữ quy tắc resume cũ.
- Runtime3000/4000 trả200; backup server/data/release-1.15-1792601016537.sqlite. Không sửa src/ hoặc STATUS, không gọi live AI.
- Đóng hạng mục FE-MATERIAL-03, dừng tính năng mới theo yêu cầu tiết kiệm quota; đọc RELEASE-CLOSEOUT.md. AI thật, audio/micro vật lý và học dài ngày chưa được đảm bảo từ test tự động.

## 24/10/2026 — CLARITY-01: tái kiểm logic học

- Mở lại theo phản hồi người dùng: report chốt trước là kỹ thuật, không đủ xác nhận SRS/UX mới. Chrome DB riêng xác nhận due0 nhưng FE fallback bộ lạ; mode Viết chỉ đổi state, không bài tập mới; không có Trang chủ trong sidebar. Ảnh/report learning-clarity-browser-audit.json. Không sửa src/.
- BE contract1.16/schema14/149 route: GET /srs/practice phân nhómscope due/all/mastered, chọnIDs cho chế độ thật; conversations kiểm settings.word_ids. SRS queue overlay word_notes/prepared+total+star/last_reviewed. PATCHquality có expected_last_reviewed_at và409 REVIEW_CHANGED; scheduler timestamp tăng đơn điệu.
-25 ví dụ chuẩn bị sẵn, exact Vietnamese sense guard, không đè câu/note cũ. Chi tiết thẻ allow_ai:false không gọi model; ngữ pháp allow_ai:false dùng ví dụ lưu sẵn, trả lỗi rõ thiếu nội dung. Legacy behavior vẫn giữ để tương thích, FE phải tắt auto AI theo hợp đồng. Không xoay key, không live AI, không đổi env/model/schema.
-97 test toàn BE qua, build qua. Tests fixture cache/grammar cố ý có câu riêng để tiếp tục kiểm provider/dedup sau khi có prepared fallback. Ba nhóm regression mới ở learning-clarity.test.mjs. Bàn giao cụ thể LEARNING-CLARITY-ANTI.md.

## 24/10/2026 — CLARITY-02: đồng bộ học kết hợp, tiến độ, nghĩa và dịch

- Phản hồi ảnh user: comprehensive dùng renderer riêng tối giản, scope AI toàn set, cardpath gán studying bài1, synonym chỉ split semicolon, controls ví dụ trùng, sidebar/back không context. Không sửa src/.
- BE1.17/schema14/151 route: comprehensive word/step counts rõ, resume phiên khớp, restart chủ động, evidence whole terms tránh brandish=brand. SetCard.progress thống nhất counts/state/lastsession. Dictionary exact-entry local/prepared20 mục, bảo vệ note riêng. Readingtranslation explicit defaultfalse/cache+dedup, giữ drafts/grades vàowner.
- Ngân hàng ví dụ tăng25→41, chỉ đúng sense/câu; ví dụAI thiếu dịch có exact known sentence được overlay bản dịch chuẩn bị sẵn, không sửa raw note/source.
-102 full BE test đạt trước mở rộng16 mục;16 regression liên quan chạy lại đạt sau đó. Build qua, không gọi live AI hoặc đổi .env/schema. FE pending hợp đồng LEARNING-CONSISTENCY-ANTI.md.

## 24/10/2026 — DICT-01: sửa tail thành detail và dịch ngoài thư viện

- Gốc lỗi: utility lấy danh sách LIKE khi không có exact. Thay bằng POST /dictionary/translate: local exact rồi MyMemory EN↔VI, giữ query, không Gemini/key,500byte/segment, cache24h500entry/user-keyed và pending dedup, lỗi mạng/quota rõ.
- Nối trực tiếp utility và modal tối thiểu: nguồn/notice dịch bên ngoài, stale response guard, lưu thẻ đúng chiều. Không thay thiết kế tổng thể của Anti.
- Thử live1từ công khai tail: HTTP200, dịch đuôi, đoạn cuối.5 nhóm test BE mới và5 Chrome mock cases qua; build qua;107 toàn BE test qua. Update fixture thiếu ví dụ sang appraise để vẫn test nhánh missing sau prepared bank đã có apply.
- Contract1.18/schema14/152route, không migration/env/model changes. Hợp đồng DICTIONARY-ONLINE.md; CLARITY-02 FE khác vẫn pending.


## 2026-10-25 — Product refinement, BE phần đầu
- Scheduler due_v1: bài đúng trước hạn chỉ là luyện, giữ interval/ease/repetitions; sai đưa về học lại, retry trước hạn không phạt liên tục. Giữ dữ liệu cũ và schema14.
- GET /learning/activity tổng hợp hoạt động lưu thực từ nhiều engine, phân trang, timezone và số từ riêng biệt; không trộn thành điểm kỹ năng V2, không tính skip/nghe playback/AI preview.
- Contract1.19.0; phân công Anti trong PRODUCT-REFINEMENT-ANTI.md. FE/API types thuộc Anti để tránh đụng file.
- Kiểm:111 ca toàn suite đạt trước bộ lọc skip/nguồn speaking;10 ca liên quan đạt sau cập nhật cuối. Planner và readiness chưa làm trong phần này.
- Xác nhận cuối: toàn bộ112 ca qua,153 route/schema14; chạy test-isolation=none vì môi trường sandbox chặn process spawn của npm test mặc định.

## 2026-10-25 — BE phần tiếp theo của Mốc 1
- daily-learning-plan.mjs thay planner cũ: mục tiêu chia theo số bước thật và quỹ thời gian, giữ weekly snapshot, có ôn từ/Sổ lỗi và prerequisite. Hoàn thành mục tiêu ngày không giả hoàn thành toàn bài.
- POST /learning/today/adjust với revision và remaining_minutes; giữ phần đã xong, draft và phiên. POST /learning/today/items/:item_id/start pin phiên/content_version và resume an toàn.
- GET /sets/:id/readiness dùng dữ liệu prepared/notes đúng tài khoản, không gọi AI; hỗ trợ phạm vi word_ids.
- Comprehensive completed nay dựa lõi3 bước có evidence thật; thêm core_completed/all_steps_completed/required/optional. Hai bước AI vẫn mở rộng, không tự đánh dấu hoàn thành.
-118 ca toàn bộ BE qua;6 ca mới planner/readiness/core qua lại sau bổ sung kiểm riêng ghi chú ở bộ public. Contract1.20.0/schema14/156route. Không sửa FE đang do Anti xử lý.
- Build FE gần nhất chưa qua: ListeningLibraryView.tsx:437 có đoạn JSX thừa; đã ghi vào BE-NEXT để Anti sửa trong phần sở hữu.

## 2026-10-25 — Kiểm FE Mốc1A và chốt bàn giao1B
- Build qua; chạy lại verify-refinement-m1.mjs đạt7 nhóm/4viewport,0page errors. Lỗi JSX cũ đã hết.
- Audit độc lập tái hiện180bộ nhưng searchFE không thấy B1School and Education ngoài100bản đầu; GETsets?q trả1match.
- Audit mục tiêu ngày15phút5/7bước: BEcompleted nhưng UIvẫn bước6/7,không có nút xong phần hôm nay.
- Giao REFINEMENT-M1B-ANTI.md cho FE: nối contract1.20, readiness/core3, sửa fullcatalogsearch/q/page và lỗi activity. Chưa làm Mốc2navigation.

## 2026-10-26 — Kiểm bàn giao Mốc1B và chuẩn bị Mốc2
- Build thành công; verify-refinement-m1b.mjs đạt6nhóm/4viewport,0page errors.
- Đọc nguồn phát hiện target_cursor từ URL được dùng trực tiếp và lỗi start kế hoạch tựfallback sang phiên thường; Codex sửa logic tại LessonRunView/TodayView, không đổi bố cục.
- Thêm verify-daily-goal-guards-browser.mjs:4ca qua (POSTstart503khôngfallback, URLtarget0không giảcomplete, item sai có phục hồi, target thật từBE). Hồi quy1B qua lại.
- Bàn giao REFINEMENT-M2-ANTI.md cho bước5mục điều hướng/Today/Explore;không cầnAPI mới.

## 2026-10-26 — Kiểm và chốt Mốc2
- Build qua, verify-refinement-m2 đạt6nhóm/4viewport/0pageerrors;daily-goalguards4ca qua.
- Phát hiện Auth coi queryfrom trên deep link là đíchlogin; thêm postAuthNavigation helper, capture đích trướcawait, sửa cảlogin/registervàdemo.
- Today shortcut còntrỏroot nayvềchínhToday; sửa/explore,semanticbutton,bỏnext_local_day UI vàcho metadata thời lượngwrapđúngmobile.
- verify-auth-context-browser đạt5ca saucácsửacuối (deep link+from,practice context,explicitreturnTo,rootToday,TodayExploreBack).
- Mốc3 contentplanđãviết,chưa cóAPIhoặccontentmới; không mởthêmUIfeature.

## 2026-10-26 — Mốc3 đợt1: authored foundation support
-4gói hỗ trợ đúnglesson/version/fingerprint,nằm ngoài graded content;không sửa dữ liệu cá nhân hoặc tạo versionbài mới.25từ/cụm,8nhóm ngữ pháp,9lỗi,8mẫu nói/viết và hướng dẫn nghe.
-POST support/open annotate riêng theo bước,không tăngrevision/đổi draft/cursor;BE giữ assistance learning_support qua reload/clientbỏflags. Xem sauchấm không sửa feedbackcũ.
-FE LessonSupportPanel đã nối runner,lazyload,giữinput,chốngrequestcũ,gấp nhóm nội dung,không gọiAI.
-Contract1.21.0/schema14/157route;123ca BE qua;buildqua;7nhóm Chrome trên4viewport qua,0pageerrors/0POSTtạoAI.
-Chưa mở rộng các bài còn lại;ưu tiên học thử4bài trước khi biên tập tiếp.
