# Bàn giao chức năng và ảnh cho Anti — 21/10/2026

> Đọc [bổ sung BE mới nhất](ANTI-BE-HANDOFF.md) trước: contract 1.3.0/schema 6, course learning sessions, study/options và Gemini 3.5 đang hoạt động. Tài liệu này giữ ma trận màn hình và ảnh; bổ sung mới được ưu tiên nếu khác mô tả cũ.

Đọc tài liệu này trước khi sửa FE. Logic học, nghe chép, ngữ pháp, đọc hiểu, hội thoại và Speaking đã được bổ sung; giao diện hiện tại đủ thao tác nhưng chưa phải bản đối chiếu điểm ảnh với OpenQuiz. Nhiệm vụ FE là dựng theo ảnh, giữ các trạng thái, dữ liệu và hợp đồng bên dưới. Không đưa lại dữ liệu mẫu hoặc bỏ các thao tác đang nối BE.

Ứng dụng chỉ phục vụ học tiếng Anh cá nhân: Nền tảng, TOEIC, Công việc. Không thanh toán, không khóa Pro/Plus, không lấy trạng thái quyền hạn tài khoản web gốc để khóa tính năng local.

## Mở ảnh tham chiếu

Mở [gallery ảnh nguồn và bản local](anti-reference/index.html). Toàn bộ ảnh nằm trong `docs/anti-reference`; bảy ảnh người dùng đã cung cấp bằng đường dẫn đã được sao chép vào đây. Ngoài ra có ảnh chụp giao diện nguồn trong lượt đối chiếu và ảnh local sau kiểm thử. Ảnh inline không có đường dẫn tệp được đối chiếu bằng ảnh chụp nguồn tương ứng, không giả là đã xuất được tệp đính kèm gốc.

| Màn hình | Ảnh chính để dựng | Ảnh local để xác định trạng thái đã hoạt động |
| --- | --- | --- |
| Học — trước trả lời | [Ảnh người dùng](anti-reference/user-study-question.png) | [Câu hỏi local](anti-reference/local-study-question.png) |
| Học — phản hồi đúng | [Ảnh người dùng](anti-reference/user-study-feedback.png) | [Phản hồi local](anti-reference/local-study-feedback.png) |
| Hộp cài đặt học | [Nguồn](anti-reference/source-study-settings.png) | [Cài đặt local](anti-reference/local-study-settings.png) |
| Nghe chép | [Nguồn](anti-reference/source-dictation.png) | [Local](anti-reference/local-study-dictation.png) |
| Ngữ pháp — cấu hình | [Nguồn](anti-reference/source-grammar-settings.png) | Dùng các cài đặt hiện có trong PersistentExercise |
| Ngữ pháp — sắp xếp câu | [Nguồn](anti-reference/source-grammar-order.png) | [Phản hồi local](anti-reference/local-grammar-feedback.png) |
| Đọc hiểu — ô trống và MCQ | [Nguồn](anti-reference/source-reading.png) | [Luồng chấm local](anti-reference/local-reading-cloze.png) |
| Hội thoại — cấu hình | [Ảnh người dùng](anti-reference/user-conversation-setup.png) | [Hội thoại local](anti-reference/local-conversation.png) |
| Speaking | [Ảnh người dùng](anti-reference/user-speaking-question.png) | [Phản hồi local](anti-reference/local-speaking-feedback.png) |
| Bộ thẻ / trang chủ / lộ trình | [Bộ thẻ](anti-reference/user-study-set.png), [Trang chủ](anti-reference/user-home.png), [Lộ trình](anti-reference/user-learning-path.png) | Giữ các API danh mục, đánh dấu, sao, tiến độ hiện có |

Các màn học tập cần bố cục riêng giống ảnh: thanh thoát/cài đặt, tiến độ, thẻ câu hỏi và vùng phản hồi. Thanh tìm kiếm lớn của dashboard hiện vẫn xuất hiện trên một số màn local; Anti xử lý AppLayout theo route học để không đẩy toàn bộ nội dung xuống. Giữ sidebar có thể thu gọn. Lấy kích thước, khoảng cách, màu và kiểu chữ từ ảnh thực; không dùng lại bố cục demo rồi chỉ đổi tiêu đề.

## Logic đã nối thật

| Chức năng | Hành vi cần giữ |
| --- | --- |
| Học | Hai chiều Anh–Việt, nhập/trắc nghiệm/luân phiên, đồng nghĩa, nhận giọng nói khi trình duyệt hỗ trợ; chấm BE; nghĩa ngắn như “thuê” vẫn đúng khi đáp án có nhiều nghĩa |
| Cài đặt học | Lưu BE, sao/chưa thuộc/thứ tự, kiểu câu hỏi, chấp nhận đồng nghĩa, tự đọc/tốc độ/voice, tự tiếp khi đúng; áp dụng tạo phiên với các lựa chọn thực |
| Phản hồi | Giữ câu cũ tới khi tiếp tục, đáp án đầy đủ, ví dụ/từ đồng nghĩa/nghe/dịch; “Tôi trả lời sai” sửa SRS và reward có audit, không tự trừ điểm trên FE |
| Ôn lại | Câu sai trong learn vào cuối hàng đợi, giới hạn lượt, tải lại giữ cursor/hàng đợi; số từ và số lượt hỏi là hai đại lượng khác nhau |
| Phím | Ctrl đơn nghe; Ctrl+C/V/A/L giữ nguyên; Enter kiểm tra/tiếp; không chiếm Enter của button/select hoặc IME. Tab giữ điều hướng truy cập chuẩn |
| Nghe chép | Chọn từ hoặc câu ví dụ; phát và chấm đúng nội dung đó, không phát term rồi giả là nghe chép câu; có bước chuẩn bị AI nếu thiếu ví dụ |
| Ngữ pháp | Sắp xếp token có ID ổn định/từ trùng, điền từ, dịch theo câu mẫu; chọn/bỏ token, lưu draft, lưu bài, chấm BE, phản hồi, tiếp và lịch sử |
| Độ khó ngữ pháp | Dễ gom cụm hai từ, vừa từng từ, khó thêm hai từ gây nhiễu; chỉ chọn required_token_count. Đây là thuật toán local, không tuyên bố đã biết thuật toán gốc |
| Đọc hiểu | AI tạo bài theo bộ từ/mức khó; ô trống + ngân hàng từ + MCQ; BE chấm và lưu; có cả API từng câu và API cả trang để Anti dựng giống ảnh |
| Hội thoại | Setup English/TOEIC/chủ đề/bộ lọc, lời mở đầu AI không giả tin người học, gợi ý, nghe/dịch từng tin, giữ input khi lỗi, lịch sử và tiếp tục |
| Speaking | Tạo/đổi câu hỏi đúng từ mục tiêu, gợi ý, xem nghĩa, dịch câu hỏi, nhập/nói, nhận phản hồi và khôi phục đúng bối cảnh từ lịch sử |
| Bộ thẻ | Ví dụ tự bổ sung khi mở mặt sau, nghe/dịch, lưu sao/bookmark; chia sẻ sao chép liên kết, xuất JSON, clone, các cách sắp xếp thật |
| Chế độ hiện có khác | Exam/matching/SRS/Kết hợp/khóa học vẫn dùng BE đã có; không thay bằng điểm hoặc tiến độ FE tự tính |

## Hợp đồng chi tiết

- [Học và nghe chép](STUDY-LOGIC-CONTRACT.md): payload cài đặt, counters, adaptive queue, tự sửa, reset tiến độ, bàn phím và micro.
- [Ngữ pháp và đọc hiểu](EXERCISE-FE-HANDOFF.md): token IDs, draft, bài lưu, chấm từng câu và chấm cả trang.
- [Hội thoại và Speaking](CONVERSATION-SPEAKING-CONTRACT.md): setup, mở đầu, tin nhắn, gợi ý/dịch, resume, lỗi và lịch sử.
- [Bàn giao nền](PERSONAL-APP-HANDOFF.md): ví dụ cá nhân, 60 bài học, cấu hình AI, quyền riêng tư và học liệu.
- [Kiểm kê route](API-ROUTES.md), [OpenAPI](openapi.json). Contract 1.3.0, SQLite schema 6.

Mọi route nằm dưới `/api/v1`. FE gọi qua proxy Vite `/api`, cookie phiên, mutation JSON với `X-Requested-With: OpenQuiz`. Thành công đọc `data`; hiển thị lỗi BE thật, không thay bằng alert “sắp ra mắt”. Không đưa API key vào React, biến VITE_, request Google từ trình duyệt hoặc file bàn giao.

### Đọc hiểu: dựng toàn bộ bài trên một trang

FE hiện tại dùng luồng từng câu để kiểm tra logic. Để dựng đúng ảnh nguồn hiển thị nhiều ô và MCQ cùng lúc, dùng:

1. `POST /exercise-attempts` `{set_id,kind:'reading',resume:false,difficulty,...}`.
2. `GET /exercise-attempts/:id/questions` lấy toàn bộ câu an toàn, passage, gap_number, options và draft đã lưu; không có đáp án trước chấm.
3. `PUT /exercise-attempts/:id/drafts` `{answers:[{question_id,answer:optionId}]}` để lưu lựa chọn. Chuỗi rỗng/null bỏ chọn.
4. `POST /exercise-attempts/:id/submit` gửi đủ mọi question_id đúng một lần; mỗi câu có answer hoặc skip:true. BE chấm nguyên bài atomically, trả kết quả, hoàn thành và hỗ trợ replay không chấm lại.

Không suy ra đáp án từ thứ tự ID; render ngân hàng từ theo options. Nếu đang có một phần đã chấm qua luồng từng câu, batch giữ kết quả đó và chấm phần còn lại. Chi tiết và test nằm trong hợp đồng ngữ pháp/đọc hiểu.

## AI và vận hành hiện tại

Key được giữ trong `.env` BE. Đã sửa khởi động Node để sử dụng proxy môi trường bằng `--use-env-proxy`; trước đó proxy có nhưng fetch Node không dùng, khiến AI timeout. `run.bat`/`run-backend.bat` chạy BE có watch, tự nạp file logic, không cần restart FE mỗi lần đổi BE. API đang chạy cổng 4000; FE 3000; không chạy chồng thêm tiến trình cùng cổng.

Kết nối hiện tại dùng **gemini-3.5-flash**, kiểm tra thật thành công với lời mở đầu/gợi ý/dịch hội thoại và gợi ý Speaking. Bài đọc sáu câu đã gọi thật thành công ở lượt model 3.8 trước. Lỗi 429/RetryInfo 15.036 giây trong lượt cũ cũng thuộc 3.8; không trình bày thành trạng thái hiện tại. Xem current-ai-connection.json và live-functional-validation.json. Khi có lỗi mới, đọc đúng model/error/retry, không tự bật billing hay sinh câu trả lời giả.

Ollama có adapter nhưng chưa được cài/chạy trên máy; không hiển thị là đã kết nối được. Chế độ không cần AI vẫn dùng dữ liệu đã lưu. Khóa học và phần chấm thường không đòi nâng cấp.

Đã có backup SQLite trước migration schema 5. Không reset/xóa `server/data`. Reset tiến độ chỉ được thực hiện bằng nút có xác nhận của người học; nút đó khác với “học lại” tạo phiên mới.

## Bằng chứng và giới hạn phải giữ đúng

- [REA lần đối chiếu này](anti-reference/REA-FUNCTIONAL-AUDIT-2026-10-21.json): cài đặt học, nghe chép, ngữ pháp, hội thoại và đọc hiểu; mỗi phần có Evidence ID. Thao tác bằng Playwright, REA quan sát trạng thái sau thao tác. Không gọi các thao tác Playwright là hành động do REA thực hiện.
- [Kiểm tra Chrome học/nghe chép](study-browser-qa.json) và [Chrome ngữ pháp/đọc hiểu/hội thoại/Speaking](functional-browser-qa.json): dữ liệu tạm riêng, không dùng dữ liệu người học để chạy kiểm thử phá trạng thái.
- [Gemini thật — luồng mới](live-functional-validation.json), [Gemini thật — các tác vụ nền](live-ai-validation.json). Phân biệt kiểm thử model thật và mock gateway; không dùng test mock để tuyên bố chất lượng ngữ nghĩa của mọi bài AI.
- Âm thanh tự đọc được kiểm tra bằng lời gọi TTS trong trình duyệt; chưa xác minh loa/micro vật lý của người học. Audio pronunciation có fixture WAV tổng hợp từ lượt trước; không phải đánh giá chuẩn âm vị được giáo viên xác nhận.
- Bài dịch ngữ pháp hiện chấm theo câu mẫu chuẩn hóa, chưa chấp nhận mọi cách dịch đồng nghĩa. Số ô trống bài đọc phụ thuộc từ thực xuất hiện; 0 ô báo lỗi thay vì giả là có cloze.
- Không khẳng định giống 100% các màn chưa quan sát, thuật toán SRS độc quyền, prompt AI nội bộ hoặc nội dung Pro chưa có quyền đọc. Học liệu bổ sung là của ứng dụng; không chép trạng thái khóa của nguồn.

## Checklist khi Anti thay giao diện

1. Giữ các component điều khiển/state/API, thay phần trình bày theo đúng ảnh trước câu hỏi/đang nhập/phản hồi/lỗi/đang tải/kết thúc.
2. Giữ cursor, pending request, draft, question_id và progress từ BE; không tăng tiến độ khi chỉ mở màn hình.
3. Settings phải đổi payload thật; “bắt đầu bài mới” và “tiếp tục bài cũ” là hai thao tác khác nhau.
4. Trên feedback dùng từ của câu đã trả lời, không dùng từ trong session.question mới trả về.
5. Không biến lỗi mic/quota/network thành tính năng khóa hoặc điểm giả. Các thao tác con nghe/dịch không làm lật thẻ.
6. Sau sửa chạy build và các script kiểm tra tương ứng. Browser QA dùng đường dẫn Playwright của môi trường hiện tại, cần điều chỉnh nếu chuyển máy.
