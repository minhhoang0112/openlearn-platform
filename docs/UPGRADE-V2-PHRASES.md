# PHRASE-01 — đưa cụm từ đã học sang bộ thẻ và SRS

21/10/2026. Contract **1.12.0**, schema **12**, **134 route**. BE đã chạy, **FE-PHRASE-01 chờ Anti nối giao diện**. Không thêm bộ máy ôn mới; dùng bộ thẻ và SRS hiện có.

Người học chủ động chọn cụm ở bước vocabulary_in_context. BE lấy nguyên text/translation từ phiên bản bài đang học, lưu vào bộ riêng, tạo lịch ôn cho thẻ mới. Không gọi AI và không coi việc lưu là đã thuộc. Bộ học gồm27 mục/158clip giữ nguyên.

## API đã triển khai

Prefix /api/v1, cookie auth; POST có X-Requested-With: OpenQuiz. Envelope data/error như các API khác.

| Method | Route | Kết quả trong data |
| --- | --- | --- |
| GET | `/learning/phrase-library` | set_id, title khi có, route, review_route, word_count, source_links, due_count |
| GET | `/learning/sessions/:id/steps/:step_id/phrases` | lesson_id, content_version, step_id, items, library |
| POST | `/learning/sessions/:id/steps/:step_id/phrases` | added_count, linked_count, already_saved_count, reused_count, items, library |

Ví dụ step_id hiện tại là phrases nên URL có dạng `/learning/sessions/UUID/steps/phrases/phrases`. Không dùng chuỗi id hardcode cho mọi phiên; đọc step metadata.

POST chỉ gửi:

```json
{"phrase_indexes":[0,2]}
```

Các chỉ số bắt đầu0, ít nhất1, không trùng, tối đa20 và phải tồn tại trong step. Không gửi term/definition/set_id/status. Toàn bộ lựa chọn được kiểm trước khi ghi; lỗi không tạo nửa bộ thẻ.

Mỗi item của GET/POST: `{phrase_index,text,translation,saved,word_id,set_id,route}`. Text/translation là nguồn bài, không phải bản đã sửa tay của thẻ. `saved=true` và word_id chỉ liên kết thẻ riêng đã lưu; muốn đọc nội dung đang chỉnh sửa dùng API bộ thẻ hiện có.

Library khi chưa lưu có set_id/route null, các count0; đọc GET không tự tạo bộ. Lần POST đầu tạo bộ **Cụm từ từ bài học của tôi**, tiếng Anh–Việt, private, source=learning_v2. route `/study-set/:id` để vào bộ; review_route `/repetition-study` là trang SRS chung của tài khoản, không khẳng định lọc riêng bộ này. word_count gồm mọi thẻ trong bộ, source_links là số nguồn cụm đã liên kết nên có thể lớn hơn số thẻ do tái sử dụng; due_count chỉ tính thẻ trong bộ đến hạn theo BE.

## Tính đúng đắn

- Chỉ phiên của chính người học, step vocabulary_in_context và đã tới bước đó/đã qua. Tương lai trả409 STEP_NOT_REACHED, loại bước sai400 UNSUPPORTED_PHRASE_STEP, tài khoản khác404.
- Cùng user/lesson/version/step/index là một liên kết, nên nộp lại hoặc hai lần đồng thời không tạo thẻ trùng. Không cần UUID cho thao tác lưu này. POST không submit/advance hoặc sửa revision của bài V2.
- Trong cùng bộ, term và definition **trùng chính xác** được tái sử dụng giữa các bài. Không gộp cụm khác nghĩa hoặc tự suy đoán đồng nghĩa. added_count đếm thẻ mới, linked_count đếm liên kết mới; already_saved_count đếm lựa chọn đã có liên kết; reused_count đếm liên kết mới dùng thẻ có sẵn.
- Không ghi đè chỉnh sửa tay, ví dụ/ghi chú hay word_progress của thẻ đã có. Thẻ mới có status=new, repetitions0, due_at=thời điểm lưu, last_reviewed_at null. Ôn thực sự qua các chế độ cũ mới cập nhật lịch/độ nhớ.
- Example tiếng Anh chỉ được chép nếu tìm thấy nguyên cụm trong một câu thật của transcript. Nếu không tìm thấy thì rỗng. Không tự tạo bản dịch câu ví dụ, IPA hoặc synonyms bằng phép đoán; chúng có thể trống. Nghĩa của cụm vẫn đầy đủ từ bài. Chức năng bổ sung ví dụ AI cũ, nếu dùng, là thao tác khác có quota riêng.
- Phiên cũ vẫn lấy content_version cũ; xóa phiên không xóa thẻ đã chọn lưu. Xóa bộ/thẻ bằng API hiện có xóa liên kết liên quan theo cascade; lần lưu chủ động sau đó có thể tạo lại. Các giới hạn bảo toàn lịch sử học của API xóa cũ vẫn áp dụng.
- Nếu người học đổi bộ nguồn sang public, GET library/POST trả409 PHRASE_COLLECTION_CHANGED, không âm thầm tiếp tục nhập vào bộ công khai. Khôi phục private qua giao diện bộ thẻ rồi thử lại. Liên kết có quyền truy cập thay đổi trả409 PHRASE_LINK_CHANGED.
- Today vẫn giữ snapshot ngày. Lưu cụm không tự thêm item vào kế hoạch đã đóng băng; có thể mở review_route hoặc bộ thẻ ngay. Sidebar/badge SRS cần refresh summary hiện có sau khi lưu.

Hai bảng mới: learning_phrase_collections và learning_phrase_links; thẻ và lịch dùng study_sets/words/word_progress hiện có. Backup trước schema12: server/data/pre-learning-phrases-1792593237975.sqlite. Không đưa DB/.env vào gói bàn giao.

## Anti nhận FE-PHRASE-01

1. Ở bước cụm từ, GET preview khi bước đã tới. Mỗi cụm có chọn/lưu, hoặc chọn nhiều rồi **Lưu vào bộ ôn của tôi**. Không POST khi chỉ render, mở nghĩa hoặc bấm Tiếp tục.
2. Hiện đã lưu theo item.saved; disable lúc gửi, xử lý double click/retry bằng payload lựa chọn cũ. Sau POST lấy lại items/library từ BE. Không tự tạo word_id hoặc tăng mastered.
   Bỏ chọn trong form không xóa thẻ đã lưu; nếu muốn xóa dùng giao diện bộ thẻ/API xóa hiện có, có bảo toàn lịch sử. saved ở đây là liên kết nguồn, không phải bookmark.
3. Có nút mở bộ riêng và trang ôn chung khi library.route có. Có thể thêm một thẻ nhỏ ở Thư viện/Luyện tập bằng GET phrase-library, không cần một menu lớn mới. Refresh SRS summary khi lưu thành công; không tự reset Today.
4. Khi lỗi giữ lựa chọn, hiển thị retry. Lỗi quyền bộ thay đổi cần hướng dẫn đặt lại riêng tư, không tự sửa visibility trên BE. Không gọi AI để tạo cụm/định nghĩa/ví dụ trống khi lưu.
5. Dùng các màn bộ thẻ/học/SRS cũ. Kiểm một thẻ mới thật sự hiện trong SRS queue, trả lời được qua server grading, và lưu lại không reset lịch đã ôn hoặc sửa tay.

FE cần kiểm: chỉ xem không tạo bộ; lưu một/nhiều cụm; reload đã lưu; bấm lặp không trùng; cùng cụm ở hai bài dùng một thẻ; sửa tay rồi lưu lại; ảnh hưởng badge SRS; riêng tư và lỗi collection public. Không cần gọi Gemini để chạy các kiểm tra này.

## FE-AUDIO-02 — phát hiện sau bàn giao audio

Codex build FE và chạy script verify-fe-audio-reviews-browser.mjs:5 kiểm tra hiển thị/xóa/Progress/evidence đạt với nhận xét mẫu trong DB tạm,0pageerror/BE500, không gọi model thật. Script này chưa kiểm đầy đủ đường upload/retry429 hoặc nhiều bản thu; không coi dòng log “100%” là mọi tình huống đã nghiệm thu.

Đọc LessonRunView phát hiện hai điểm Anti cần sửa/kiểm:

- GET audio-reviews trả newest-first, nhưng vòng `map[item.step_id]=item` ghi đè cho mọi item nên bản cũ cùng step có thể thắng. Giữ item đầu tiên của mỗi step, hoặc chọn theo thứ tự thời gian/id ổn định từ BE. Thêm test hai nhận xét khác nội dung cùng bước, reload phải hiện bản mới nhất. Xóa bản đang xem nên tải lại/hiển thị bản còn lại phù hợp.
- Restore GET và POST response chỉ guard isMountedRef, chưa guard sessionId hiện tại. Router đổi phiên mà component vẫn mounted có thể đưa review phiên cũ vào phiên mới có cùng step_id. Giữ ref/token session hiện tại và bỏ kết quả nếu session_id khác; áp dụng cả fetch restore, lỗi và pending state. Kiểm đổi phiên khi request đang về.

Giữ source/UUID đúng bản thu và không đổi model/key để chữa UI. Ghi FE-AUDIO-02 riêng vào STATUS sau sửa. Gemini thật ở lần thử trước báo429; lượt này không thử lại provider.

## Kiểm chứng BE

**81 test toàn BE đạt**, build FE thành công. Bốn test mới xác nhận lưu riêng/tính lặp, thẻ vào SRS và được chấm thật, không reset lịch đã ôn, quyền sở hữu/lỗi atomic, tái dùng giữa bài/sửa tay, xóa/tạo lại, pinned version và DB reopen. Nội dung bài/điểm V2 không đổi, không có lời gọi AI trong phần lưu cụm.
