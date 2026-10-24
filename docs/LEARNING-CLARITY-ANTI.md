# CLARITY-01 — Sửa luồng học và ôn tập, bàn giao Anti

24/10/2026. **Contract1.16.0 / schema14 /149 route.** Codex sửa server/tests; Anti sửa src/ và test FE. Đợt chốt trước chỉ chứng minh nhiều đường chạy, chưa nghiệm thu đầy đủ tính đúng của màn SRS mới và cách người học tìm tính năng. Không coi build/test cũ là xác nhận màn này đã đúng.

## 1. Lỗi được kiểm chứng, không chỉ đổi giao diện

Chrome với tài khoản mới: BE due=0, queue total=0; FE vẫn gọi sets và mở thẻ “It was great talking to you”. Bấm Viết không xuất hiện bài nhập tương ứng. Sidebar không có Trang chủ. Xem `learning-clarity-browser-audit.json` và ảnh `anti-reference/srs-audit-overview.png`, `srs-audit-write-mode.png`.

Đọc source RepetitionStudyView:

- fetchData thay hàng đợi rỗng bằng bộ đầu tiên từ getSets: phải bỏ hoàn toàn. Hết hạn là trạng thái hoàn tất, học thêm phải là lựa chọn khác có nhãn.
- filter due dùng status!='mastered': sai, từ mastered vẫn có thể đến hạn. Dùng queue BE, không loại theo status.
- all/mastered chỉ lọc mảng due hiện có nên không phản ánh tất cả từ. Không đặt tên Tất cả cho100 từ đầu.
- handleRate tự đặt mastered khi quality>=4; BE chỉ đặt mastered sau nhiều lượt. Bỏ cập nhật giả, dùng response BE và tải lại queue/summary. Xóa thẻ vừa ôn khỏi snapshot hoặc chuyển theo ID; không tăng index trên mảng vừa co lại rồi bỏ qua từ kế.
- tab Nghe/Viết/Trắc nghiệm hiện chỉ setStudyType, chưa có logic bài tập tương ứng. Phải nối engine thật như mục3.
- handleSaveSettings chỉ setSaveSuccess, không lưu gì. Không hiện Đã lưu thành công. Gỡ form vai trò/chứng chỉ/voice/theme khỏi màn SRS, dẫn sang Cài đặt học/AI hiện có; chỉ giữ tùy chọn thật được lưu hoặc có nhãn “chỉ phiên này”.
- fallback due305 và forecast2/33/1/3 nằm trong source, phải xóa. Với response forecast hiện tại đầy đủ thì số giả chưa xuất hiện trong ca Chrome này; vẫn không được dùng khi thiếu/lỗi API.
- bỏ card Premium, Nâng cấp, thương hiệu kép “OpenQuiz Premium OpenLearn Premium”; dự án cá nhân không có thuê bao.

## 2. Trang chủ và luồng tìm chức năng

Sidebar rõ ràng: **Trang chủ** `/` (dashboard/danh mục), **Học hôm nay** `/today` (kế hoạch), Lộ trình của tôi, Thư viện của tôi, Luyện tập, Ôn đến hạn, Sổ lỗi, Tiến độ. Trang chủ luôn nhìn thấy được, không chỉ logo. Logo vẫn về `/`. Active chính xác từng route, `/` không active mọi trang. Có nhãn cả mobile/sidebar thu gọn.

Dashboard giải thích một câu về hai lối: “Học theo kế hoạch” → today và “Tự chọn bộ từ/bài luyện” → danh mục. Today có link về Trang chủ/tự luyện, không làm màn danh mục thứ hai. Không đổi BE hoặc dữ liệu user vì đổi tên điều hướng.

## 3. BE mới: GET /api/v1/srs/practice

Cookie phiên, GET không gọi AI/không đổi SRS. Query `scope=due|all|mastered` mặc định due; `limit`1..100, `offset` phân trang **bộ từ**.

Data `{scope,as_of,items,total_groups,total_words,limit,offset,selection_limit:100,subscription_required:false,modes,notes}`. Mỗi item:

```json
{"set_id":163,"title":"Tên bộ","learning_language":"en","native_language":"vi","content_status":"complete","word_count":12,"word_ids":[1,2],"selection_truncated":false,"examples_available":2,"examples_missing":[],"practice_route":"/study-set/163","available":true}
```

Ví dụ minh họa word_ids rút gọn; thật trả tối đa100 ID. word_count là tổng bộ trong scope, nếu nhiều hơn selection_limit thì selection_truncated=true, phải ghi “100/X từ”, không giả đủ. total_words tính toàn bộ các trang; scope all là từ **đang theo dõi** (có word_progress), không phải mọi từ hệ thống. Scope due không rơi về bộ khác. available=false nếu bộ đang unavailable, giữ nhãn và không cho mở như dữ liệu đã chuẩn.

FE cho chọn bộ trước vì engine theo set_id. Không trộn word_id nhiều bộ vào một bài. GET modes cho biết requires_ai/srs_effect/selection/max_words. Những chức năng này đã có API, chỉ cần nối phạm vi đúng:

| Nút | Route FE | Payload bắt buộc truyền tiếp |
|---|---|---|
| Học/Viết/Quiz/Nghe chép/Test/Ghép | /study/:set, /dictation/:set, /exam/:set, /game/match/:set | POST /study/sessions: set_id, mode, settings.word_ids, settings.due_only=scope==='due'; quiz dùng settings.question_types=['quiz'] |
| Speaking | /ai-study/:set | POST /ai/generate với word_ids, tối đa20/lượt |
| Hội thoại | /conversation/:set | POST /conversations với settings.word_ids, tối đa100 |
| Ngữ pháp | /grammar/:set | POST /exercise-attempts: kind:'grammar_order', word_ids tối đa30, allow_ai:false |
| Đọc hiểu | /reading/:set | POST /exercise-attempts: kind:'reading', word_ids tối đa30; cần người học bấm tạo mới nếu dùng AI |

Route tự nó **chưa lọc từ**. Anti phải bổ sung đọc query/state `word_ids,review_scope` vào các view và đưa vào body khởi tạo; query URL là dữ liệu không tin cậy, BE sẽ kiểm quyền/phạm vi. Tạo helper launch dùng chung. Key resume/sessionStorage phải chứa scope+IDs để không vô tình tiếp tục bài toàn bộ thay cho bài ôn. IDs khác scope thì tạo bài mới có chủ ý, không áp scope vào một phiên cũ. Các engine đã lưu câu hỏi thì resume snapshot, không tự mở rộng sang các từ mới đến hạn.

Học/nghe chép/quiz/test/ghép chấm thật cập nhật SRS qua study engine. **Hội thoại/Speaking/grammar/reading không tự đổi lịch ôn chỉ vì đã mở hoặc nói xong.** Hiển thị “Luyện vận dụng từ đến hạn — không thay lượt ôn nhớ”; có nút quay về ôn. Không báo hoàn thành ôn khi chưa có bằng chứng nhớ từ.

GET `/srs/queue` đã thêm **total**, last_reviewed_at, starred boolean và overlay ví dụ/bản dịch/synonyms cá nhân hoặc prepared. Summary vẫn dùng **due**, không phải due_count; sửa badge AppLayout đang đọc nhầm. Forecast là ngày UTC; không gắn nhãn theo múi giờ cá nhân khi chưa chuyển đổi đúng, không dựng số giả.

Thẻ tự chấm PATCH `/words/:id/progress`: gửi `{quality:1..5,expected_last_reviewed_at:word.last_reviewed_at??null}`. BE transaction kiểm phiên bản,409 REVIEW_CHANGED nếu từ đã ôn ở tab/lần gửi trước; tải lại và báo rõ, không tự resend chất lượng với timestamp mới. Không retry mù request cũ. Nhấn kép chặn bằng ref/busy; các bài chấm có session/question id thì dùng idempotency vốn có.

## 4. Ví dụ có sẵn, không gọi AI ngầm

BE có **25 mục ví dụ song ngữ biên soạn sẵn**, chỉ áp khi đúng term + một nghĩa Việt khớp trong danh sách và thẻ chưa có ví dụ/cá nhân hóa. `example_source:'prepared'`. Không thay câu thư viện đã có, không thay note cá nhân. Bộ nhiều nghĩa khác không tự gán câu sai. Không tuyên bố đã bổ sung hết kho từ; phần thiếu vẫn có trạng thái rõ.

POST `/words/:id/learning-details` với **`{allow_ai:false}`** trả dữ liệu có sẵn và không gọi model, kể cả thiếu nội dung. Khi thiếu: có thêm details_available/translation_available/ai_requested:false. Khi đủ thì trả ApiWord như cũ. allow_ai không phải boolean400. Mặc định legacy vẫn cho AI để tương thích; **FE phải truyền false cho mọi tác vụ tự động/mount/flip/mở bản dịch**.

WordLearningDetails đang có effect auto gọi ensureDetails khi thiếu dịch: bỏ AI tự động ở cả StudySetView và SessionRunner. Dùng dữ liệu đã có, nếu cần background đọc thì allow_ai:false. ensureDetails cache/pending key phải chứa allow_ai và user/word; lỗi AI không được tự retry khi đổi thẻ/đổi tab. Nút “Nhờ AI bổ sung” là thao tác riêng chủ động, gửi allow_ai:true, có busy/429/retry thủ công. Xem note có sẵn không bắt phải cấu hình key.

Label: prepared→“Ví dụ có sẵn”, library→“Ví dụ trong bộ từ”, manual→“Ví dụ của bạn”, ai→“Ví dụ AI đã lưu”. Không gắn “AI tạo” lên mọi câu. Bản dịch có sẵn chỉ toggle, âm thanh dùng playAudio. Thiếu ví dụ/bản dịch: cho tự nhập/sửa và ghi rõ còn thiếu, không câu mẫu kiểu “This is a word…” cho đủ chỗ.

Ngữ pháp thêm `allow_ai:false`: dùng câu ví dụ có sẵn, không bắt buộc dịch trừ dạng translate. Thiếu câu409 EXAMPLES_REQUIRED với word_ids, thiếu bản dịch cho translate409 TRANSLATIONS_REQUIRED; mở editor bổ sung hoặc hỏi AI chủ động. Legacy gọi không có cờ vẫn có thể dùng AI; FE phải cập nhật. Không tự chạy hàng trăm lượt bù ví dụ lúc vào bộ.

## 5. Từ đồng nghĩa có tương tác thật

WordLearningDetails hiện là p underline, chưa có onClick. Đổi từng mục ngăn bởi ; thành button/focusable; click mở popover nghĩa, nút loa riêng đọc mục đó bằng playAudio. Dừng propagation để không lật thẻ/chuyển câu. Enter/Space dùng được, Escape đóng. Không tự phát mọi từ đồng nghĩa lúc mở thẻ.

Dùng GET `/dictionary?q=...` hoặc util lookup hiện có, ưu tiên exact term, đúng language/pos khi có; cache theo term+ngôn ngữ. Local library không đủ từ thì hiện “Chưa có nghĩa lưu sẵn”, cho mở Tra từ; không lấy nghĩa từ gốc gán bừa cho synonym. Lookup bên ngoài có thể lỗi mạng, không phải gọi Gemini và không được giấu lỗi. Giới hạn số mục hiển thị, không render HTML. Áp dụng cho mặt sau thẻ, danh sách từ và feedback Học, cùng một component.

## 6. Luyện tập phải chỉ rõ học gì và chọn gì

Đã có9 mode trong PracticeView, không chỉ shadowing. Vấn đề activeMode mặc định đầu và chọn nhóm/chọn bộ chưa rõ. Hiển thị nhóm kỹ năng rồi hành động có mô tả ngắn. Không auto bật mode đầu như người dùng đã chọn. Tách hai nguồn:

- Bài nghe có sẵn `/listening` và học liệu cá nhân `/materials`: mở trực tiếp, không bắt chọn bộ từ.
- Dictation/Speaking/hội thoại/grammar/reading/test/match: chọn bộ, số từ, ví dụ còn thiếu, dấu AI trước nút “Bắt đầu [tên bài]”. Có thể vào từ bộ từ hoặc từ Ôn đến hạn, giữ scope xuyên suốt.

Thêm Học từ/Học hai chiều đang có engine vào nhóm “Ôn nhớ từ”, không bắt người học suy ra từ menu khác. Miêu tả match là từ–nghĩa **Việt** nếu dữ liệu là en→vi; không ghi định nghĩa Anh. Exam là bài kiểm tra bộ từ, không tuyên bố đánh giá trình độ/chứng chỉ. Speaking dùng TTS mẫu và nhận xét AI, không hứa giọng người bản xứ hoặc điểm phát âm chuẩn nếu chưa kiểm âm thanh.

## 7. Hạn mức và phối hợp

Nhiều API key cùng project Gemini không tăng quota; [Google tính quota theo project](https://ai.google.dev/gemini-api/docs/rate-limits). Đợt này không làm xoay key để né giới hạn, không đổi .env/provider/model. Ưu tiên ví dụ sẵn/cache, chặn request trùng, không tạo bài khi reload, explicit AI và hướng dẫn lỗi429. Ollama đã có adapter nếu sau này người dùng chọn cấu hình trên máy.

Anti không sửa server/.env/DB/BE-NEXT/BE-WORKLOG. Không lặp lại replace toàn bộ thương hiệu khiến xuất hiện tên kép. Chia commit/log theo P0 SRS → P1 navigation/practice → P1 word details; cập nhật phần FE của STATUS sau khi đọc bản mới trên đĩa, không Overwrite buffer cũ.

## 8. Tiêu chí bắt buộc trước báo xong

1. Tài khoản chưa học: due0, queue trống, không gọi getSets làm fallback, không phát sinh điểm; số liệu và biểu đồ0 thật.
2. Từ mastered nhưng due vẫn ôn được. Các tab all/mastered truy vấn nguồn đúng, có tổng/phân trang. Hai bộ khác nhau không lẫn scope.
3. Mỗi nút chế độ mở được bài tập đúng và chỉ chứa IDs đã chọn. Hội thoại API settings.word_ids đúng; không cộng SRS từ chat. Empty/missing examples có đường xử lý rõ.
4. Một lần tự chấm đúng không tự thành mastered; dùng status BE. Double click/mất phản hồi/2tab không tăng repetitions hai lần. Hết queue không lặp mãi thẻ cũ.
5. Có Trang chủ và Học hôm nay rõ, logo về Trang chủ; mỗi chế độ tìm được từ Luyện tập. Bỏ form lưu giả/premium giả.
6. Mount/flip/toggle bản dịch/đổi tab **0 lời gọi AI**. Prepared/cached dùng được khi provider chưa cấu hình/429. Chỉ nút AI chủ động mới gọi; lỗi không chặn học.
7. Synonym click có popover/lookup; loa đọc đúng từ, không lật thẻ; chưa có nghĩa thì báo thiếu. Bàn phím dùng được.
8. Giữ hồi quy Học8 ca, functional6 ca, material/subtitles và V2. Thêm test SRS/điều hướng cho các lỗi này, không chỉ screenshot/build. Báo rõ ca nào thật, mock AI không chứng minh chất lượng model.
