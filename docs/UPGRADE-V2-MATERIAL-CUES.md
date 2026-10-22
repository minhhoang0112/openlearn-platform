# MATERIAL-02: chia câu và nghe chép từ audio cá nhân

**Contract1.14.0 / schema14 / 146 route.** Codex làm server/tests, Anti làm src/ và browser tests. Không cần AI, không sửa provider/key. Đọc BE-NEXT.md trước.

## Luồng học

Trong `/materials/:id` thêm “Luyện từng câu”: người học chọn mốc A–B trên audio thật, nhập câu tiếng Anh và bản dịch tùy chọn, lưu nhiều câu. Chọn câu để nghe lặp → ẩn lời và gõ → kiểm tra → xem từ thiếu/sai → tiếp tục. Lịch sử lưu câu gốc và đáp án.

Mốc **do người dùng tự đặt**; chưa tự căn transcript vào audio. Không chia đều thời lượng rồi giả là mốc đúng. Không tải PDF/URL/sách từ bên ngoài; file tự nhập giữ giới hạn8MiB/1giờ MATERIAL-01. Transcript toàn bài và câu có mốc là hai phần độc lập; sửa transcript không tự sửa các câu đã tạo.

## API

Tiền tố `/api/v1`, cookie phiên, mutation cần `X-Requested-With: OpenQuiz`. Envelope `{data,request_id}`. Chỉ chủ học liệu được đọc/ghi, tài khoản khác404, chưa đăng nhập401.

### GET /learning/materials/:id/cues

Data `{material_id,duration_ms,revision:0,cues:[],updated_at:null,limits}`. Limits: `max_cues:200`, `max_cue_text_characters:2000`, `max_total_text_characters:80000`, `max_comparison_tokens:500`, `min_cue_duration_ms:200`, `alignment:'manual'`, `ai_required:false`.

### PUT /learning/materials/:id/cues

Thay **toàn bộ** danh sách, trả cùng kiểu GET với revision+1:

```json
{"revision":0,"cues":[{"id":"b8d474a2-dab4-4c39-a696-534d96b93b45","start_ms":500,"end_ms":2200,"text":"The server is online.","translation":"Máy chủ đang trực tuyến."}]}
```

Mỗi dòng giữ UUID ổn định từ `crypto.randomUUID()`, sửa câu giữ id, thêm mới tạo id. Không dùng index mảng. Tối đa200 câu, text bắt buộc có từ và tối đa500 từ sau chuẩn hóa, translation mặc định rỗng, mỗi trường≤2000ký tự, tổng cả hai≤80000. Mốc nguyên trong `[0,duration_ms]`, câu≥200ms, đúng thứ tự và không chồng nhau, có thể có khoảng trống. Sai một dòng400 và không lưu gì. Không tự sắp xếp trên BE. `cues:[]` xóa danh sách, giữ lịch sử.

Revision độc lập với metadata/playback. Revision cũ409 `REVISION_CONFLICT`, `error.details.revision` là hiện tại. FE giữ draft, cho tải lại/đối chiếu; không âm thầm ghi đè tab khác.

### POST /learning/materials/:id/dictation-attempts

```json
{"submission_id":"ce078445-237e-4caf-9c74-3034f45fdc17","cues_revision":1,"cue_id":"b8d474a2-dab4-4c39-a696-534d96b93b45","answer":"the server is online","revealed":false,"give_up":false}
```

Answer≤2000ký tự và≤500 từ sau chuẩn hóa, không rỗng trừ `give_up:true`. Hai cờ boolean mặc định false. `revealed` là FE tự báo người học đã mở lời/đáp án trước khi gửi; đã xem thì không đổi false khi đóng lời. Không phải cơ chế chống gian lận.

Data trả201 lần đầu/200 replay:

```json
{"material_id":"...","submission_id":"...","cues_revision":1,"cue":{"id":"...","start_ms":500,"end_ms":2200,"text":"The server is online.","translation":"Máy chủ đang trực tuyến."},"answer":"the server is online","correct":true,"assisted":false,"gave_up":false,"independent_correct":true,"assessment":"exact_text_comparison","comparison":"case_punctuation_insensitive_words; apostrophes_preserved","expected_tokens":[{"token":"the","matched":true},{"token":"server","matched":true},{"token":"is","matched":true},{"token":"online","matched":true}],"answer_tokens":[{"token":"the","matched":true},{"token":"server","matched":true},{"token":"is","matched":true},{"token":"online","matched":true}],"created_at":"...","replayed":false}
```

BE chuẩn hóa NFKC, hoa/thường, dấu câu/khoảng trắng và dấu nháy cong, so đúng thứ tự toàn bộ từ. `I'm` và `I’m` tương đương; `Im`, `I am`, đảo từ hoặc seven/7 không tự coi tương đương. Highlight dùng LCS, không phải điểm ngữ nghĩa/phát âm. `give_up:true` luôn correct=false. Đúng sau xem lời là assisted=true/independent_correct=false. Không tự chấm ở FE.

Mất phản hồi giữ nguyên UUID/body thử lại; sửa đáp án/lượt mới tạo UUID mới. Cùng UUID khác body409 `IDEMPOTENCY_CONFLICT`; retry đúng trả bản chấm gốc kể cả câu đã sửa/xóa. Lượt mới revision cũ409; cue không còn404 `CUE_NOT_FOUND`. Chặn double click.

### GET /learning/materials/:id/dictation-attempts?limit=20&offset=0

Data `{items:[result...],total,limit,offset,summary:{attempts,independent_correct,assisted,gave_up},assessment:'exact_text_comparison',mastery_assessed:false}`. Mới nhất trước. Summary đếm toàn bộ **lượt làm**, không phải câu duy nhất hay kỹ năng thành thạo. Snapshot giữ câu gốc sau khi sửa/xóa cues. Xóa học liệu xóa cả audio/cues/playback/lịch sử. Chưa cộng điểm vào Tiến độ, Today, SRS hoặc bài học chính thức.

## FE-MATERIAL-02 cần làm

1. Thêm types/methods cho4 API trong client.ts. Editor danh sách mốc/text/bản dịch, thêm/sửa/xóa và lưu toàn bộ, revision riêng. Hiển thị draft/chưa lưu/lỗi/xung đột. Không tự phát audio lúc sửa text.
2. Chọn câu áp mốc thật lên player. Nghe chép ẩn text/translation mặc định; gõ, kiểm tra, phản hồi, tiếp tục; Tôi không biết, xem lời/bản dịch, tốc độ/lặp. Phân biệt đúng tự làm/đúng có trợ giúp.
3. **Ctrl đơn** nghe lại câu hiện tại, không chặn Ctrl+C/V/A/Z hoặc tổ hợp khác. Enter kiểm tra khi có đáp án, sau feedback Enter tiếp tục. Không bắt phím khi modal/editor mở. Listener chỉ thuộc màn luyện này, cleanup khi thoát, không sửa phím mục Học cũ bằng listener toàn app.
4. Lịch sử cập nhật sau gửi/replay, UUID giữ tới khi biết kết quả. Khi route đổi chặn response cũ cập nhật màn mới. Không tự gọi AI lúc mở trang.

## Sửa player MATERIAL-01 trước khi nối bài luyện

Các ca sau phát hiện qua đọc source, ngoài13 ca browser hiện tại:

- `MaterialDetailView.savePlaybackState` gửi song song cùng revision khi đổi nhanh speed/toggle/pause;409 chỉ tải revision rồi bỏ thay đổi cuối. Cần hàng đợi một request đang bay và patch mới nhất, hiển thị trạng thái lưu/lỗi.409 từ tab khác phải đối chiếu, không âm thầm ghi đè.
- `handleSetPointA` gửi A có giá trị nhưng B=null, BE trả400 `INVALID_LOOP`. Giữ A tạm ở FE, chỉ lưu cặp hoàn chỉnh khi đặt B; clear thì xóa cả hai. Đổi speed/toggle lúc A tạm cũng không được gửi cặp chưa hợp lệ.
- Cleanup chỉ hủy debounce, khi audio chạy tự nhiên không lưu định kỳ; rời trang trước pause dễ mất vị trí. Throttle lưu vị trí, lưu khi pause/thoát trong app, dùng trạng thái hiện tại tránh closure cũ. Không hứa save khi trình duyệt đóng cưỡng bức. Test bằng đoạn≥10giây.
- Hub đang ghi “Đã nghe X%” từ vị trí tua. Đổi **“Vị trí đã lưu X%”**, seek không chứng minh đã học.

## Nghiệm thu

Giữ13 ca MATERIAL-01; thêm tốc độ/toggle nhanh với request chậm, A chưa có B không400, rời/trở lại giữ vị trí,409 không mất draft. Tạo2câu/reload/kiểm mốc thật; chặn chồng lấn và ngoài thời lượng. Ctrl đơn nghe được, Ctrl+C/V vẫn dùng được, route cleanup. Kiểm sai highlight/đúng/dùng gợi ý/bỏ qua/retry mất phản hồi/double click. Sửa/xóa cues giữ câu gốc trong lịch sử, xóa học liệu dọn lịch sử. Không gọi Gemini hoặc bịa điểm thành thạo.

BE: server/tests/material-cues.test.mjs,5 nhóm kiểm thử mới; toàn bộ90 test BE đạt. Frontend MATERIAL-02 chưa triển khai trong lượt Codex này. Anti sửa src/tests FE, chỉ cập nhật dòng FE ở STATUS từ bản trên đĩa; không sửa server/.env/DB, BE-NEXT/BE-WORKLOG.
