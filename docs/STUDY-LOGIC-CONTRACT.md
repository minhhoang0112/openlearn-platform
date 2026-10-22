# Học và nghe chép: logic và hợp đồng cho Anti

> Bổ sung mới ưu tiên: [ANTI-BE-HANDOFF.md](ANTI-BE-HANDOFF.md). `GET /study/options?set_id=:id&mode=learn` trả cấu hình mặc định/đã lưu và số từ thực. Mặc định đề xuất `required_correct:2`, `max_attempts:3`: cần hai lần đúng liên tiếp mỗi chiều mới tăng completed_words. POST không gửi required_correct vẫn giữ giá trị 1 để tương thích; Anti cần nối options hoặc gửi rõ tiêu chí mới. Trả word_mastery để phân biệt số lượt đúng và số từ đạt mục tiêu; đây là tiêu chí local, chưa khẳng định thuật toán web gốc.

Cập nhật 21/10/2026. Đây là chức năng ứng dụng cá nhân; không kiểm tra gói Pro/Plus. Anti có thể thay bố cục và CSS nhưng cần giữ chuyển trạng thái, dữ liệu server và các phím bên dưới.

## Các file

- `server/study.mjs`: chọn câu, chấm bài, hàng đợi ôn lại, lưu phiên, SRS, điểm và tự sửa đáp án.
- `src/components/StudyPractice.tsx`: bộ điều khiển dùng chung cho học/nghe chép.
- `src/components/StudyPreferences.tsx`: cài đặt thật, không phải checkbox trang trí.
- `src/views/StudySessionView.tsx`, `src/views/DictationView.tsx`: wrapper của bộ điều khiển chung.
- `src/utils/audio.ts`: giọng đọc/tốc độ và nhận dạng lời nói nếu trình duyệt hỗ trợ.
- `src/components/WordLearningDetails.tsx`: thành phần hiện có, dùng ở feedback cho ví dụ + nghe + bật/tắt bản dịch + từ đồng nghĩa.

## Tạo phiên và tùy chọn

`POST /api/v1/study/sessions`:

```json
{
  "set_id": 163,
  "mode": "learn",
  "settings": {
    "direction": "term_to_definition",
    "answer_mode": "meaning",
    "question_types": ["write"],
    "accept_synonyms": false,
    "auto_advance_on_correct": false,
    "starred_only": false,
    "unmastered_only": false,
    "shuffle": false,
    "adaptive": true,
    "max_attempts": 3,
    "auto_audio": false,
    "audio_rate": 0.9,
    "voice_uri": "",
    "dictation_content": "word"
  }
}
```

- `direction`: `term_to_definition` hỏi Anh trả lời Việt; `definition_to_term` hỏi Việt trả lời Anh; `both` tạo hai câu mỗi từ trong chế độ học.
- `answer_mode`: `meaning`, `synonyms`, `speech`. Đồng nghĩa dùng `synonyms` đã lưu; thiếu thì báo `NO_SYNONYMS` thay vì chấm đoán. Giọng nói buộc chiều trả lời tiếng Anh và chấm transcript nhận được; không tạo điểm phát âm giả.
- `question_types`: chọn `['write']`, `['quiz']` hoặc `['write','quiz']`. Không chấp nhận danh sách rỗng/trùng. Trong learn, BE luân phiên loại câu theo thứ tự từ/chiều học; lượt ôn sai giữ nguyên loại câu và lựa chọn đã tạo. Trắc nghiệm đồng nghĩa dùng distractor cũng là từ đồng nghĩa tiếng Anh; nếu không có đáp án nhiễu hợp lệ thì báo `NOT_ENOUGH_OPTIONS`, không trộn nghĩa tiếng Việt. Chế độ trả lời bằng giọng nói dùng write.
- `accept_synonyms`: độc lập với chế độ hỏi đồng nghĩa. Khi bật ở `answer_mode:'meaning'`, các từ đồng nghĩa tiếng Anh đã lưu được thêm vào đáp án chấp nhận. Không áp dụng nghe chép vì cần viết đúng nội dung nghe được.
- `auto_advance_on_correct`: mặc định tắt. FE tự chuyển sau 1.2 giây khi đúng; timer bị hủy khi người học chọn tự sửa, mở cài đặt, hoặc câu trả lời đổi thành sai. Câu sai không tự chuyển.
- `starred_only`, `unmastered_only`, `due_only`, `word_ids`, `limit`, `shuffle` ảnh hưởng bộ câu hỏi trên BE. Lọc không còn từ trả `409 NO_WORDS`.
- `audio_rate` nhận 0.5–1.5; `voice_uri` chọn giọng TTS được cài trên trình duyệt. Không giả tên giọng thương mại trên website gốc.
- Mặc định BE: học thích nghi bật ở `learn`; tối đa 3 lượt mỗi từ/mỗi chiều, có thể cấu hình 1–5; các cờ lọc/xáo trộn/tự đọc mặc định tắt. FE mặc định nghe chép tự đọc bật và tốc độ 0.9×.

FE đọc `GET /me`, rồi lưu `PATCH /me`:

```json
{"settings":{"study":{"learn":{"direction":"both","starred_only":true},"dictation":{"dictation_content":"example","audio_rate":0.9}}}}
```

Khi PATCH phải giữ các khóa khác trong `settings.study`. Bộ điều khiển đã đọc hồ sơ trước khi gộp. FE gửi tùy chọn đầy đủ vào POST tạo phiên; BE không tự nhập cài đặt toàn cục vào các phiên con của chế độ Kết hợp. Áp dụng cài đặt bắt đầu phiên mới; dữ liệu phiên cũ vẫn tồn tại trên BE.

## Chấm, feedback, ôn lại

`POST /study/sessions/{id}/answers` dùng `{question_id, answer, skip?}`. API chấm trên BE, giữ nguyên câu đang hiển thị cho tới khi người học chọn **Tiếp tục**. Retry cùng `question_id` trả kết quả đã lưu, không cộng điểm/SRS lần hai.

Nghĩa tiếng Việt được tách theo dấu `;` và `,`: ví dụ trả lời `thuê` trong `thuê, mướn; nhân viên` được công nhận. Feedback luôn hiện đáp án đầy đủ, cùng WordLearningDetails của chính từ đang trả lời; không nhảy sang ví dụ của từ tiếp theo.

Ở `learn`, câu sai được thêm vào cuối hàng đợi. Mỗi từ/mỗi chiều tối đa `max_attempts`. Câu thêm có ID mới; phiên lưu vào SQLite nên tải lại vẫn giữ đúng hàng đợi. Các chế độ write/quiz/exam/match giữ cách chấm trước đó. Nghe chép hiện đi một lượt; chế độ ôn lại thích nghi áp dụng cho `learn`.

Trường bổ sung trong session:

- `total`: tổng câu hiện có, gồm lượt ôn lại; có thể tăng khi trả lời sai.
- `completed`: số câu đã chấm.
- `correct`: số lượt trả lời đúng sau khi xét tự sửa.
- `total_words`: số từ khác nhau trong phiên.
- `completed_words`: số từ có câu đã trả lời gần nhất đúng trong phiên; đây là thống kê phiên, không đồng nhất với trạng thái SRS `mastered`.
- `retry_limit_reached`: ít nhất một câu sai đã đạt số lượt tối đa; cuối phiên cần thông báo còn từ nên ôn thêm, không tuyên bố tất cả đã thuộc.
- Question có `direction`, `answer_mode`, `dictation_content`, `speech_text`. Không có `expected` trước khi chấm.

## “Tôi trả lời sai”

`POST /study/sessions/{id}/answers/{question_id}/correction`, body `{}`.

Chỉ cho đổi câu đúng gần nhất thành sai. Không cho sửa câu cũ khi đã trả lời câu khác, hoặc đã ôn lại từ đó ở phiên khác; các tình huống này trả `409 CORRECTION_TOO_LATE`. Phiên cũ chưa lưu snapshot trả `409 LEGACY_ANSWER`. Không hỗ trợ sửa từng câu trong exam đã nộp hàng loạt.

BE lưu snapshot tiến độ trước lần chấm, khôi phục thông số SRS đó rồi áp một lần đánh giá sai; giữ trạng thái sao hiện tại. BE thu hồi đúng reward do câu đó tạo ra, ghi hoạt động `answer_self_correction` 0 điểm và bản ghi correction trong state phiên. Gọi lặp lại trả `replayed:true`, không thêm retry hay sửa tiến độ lần hai. Nếu học thích nghi bật, BE thêm lượt ôn lại và mở phiên vừa hoàn thành khi còn lượt. Không cho FE tự trừ điểm hoặc tự cộng câu hỏi.

## Nghe chép từ và câu

`mode:"dictation"`, `settings.dictation_content:"word"|"example"`.

- `word` phát đúng term, chấm term.
- `example` phát câu ví dụ đã lưu của người học/thư viện và chấm cả câu. Chấm không phân biệt hoa/thường, khoảng trắng thừa và dấu kết thúc câu; không chấp nhận chỉ gõ term thay cho cả câu.
- Nếu các từ đã chọn thiếu câu, BE trả `409 EXAMPLES_REQUIRED`, `error.details.word_ids`. Không lặng lẽ dùng term giả làm câu ví dụ.
- FE có nút **Chuẩn bị câu ví dụ bằng AI**, gọi endpoint hiện có `/ai/generate`, `{set_id,kind:"word_examples",word_ids:[...]}` từng lô tối đa 20 ID, rồi thử tạo phiên lại. Nếu hết quota/lỗi model, các ví dụ đã lưu vẫn giữ và thông báo lỗi thật.

## Phím và giọng nói

- Bấm rồi nhả **Ctrl đơn**: phát `speech_text` của câu hiện tại. Ctrl+C/V/A và các tổ hợp khác giữ hành vi trình duyệt, không tự phát thêm.
- **Enter** trong ô nhập: kiểm tra; khi feedback đang hiển thị: tiếp tục. Không chiếm Enter trên nút/select/textarea hay khi IME đang ghép chữ.
- Giữ **Tab** cho điều hướng bàn phím chuẩn; tự sửa dùng nút rõ ràng, không chiếm Tab toàn trang.
- Micro chỉ bật khi bấm nút, dùng SpeechRecognition/WebkitSpeechRecognition nếu hỗ trợ. Có thể bị trình duyệt từ chối quyền; nhập tay luôn khả dụng. Đây là nhận dạng văn bản để kiểm từ, không phải chứng nhận phát âm.
- Voice và tốc độ là TTS của trình duyệt. Âm thanh cần người học tương tác nếu trình duyệt chặn tự phát.

## Bằng chứng kiểm thử

`server/tests/study-behavior.test.mjs`: 6 test bao gồm lọc/hai chiều/đồng nghĩa, chấp nhận một nghĩa, tự sửa có audit/thu hồi điểm/giữ sao/idempotency, giới hạn ôn lại và resume, nghe câu thật và từ chối thiếu câu, ngăn sửa câu cũ/xuyên tài khoản, loại câu hỏi và ôn lại giữ loại, distractor đồng nghĩa, cờ chấp nhận đồng nghĩa độc lập, lưu tự tiếp, reset yêu cầu xác nhận.

`scripts/study-browser-qa.mjs`: Chrome headless + BE SQLite tạm riêng; 8 luồng qua UI đã thành công, không lỗi JavaScript. Bao gồm trắc nghiệm thật, Enter chấm lựa chọn, tự tiếp sau câu đúng, hủy/chấp nhận reset và tự sửa hủy timer. Kết quả `docs/study-browser-qa.json`. Việc gọi TTS được quan sát bằng spy trình duyệt, không khẳng định đã thử micro thật hoặc nghe âm thanh vật lý.

Ảnh local để Anti đối chiếu với ảnh web gốc trong bộ tài liệu root:

- `docs/anti-reference/local-study-question.png`
- `docs/anti-reference/local-study-feedback.png`
- `docs/anti-reference/local-study-dictation.png`
- `docs/anti-reference/local-study-settings.png`

## Đặt lại tiến độ

Nút cài đặt **Đặt lại tiến độ bộ từ** dùng `POST /sets/{id}/progress/reset` với `{confirm:true}` sau hộp xác nhận rõ ràng. Hủy hộp thoại không gửi reset. Endpoint xóa word_progress của tài khoản trong bộ đó, gồm trạng thái nhớ, lịch ôn và sao; giữ phiên học cũ trong lịch sử. FE xóa session ID đang dùng, tải lại danh sách từ và bắt đầu phiên mới theo tùy chọn hiện tại. Nếu đang lọc chỉ từ có sao, người học cần tắt lọc sau reset vì sao đã được xóa.
