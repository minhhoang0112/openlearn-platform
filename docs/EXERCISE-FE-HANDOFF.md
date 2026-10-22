# Ngữ pháp và đọc hiểu — hợp đồng nối FE (21/10/2026)

Phần logic nằm trong `server/exercises.mjs`. FE hoạt động tối thiểu ở `src/components/PersistentExercise.tsx`, được gọi bởi GrammarView/ReadingView. Anti có thể thay bố cục theo ảnh trong `docs/anti-reference`, giữ nguyên hành vi và hợp đồng dưới đây. Không dùng `AiExercise` cũ để tự chấm đáp án ở trình duyệt.

## API chung

Các đường dẫn bên dưới có tiền tố `/api/v1`, dùng cookie đăng nhập; mutation gửi JSON và header `X-Requested-With: OpenQuiz`. Response thành công nằm trong `data`.

POST `/exercise-attempts`:

```json
{"set_id":163,"kind":"grammar_order","resume":true,"limit":12,"question_types":["order","fill","translate"],"difficulty":"medium","original_order":false,"starred_only":false,"unmastered_only":false}
```

`kind` là `grammar_order` hoặc `reading`. Mặc định tiếp tục bài chưa xong gần nhất của cùng bộ/dạng; `resume:false` tạo bài mới theo cài đặt mới. `limit` 1–30 từ; `word_ids` tùy chọn, tối đa 30 ID trong bộ hiện tại. Bộ lọc không còn từ trả lỗi `NO_WORDS`, không giả dữ liệu để hiển thị.

Response: `id,content_id,set_id,kind,saved,index,total,completed,correct,passage,difficulty,question,draft,feedback,created_at,updated_at`. `question` chỉ là câu hiện tại, **không có đáp án**. `question.id` phải đi kèm mọi thao tác trả lời/chuyển câu để tránh nộp nhầm khi mạng chậm. `index` bắt đầu 0. `total` là tổng câu hỏi thực tế, có thể gồm cả điền bài đọc và câu hỏi hiểu bài.

- GET `/exercise-attempts?set_id=163&kind=reading`: lịch sử riêng, tối đa 100 bản ghi, gồm trạng thái đã lưu/đã hoàn thành và số đúng.
- GET `/exercise-attempts/:id`: mở lại bài, tiếp tục câu và lựa chọn dang dở.
- PUT `/exercise-attempts/:id` với `{question_id,draft}`: lưu lựa chọn chưa chấm; với `{saved:true}` lưu đánh dấu bài. Bỏ đánh dấu dùng false.
- POST `/exercise-attempts/:id/answers` với `{question_id,answer}`: chấm thật trên server. `{question_id,skip:true}` tương ứng “Tôi không biết”.
- POST `/exercise-attempts/:id/next` với `{question_id}`: chỉ chuyển khi câu hiện tại đã chấm. Nộp lại/nhấn tiếp tục lặp không tăng điểm hoặc bỏ qua câu.

Sau nộp, `feedback` có `correct,answer,expected,translation,explanation,skipped`. Chỉ lúc này mới có `expected`; FE hiển thị phản hồi và nút tiếp tục. Bài hoàn thành khi đã chuyển qua phản hồi câu cuối. Đề và các lượt học lưu SQLite; tất cả thao tác kiểm tra chủ sở hữu. `/ai/history/:id` không trả raw đề của exercise để tránh lộ đáp án.

## Ngữ pháp

`question.type`:

- `order`: `tokens:[{id,text}]` và `required_token_count`. Gửi `answer:[tokenId,...]` theo thứ tự đã sắp xếp. Token ID là UUID ngẫu nhiên, ổn định qua tải lại; từ trùng vẫn có ID riêng. Không sắp ID để suy luận đáp án. Nhấn token phía dưới để chọn, nhấn token phía trên để bỏ; mỗi token chỉ được dùng một lần. FE bật kiểm tra khi chọn đúng `required_token_count` mảnh, không yêu cầu chọn tất cả thẻ ở chế độ hard. Server kiểm tra đủ số mảnh và thứ tự câu; việc đổi vị trí hai token có cùng chữ vẫn được chấm theo câu thực tế.
- `fill`: `prompt` là câu có chỗ trống, gửi `answer:"từ/cụm từ"`. Nếu từ mục tiêu không xuất hiện nguyên dạng trong câu ví dụ, bài đó chuyển thành sắp xếp câu để tránh chỗ trống không hợp lệ.
- `translate`: `prompt` là câu tiếng Việt, gửi `answer:"English sentence"`. Hiện chấm đối chiếu câu mẫu sau chuẩn hóa chữ hoa/khoảng trắng/dấu kết câu; **chưa dùng mô hình để xác nhận mọi bản dịch đồng nghĩa**. FE phải nói rõ đây là luyện theo câu mẫu.

Các dạng được phân bố luân phiên theo `question_types`. Dùng câu ví dụ và bản dịch đã lưu theo đúng nghĩa mục tiêu; thiếu thì gọi AI, kiểm tra cấu trúc và lưu vào ghi chú cá nhân. Không tự dựng đồng nghĩa giả. Nút xem định nghĩa lấy `question.definition`. Có thể nghe đáp án sau khi chấm, dịch/ẩn bản dịch; Enter kiểm tra/tiếp tục.

**Độ khó sắp xếp:** `easy` gom từng hai từ thành một cụm để giảm số mảnh; `medium` tách từng từ; `hard` tách từng từ và thêm hai từ tiếng Anh gây nhiễu không thuộc câu. Người học chỉ chọn số mảnh trong `required_token_count`. Định nghĩa/bản dịch chỉ hiện khi người học yêu cầu. Giữ nguyên câu ví dụ, không tuyên bố viết lại cấu trúc câu thành ba cấp độ; đây là lựa chọn thuật toán của ứng dụng cá nhân, chưa phải kết luận về thuật toán nội bộ website gốc. Độ khó bài đọc bên dưới được truyền thật vào chỉ dẫn AI.

## Đọc hiểu

AI viết bài nguyên gốc theo bộ từ và mức `easy` (A1–A2), `medium` (A2–B1), `hard` (B2–C1), cùng câu hỏi MCQ và giải thích. BE kiểm tra số câu, lựa chọn và chỉ số đáp án trước lưu.

BE chuyển tối đa ba từ mục tiêu xuất hiện nguyên dạng trong bài thành ô `__[1]__`, `__[2]__`, `__[3]__`. `question.type:'cloze'` có ngân hàng từ trong `options:[{id,text}]`, gửi **ID lựa chọn**, không gửi chữ. Khi chấm ô, bài đọc được điền lại bằng từ đúng. Tiếp đó là `question.type:'choice'`, MCQ hiểu bài với cùng định dạng lựa chọn. Mỗi ô/câu được lưu và chấm riêng trên server. Số ô phụ thuộc số từ xuất hiện nguyên dạng trong đoạn AI trả về; không giả số ô luôn bằng ba. Nếu không tạo được ô nào, BE báo lỗi yêu cầu tạo lại, không trả bài MCQ rồi giả là đã có chức năng điền ô.

FE có thể thay radio bằng ngân hàng từ/drag-drop nhưng phải gửi ID thật; cần giữ lựa chọn dang dở bằng endpoint PUT. Bản dịch cả đoạn chưa được tạo thành tính năng riêng. Nghe bài sử dụng giọng hệ điều hành qua speechSynthesis, không phải giọng riêng của OpenQuiz.

## Trạng thái FE cần giữ

### Đọc hiểu bố cục cả bài, nộp một lần

Anti dùng các endpoint này khi dựng ngân hàng từ/ô trống và toàn bộ MCQ trên cùng màn hình. Luồng từng câu cũ vẫn chạy để FE hiện tại không bị hỏng.

- GET `/exercise-attempts/:id/questions` (chỉ reading): `{id,passage,completed,questions:[{id,type,gap_number?,prompt,options:[{id,text}],draft,feedback}]}`. Không có đáp án trước khi chấm; `feedback` chỉ trả câu đã chấm. `gap_number` nối câu cloze với ô tương ứng trên đoạn văn. `draft` là ID lựa chọn đã lưu, có thể null.
- PUT `/exercise-attempts/:id/drafts` nhận `{"answers":[{"question_id":"uuid","answer":"bank:0"},{"question_id":"uuid-khac","answer":null}]}`. Cho phép gửi một phần bài; `null` hoặc chuỗi rỗng xóa lựa chọn đó. Các lựa chọn khác giữ nguyên. Validate toàn bộ trước lưu để request lỗi không làm mất một phần draft. Không chỉnh sửa câu đã chấm.
- POST `/exercise-attempts/:id/submit` nhận `{"answers":[{"question_id":"uuid","answer":"bank:0"},{"question_id":"uuid-khac","answer":"1"}]}`. Phải có **mỗi ID câu hỏi đúng một lần**, bao gồm cả ô cloze lẫn MCQ. Với câu bỏ qua gửi `{question_id,skip:true}`. Gửi thiếu/trùng/sai ID hoặc ID lựa chọn sai bị từ chối trước mọi thay đổi.

Submit chấm trong transaction, lưu hoàn thành và trả `{...Attempt,results:[{question_id,correct,answer,expected,translation,explanation,skipped}],replayed}`. Đáp án chỉ có trong `results`/`feedback` sau khi chấm. Nếu đã học một phần qua API từng câu, giữ nguyên kết quả đã chấm và chỉ chấm phần còn lại. Nộp lại không đổi điểm/đáp án/thời điểm hoàn thành (`replayed:true`). Lịch sử GET hiện bài đã hoàn thành; GET questions khi mở lại cho phép xem phản hồi cả bài. Truy cập chéo tài khoản đều trả 404.

Hiển thị lỗi thật từ BE, không đổi lỗi quota/kết nối thành yêu cầu mua Pro. Khi tạo bài chờ AI, disable thao tác lặp. Nút bắt đầu ở màn cài đặt gửi `resume:false` để áp dụng đúng cấu hình mới; tiếp tục bài cũ bằng lịch sử. Lưu draft theo hàng đợi; chờ lưu xong trước chấm/chuyển. Đổi bộ từ reset state và tải lịch sử đúng bộ. Hiện FE có nút lưu bài, lịch sử, lọc từ sao/chưa thuộc, thứ tự, các dạng bài, phản hồi, bản dịch đáp án và nghe. Anti bố trí lại theo ảnh; không thay dữ liệu bằng nội dung mẫu. Ctrl chỉ nghe khi nhấn riêng phím Ctrl; Ctrl+C/Ctrl+L vẫn dùng bình thường. Enter không chiếm thao tác trên button/select/textarea.

## Kiểm tra

`server/tests/exercises.test.mjs` kiểm tra chủ sở hữu, đáp án không lộ qua đề/AI history, token trùng, draft/resume, nộp lại/chuyển lại không cộng thêm, hoàn thành/lịch sử, điền từ/dịch câu, reading cloze + MCQ, bộ lọc rỗng. Test dùng gateway mock; không chứng minh ngữ nghĩa mọi bài AI được giáo viên duyệt. Build TypeScript/Vite đã qua trong lượt triển khai; root sẽ kiểm tra luồng tích hợp trình duyệt cuối.
