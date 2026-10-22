# Hội thoại và Speaking — logic để Anti giữ khi sửa giao diện

Mã logic: `src/views/ConversationView.tsx`, `src/views/SpeakingView.tsx`; backend `server/ai.mjs`. Giao diện có thể thay theo ảnh tham chiếu, giữ các luồng gọi bên dưới. Tất cả endpoint nằm dưới `/api/v1`, cookie phiên và header mutation `X-Requested-With: OpenQuiz`.

## Hội thoại

1. `POST /conversations` `{set_id,settings:{language:'en',exam:'none'|'toeic',topic:'',no_vocab_hints:false,starred_only:false,unmastered_only:false,ordered:false}}` tạo thread riêng. Backend lọc từ theo sao/tiến độ thật của người dùng, từ chối nếu không có từ phù hợp; chốt danh sách `settings.word_ids`. Topic rỗng dùng tên bộ từ. Không có khóa Pro.
2. `POST /conversations/:id/start {}` tạo lời mở đầu AI thật, chỉ lưu message assistant. Gọi lại không tạo trùng. Khi lỗi nhà cung cấp, giữ thread và nút thử bắt đầu lại; không chèn một câu người học giả.
3. `POST /conversations/:id/messages {message}` trả `{reply,messages,replayed:false}`. Backend chỉ gửi từ đã chọn, topic/TOEIC và 20 message gần nhất thuộc thread đó. Chỉ lưu cả hai lượt khi AI thành công. Lỗi không mất câu đang nhập; nhấn gửi để thử lại. Cùng thread không xử lý song song hai tin.
4. `POST /conversations/:id/hint {}` trả `{hint,example}` theo ngữ cảnh thật, không chèn vào lịch sử. Người dùng chọn dùng ví dụ để chỉnh sửa, sau đó tự gửi.
5. `POST /conversations/:id/messages/:message_id/translation {}` dịch đúng tin nhắn, trả `{conversation_id,message_id,translation}`; cache riêng người dùng và thread. Nút bấm lần nữa chỉ ẩn bản dịch ở FE, không gọi AI lại.
6. `GET /conversations` danh sách lịch sử của chính người dùng; FE lọc `set_id`. `GET /conversations/:id` trả `{...,settings,messages}` để tiếp tục. `DELETE /conversations/:id {}` xóa thread và message. ID của tài khoản khác trả 404.

`no_vocab_hints` truyền vào model để không tự liệt kê gợi ý từ; nút “Bí ý tưởng?” vẫn là yêu cầu chủ động của người dùng. `ordered` giữ thứ tự từ đầu vào cho model; nội dung AI vẫn là sinh tự do, không tuyên bố đảm bảo mô hình dùng mỗi từ đúng một lần. `unmastered_only` lọc lúc tạo thread, sau đó giữ snapshot để resume nhất quán.

FE đã có nghe từng tin, dịch/ẩn dịch, nhập giọng nói bằng SpeechRecognition khi trình duyệt hỗ trợ, fallback nhập văn bản. Chạm riêng Ctrl nghe tin assistant mới nhất; Ctrl+C/Ctrl+L giữ nguyên. Âm thanh đọc dùng speechSynthesis trình duyệt, không phải voice thương mại gốc.

## Speaking

`POST /ai/generate` body `{set_id,kind,word_ids:[id],instruction,question,transcript}`. `word_ids` được server kiểm tra thuộc bộ từ, đảm bảo model chỉ nhận từ mục tiêu thay vì cả bộ.

- `speaking_question` → `result.question`: tạo/đổi câu hỏi thật theo từ.
- `speaking_hint` → `result.hint`, `result.example`: gợi ý cách trả lời và ví dụ.
- `speaking_feedback` → `result.feedback`: nhận xét ngữ pháp, cách dùng từ và nội dung câu trả lời. Đây là nhận xét transcript, không phải điểm phát âm.
- `translation` với instruction chứa chính câu hỏi → `result.translation` để dịch/ẩn bản dịch.
- Nút Xem định nghĩa ẩn/hiện nghĩa của từ; Ctrl nghe câu hỏi hoặc từ khi chưa có câu hỏi. Người học có thể nhập hoặc dùng nhận dạng giọng nói. Lỗi AI giữ câu trả lời.
- `GET /ai/history` chỉ hiển thị các loại `speaking_*` thuộc bộ từ hiện tại; `GET /ai/history/:id` tải nội dung riêng người dùng. Kết quả lưu `_target_word_ids`, `_instruction`, `_speaking_question`; feedback lưu thêm `_submission_transcript` để FE có thể khôi phục bối cảnh.
- Phần `PronunciationPractice` gửi audio thật bằng tác vụ `pronunciation`; tách rõ với đánh giá transcript. Không dựng điểm âm vị giả.

`aiService` xuất `generate(task,input,user)` và `ensureLearningDetails(wordId,user)` cho các service bài tập dùng chung. API lịch sử loại trừ content đang thuộc `exercise_attempts`, tránh lộ đáp án ngữ pháp/đọc hiểu trước khi chấm.

Kiểm tra: `server/tests/conversation-behavior.test.mjs` mock gateway kiểm tra opening không fake user, filter thật, idempotency, quyền riêng tư, lỗi không lưu nửa hội thoại, dịch cache và hint không chèn lịch sử. Các test personal/features/learning-details và TypeScript cũng đã chạy qua.
