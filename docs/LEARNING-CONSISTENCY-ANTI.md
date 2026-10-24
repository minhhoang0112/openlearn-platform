# CLARITY-02 — Học kết hợp, thẻ từ, dịch và điều hướng đồng nhất

24/10/2026. **Contract1.17.0 / schema14 /151 route.** Tiếp sau CLARITY-01. Codex làm BE, Anti làm FE. Không sửa server/.env/DB. Người dùng chưa chấp nhận trạng thái hiện tại; không báo “hoàn chỉnh” từ build hoặc vài test happy path.

## A. Những lỗi người dùng chỉ ra và nguyên nhân cụ thể

- Học kết hợp có BE `server/lessons.mjs`, nhưng ComprehensiveLessonView/SessionRunner là màn riêng sơ sài. Bước Speaking gửi feedback toàn bộ set, hội thoại tạo không chọn word_ids. Không có cùng UI/keyboard/chi tiết từ như phòng học chính. Nhận feedback rồi complete lập tức làm biến mất bước nên không kịp đọc phản hồi. Có thể tưởng đây chỉ là giao diện không có logic.
- WordLearningDetails.parseSynonymItems chỉ split(';'), nên `submit, register` thành một nút và lookup cả chuỗi. Click chưa tự đọc. Popup nằm trong flow làm câu ví dụ nhảy vị trí. Cache synonym hiện chưa có userId, có thể giữ thông tin cá nhân của tài khoản trước.
- WordExample bọc WordLearningDetails vốn đã có editor nhưng lại thêm nút tạo/sửa riêng: trùng điều khiển, nhãn và alignment giữa list/flashcard/feedback lộn xộn.
- LearningPathView dùng idx===0 để ghi Đang học/Học ngay và fallback `word_count || 12`: hoàn toàn không phải tiến độ thật. Mọi bộ phải có cùng hành động và dữ liệu.
- Các view hardcode Về bộ từ hoặc history.back; không giữ nguồn vào. Sidebar chỉ so route menu chính nên ở bài con không thấy vị trí. Ngữ pháp chọn cả dịch câu nhưng thiếu bản dịch thì hiện lỗi toàn màn dù vẫn có thể luyện sắp xếp câu.

## B. Học kết hợp phải dùng chung một phòng học

Không đổi thành một hệ thống thứ ba. Tái sử dụng/phân tách phần runner của StudyPractice cho `initialSession + words + onComplete`, giữ đầy đủ feedback/nghĩa/ví dụ/dịch/âm thanh/Ctrl/Enter như Học thường. SessionRunner cũ phải được thay hoặc nâng lên cùng component, không giữ một màn input trống cạnh màn Học đầy đủ.

BE hiện có:

1. GET `/sets/:id/lessons`: `total_words`, mỗi lesson có `word_count,reviewed_words,mastered_words,completed_steps,total_steps:5,state,completed`. Lesson cuối có thể chỉ1–4từ. Hiển thị rõ **5 bước**, **đã luyện X/Y từ**, **đã nhớ Z/Y**; không viết0/5 gây nhầm số từ với số bước. `state` dựa tiến độ, không vị trí bài.
2. GET `/sets/:id/lessons/:lesson_index`: words và `word_count,reviewed_words,mastered_words,missing_example_ids,missing_translation_ids,completed_steps`. Mỗi step có `requires_ai,ai_configured,srs_effect,completed_at`. SRS effect của1–3 là study_answers,4–5 none. `available:true` nghĩa không bị thuê bao khóa; cần AI vẫn kiểm cấu hình tại start.
3. POST `/sets/:id/lessons/:lesson/steps/:step/start`:1–3 trả StudySession. Mặc định tìm lại phiên gần nhất khớp đúng set/mode/word IDs, kể cả phiên hoàn thành để có thể lưu bước còn thiếu. `{resume:false}` bắt đầu luyện lại có chủ đích. Không auto tạo mới khi chuyển tab/route/reload. Nếu returned session completed, cho xem kết quả/lưu bước hoặc Luyện lại, không hiện trống.
4. Bước3 là **nghe chép từ/cụm từ**, không giả là đục lỗ câu. Trước đây name/reference_variant khiến hiểu nhầm; BE đã đổi nhãn đúng. Nếu thêm lựa chọn nghe câu trong FE, chỉ dùng mode dictation với dictation_content:'example' khi có câu thật; không dựng timing/gap giả.
5. Bước4–5 start trả action + word_ids/terms, không tự tốn lượt AI. Speaking gọi `/ai/generate` với `word_ids:lesson.words.map(id)` và transcript, dùng question/feedback UI hiện có. Hội thoại tạo `/conversations` với `settings.word_ids`, gọi start, lưu thread để tiếp tục, không chỉ textarea và một reply. Giữ đúng5từ của bài, không lấy toàn bộ set.
6. Complete route cũ vẫn cần bằng chứng server; không đánh dấu client.1–3 session phải thật sự completed, đúng mode và đúng IDs.4 feedback_ids của user/set và lời nói dùng nguyên vẹn các từ/cụm;5 conversation_id + lời người học chứa từ mục tiêu. BE đã chặn lỗi brandish bị tính là brand. Không suy ra “thành thạo” từ hoàn thành5bước.
7. Sau AI feedback **giữ phản hồi để đọc**, có Tiếp tục/Lưu bước riêng. Không gọi complete làm mất panel ngay. Lưu lỗi thì giữ transcript/thread/session/feedback_ids để thử lại, không gọi lại model. Khi chưa dùng hết từ, đánh dấu từ nào còn thiếu từ kết quả/đối chiếu, không xóa bài nộp.

## C. Tiến độ mọi bộ thẻ thống nhất từ BE

GET sets, set detail, path.sets dùng cùng `SetCard.progress`:

```json
{"total_words":12,"reviewed_words":3,"learning_words":3,"mastered_words":0,"due_words":2,"state":"in_progress","last_session":{"id":"...","mode":"learn","completed_at":null,"updated_at":"..."}}
```

state: empty/not_started/in_progress/mastered. reviewed_words = có lượt ôn thật (last_reviewed_at), không phải mở thẻ. learning/mastered là trạng thái hiện tại, due độc lập; mastered vẫn có hạn ôn. last_session có thể null. Chỉ nhìn một phiên vừa xong không đủ kết luận cả bộ đã thuộc.

Tất cả card cùng2 hành động: primary Học bộ/Tiếp tục/Ôn lại theo state; secondary Xem bộ. Không primary chỉ riêng bài1. Luôn có “X/Y từ đã luyện · Z đã nhớ”, trạng thái cần ôn nếudue>0. Xóa `idx===0` và số12fallback. Dữ liệu chưa tải thì skeleton, bộ0từ thì0 và CTA tạo từ hoặc disabled có lý do. Refresh card sau hoạt động bằng event/data invalidation, không tự cộng số phía FE.

## D. Từ đồng nghĩa: từng mục, click đọc ngay và mở chi tiết

`parseSynonymItems` split cả dấu phẩy, chấm phẩy và xuống dòng; trim/dedupe, giữ các cụm như job seeker nguyên vẹn. `submit, register` phải ra **hai nút**. Click/focus activation của một mục gọi playAudio(mục đó) ngay trong user gesture và mở popup; nút loa trong popup để nghe lại. Không đọc cả danh sách. Enter/Space tương đương click. Stop propagation để không lật thẻ/chuyển câu; Escape/ngoài popup đóng.

**API mới** GET `/api/v1/dictionary/entry?q=submit` (cookie) trả:

```json
{"term":"submit","found":true,"entries":[{"definition":"nộp; gửi (đơn, tài liệu)","part_of_speech":"verb","phonetic":"","example":"Please submit your application today.","example_translation":"Vui lòng nộp đơn của bạn hôm nay.","source":"prepared_dictionary","word_id":null,"set_id":null}],"speech_text":"submit","ai_required":false,"scope":"accessible_library_and_prepared_dictionary"}
```

Trả nhiều nghĩa độc lập từ thư viện truy cập được và20 mục từ điển biên soạn sẵn (submit/register/experience/qualification/applicant/job seeker/specialist/authority...). Không AI. Không có thì foundfalse/entries[], cho mở Tra từ từ đúng một mục, không gán nghĩa từ gốc. Không cam kết mọi synonym đều đã có dữ liệu. Popup có term, loại từ, IPA nếu có, nghĩa Việt, ví dụ EN/VI; không tự tạo IPA. Cache theo **userId+term+language**, xóa cache khi đổi user; chống response cũ ghi vào popup mới bằng request token. Không render HTML.

Popup anchored/portal, không chèn block vào giữa nghĩa và ví dụ làm giật bố cục. Có max-width/viewport clamp, đóng bằng bàn phím, không bị overflow của card cắt mất.

## E. Ví dụ gọn, bản dịch thật và vai trò AI rõ

- Chỉ một component quản lý ví dụ/editor. WordExample không bọc một component đã có editor rồi thêm editor/nút AI khác. Thiết kế variant list/flashcard/feedback; list căn trái, flashcard căn giữa, mobile stack. Ví dụ EN + loa + nút Bản dịch nằm cùng cụm; VI ở dòng dưới. Tùy chọn sửa/AI nằm menu3chấm hoặc khu mở rộng, không lặp3nút và badge dài ở mỗi hàng.
- Nhãn chính **“Ví dụ đã lưu”** hoặc bỏ badge khi không cần. Nguồn library/prepared/manual/ai xem trong info nhỏ. “AI đã lưu” là nguồn nội dung, **không nghĩa là đang gọi AI**. Đừng nhồi “Không gọi AI” trên tất cả card. Nhóm “Học với nội dung có sẵn” và “Luyện với gia sư AI” đủ giải thích quyết định chi phí.
- Có41 mục ví dụ song ngữ prepared (thêm nhóm tuyển dụng/kinh doanh của các ảnh). Chỉ bổ sung khi từ/nhóm nghĩa khớp và chưa có câu. Với note AI có **chính xác** câu nằm trong ngân hàng nhưng thiếu dịch, BE trả bản dịch có sẵn `translation_source:'prepared'`, không đổi câu/nguồn gốc hoặc ghi đè note. Đây không phải toàn bộ kho từ.
- Mount/flip/toggle dịch/đổi tab không gọi AI. Nếu chưa có dịch thì ghi rõ “Chưa có bản dịch lưu sẵn” và hai lựa chọn tự nhập/nhờ AI chủ động. Không nút dịch giả bấm chỉ hiện panel rối. Hết quota vẫn đọc được tất cả phần đã lưu. Đọc chi tiết bằng learning-details allow_ai:false; user bấm bổ sung mới allow_ai:true.

### Bản dịch bài đọc — BE mới

POST `/exercise-attempts/:id/translation` với `{allow_ai:false}` mặc địnhfalse:

- Có cache: `{attempt_id,translation,cached:true,ai_requested:false}`.
- Chưa có: `{attempt_id,translation:null,cached:false,ai_requested:false,status:'missing'}`.
- User bấm “Nhờ AI dịch bài”: allow_ai:true, tạo1lần rồi lưu, trả cachedfalse/ai_requestedtrue. Concurrent request cùng phiên dùng chung một lượt. Dịch đoạn nguyên gốc, không prompt chứa chỗ trống chưa điền. Không sửa điểm/bài nộp/nháp và không khôi phục dữ liệu nếu phiên đã xóa. Lỗi429 giữ màn học.

FE thêm nút Bản dịch bài đọc: cache có thì toggle; chưa có thì giải thích cần tạo1lần và user xác nhận. Có thể đọc/ẩn theo đoạn; không tự gọi ở useEffect. Hội thoại dùng API dịch tin nhắn vốn có (cache). Speaking có nút dịch câu hỏi theo chủ ý, không giả mọi dữ liệu đều đã có sẵn. Với nguồn nội dung có sẵn trong bài V2, dùng bản dịch authored, không đi dịch lại.

Ngữ pháp mặc định **order** khi vào mới; chỉ cho chọn translate khi toàn scope có bản dịch. Thiếu dịch không chặn order/fill đang có câu EN. Nếu user chủ động chọn translate mà thiếu: chỉ rõ số câu thiếu, cho đổi về Sắp xếp câu, bổ sung thủ công hoặc chủ động dùng AI. Nút phải ghi “Bổ sung bản dịch”, không “Tạo ví dụ” khi câu EN đã có. Không một alert đầu trang với phần còn lại trắng và không có hành động học được.

## F. Điều hướng rõ cả bên trái và nội dung bên phải

Làm helper `LearningNavigationContext`/hàm tương đương dùng chung, không từng view tự đoán. Khi mở bài từ Trang chủ/Lộ trình/Thư viện/Luyện tập/Ôn đến hạn, truyền source section, parent route, set/path title qua query/state; xuyên suốt chế độ con và Cài đặt AI. Chỉ nhận route nội bộ bắt đầu một dấu /, từ chối // và URL ngoài.

- Ví dụ từ Luyện tập → chọn bộ → Ngữ pháp: sidebar Luyện tập active, breadcrumb “Luyện tập > [Bộ từ] > Ngữ pháp”, quay về Luyện tập đúng nhóm/bộ đã chọn.
- Từ Lộ trình từ vựng → bộ → Học kết hợp: giữ nguồn và pathId; breadcrumb có tên lộ trình/bộ/bài/bước, back về parent xác định. Không history.back có thể về AI settings hoặc tab ngoài.
- Deeplink không context: study-set/comprehensive mặc định Thư viện của tôi; practice tools mặc định Luyện tập; lesson-run mặc định Lộ trình của tôi. Hiện heading chế độ + tên bộ, không phải sidebar không mục nào active.
- Nút “Về bộ từ” luôn về bộ; “Về luyện tập” luôn về practice. Nếu chỉ một nút back thì nhãn theo mục tiêu thật. Browser Back vẫn hoạt động bình thường; không ghi history lần render. Khi quay về vẫn giữ session/draft, không tạo bài mới/gọi AI lại.

## G. Nghiệm thu bắt buộc

1. Hai bộ, chỉ bộ2 đã học: card1 Chưa học, card2 Đang học; cả hai có CTA đồng nhất và số từ BE. Bộ cuối lộ trình không tự có12từ nếu thật ít hơn.
2. Học kết hợp6từ → hai bài5+1, mỗi bài5bước. Làm dở/reload/đổi route tiếp tục đúng session, câu và tiến độ; luyện lại mới tạo session. Runner có đủ nghĩa/ví dụ/dịch/feedback/phím tắt như học thường.
3. Speaking và chat chỉ mang từ của bài; feedback hiển thị tới khi user tiếp tục. Chưa cóAI không chặn3bước có sẵn. Không complete vì brandish chứa brand hoặc chỉ client tự đánh dấu.
4. Synonyms `submit, register; job seeker`:3nút, click1nút đọc1mục và mở nghĩa đúng; popup không dịch chuyển ví dụ, không lật thẻ, không lộ note của user khác.
5. Mọi view con có active sidebar+breadcrumb+back đúng nguồn; test từ practice, path và deeplink, qua settingsAI rồi trở lại không bị vòng lặp.
6. Dịch đã lưu0model call; bản dịch đọc tạo1lần, reload xem lại0call;429 không trắng trang/mất đáp án. Ngữ pháp thiếu dịch vẫn học order được.
7. Build và hồi quy thực chất; thêm browser test qua các bước này, không chỉ kiểm text/button hiện hữu. Chạy DB tạm/mock AI, không gọi model thật trong test.

Anti chỉ sửa src/test FE; cập nhật dòng FE ở STATUS từ bản mới trên đĩa, không Overwrite buffer cũ. BE-WORKLOG/BE-NEXT do Codex quản lý. Bản này thay thế yêu cầu P1 còn chưa đủ cụ thể của CLARITY-01.
