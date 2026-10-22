> Bàn giao mới nhất sau khi hoàn thiện logic học: [ANTI-FUNCTIONAL-HANDOFF.md](ANTI-FUNCTIONAL-HANDOFF.md). Bản dưới đây giữ làm tham khảo nền; phiên bản hiện tại là contract 1.2.0, schema 5.

> Cập nhật 21/10/2026: đọc [bàn giao ứng dụng cá nhân hiện tại](PERSONAL-APP-HANDOFF.md). Tài liệu dưới đây là bản trước; các nhận định thiếu key, khóa Pro, chưa có audio hoặc chưa có nội dung bài học đã được thay thế.

# Gửi Anti — dựng FE ứng dụng OpenQuiz, không tiếp tục landing page

**Cập nhật 21/10/2026:** đọc [bản rà soát logic và học liệu mới](BE-LOGIC-AUDIT-2026-10-21.md) trước. FE hiện đã là ứng dụng, có 10 lộ trình/180 bộ từ đã đối chiếu. Các mô tả landing page và giới hạn dữ liệu cũ bên dưới chỉ còn giá trị lịch sử nếu mâu thuẫn bản cập nhật.

## Mục tiêu và điểm bắt đầu

Bạn phụ trách FE. Backend đã nằm trong `server/`, API client có sẵn ở `src/api/client.ts`. Cần dựng **ứng dụng sau đăng nhập** theo ảnh tham chiếu và hành vi đã kiểm tra, thay logo riêng. Landing page hiện tại chỉ là code cũ, không được dùng làm chuẩn cho dashboard hoặc phòng học.

Đọc theo thứ tự:

1. Tài liệu này: màn hình, điều hướng và nghiệm thu.
2. `docs/API-CONTRACT.md`: payload, response, quy tắc chấm/lưu dữ liệu.
3. `docs/API-ROUTES.md`: danh sách handler đã thực hiện.
4. `docs/openapi.json`: inventory API để import công cụ.
5. `docs/RESEARCH-MATRIX.md`: phần đã quan sát và phần chưa xác minh/tích hợp.

Nhấp `run-backend.bat` chạy riêng BE. `run.bat` chạy BE + FE; frontend 3000, backend 4000. Vite đã proxy /api. Đăng ký tài khoản local qua `/api/v1/auth/register`; đây là tài khoản độc lập, không phải tài khoản OpenQuiz gốc.

## Ảnh tham chiếu người dùng

Các file trong `docs/reference/` được copy từ ảnh người dùng cung cấp:

- `home.png`: dashboard đã đăng nhập, sidebar mở và các nhóm lộ trình.
- `study-set-163.png`: bộ từ, flashcard lớn, list từ và các nút mode.
- `learning-path-14.png`: header lộ trình và 50 bộ thẻ theo thứ tự.
- `speaking.png`: câu hỏi speaking, gợi ý, nhập/mic.
- `learn.png`: bài học điền đáp án, progress bar, cài đặt.

Nếu file chưa có, lấy đúng các ảnh gốc được nhắc trong hội thoại. Không lấy screenshot landing để thay các ảnh trên. Các bản capture bổ sung trong `research/captures/` chỉ là dữ liệu phân tích cục bộ, không chứa session/token; không đưa chúng vào production bundle.

## Thiết kế xuyên suốt

- Nền xám rất nhạt, nội dung trắng, chữ navy đậm, viền xám nhạt, radius khoảng 12–24 px; primary màu đen/navy. Không tự thêm gradient hay gam xanh tím vào toàn bộ app.
- Font hệ thống, khoảng thở rộng; page desktop có cột nội dung chính dịch sang phải theo sidebar.
- Sidebar đầy đủ khoảng 200–240 px ở dashboard; phòng học có rail icon hẹp khoảng 72–80 px. Đừng cố định kích thước này ở mobile.
- Sidebar: Trang chủ, Khoá học, Đã tạo, Lớp học, Xếp hạng; bên dưới Tra từ, Tạo Bộ thẻ, Tạo lộ trình, Hình nền, Báo lỗi, avatar.
- Header và rail dùng logo mới `/logo.svg`; không dùng nhãn hiệu/chứng nhận pháp nhân của web gốc cho sản phẩm mới.
- Responsive: mobile thành drawer/bottom controls có thể chạm; hàng card cuộn ngang theo nhóm; flashcard không tràn viewport; dialog cuộn độc lập khi bàn phím mở.
- Loading skeleton, empty, error, retry đều phải có. Lỗi/giới hạn AI không được thay bằng kết quả giả.

## Route và màn hình

| FE route cần dựng | Màn hình | API chính |
| --- | --- | --- |
| /login, /register | tài khoản local | /auth/login, /auth/register, /me |
| / | dashboard đã đăng nhập | /dashboard, /capabilities |
| /search | kết quả tìm kiếm có filter | /search, /sets, /paths |
| /study-set/:id | bộ từ và flashcard | /sets/:id, /words/:id/progress |
| /study-set/:id/progress | tiến độ theo nhóm | /sets/:id/progress |
| /learning-path/:id | lộ trình và list bộ | /paths/:id |
| /learning-path/:id/all-words | gom các từ của bộ được phép xem | lấy path.sets rồi /sets/:id; chưa có API tổng hợp |
| /study/:id | Học | /study/sessions mode learn |
| /exam/:id | test điền/trắc nghiệm nộp cả bài | mode exam, /questions, /submit |
| /dictation/:id | nghe và gõ | mode dictation + TTS frontend |
| /game/match/:id | ghép từ | mode match + /match + /answers |
| /ai-study/:id | Speaking | /ai/generate + /ai/history |
| /conversation/:id | cài đặt và hội thoại | /conversations + /messages |
| /grammar/:id | cài đặt/luyện ngữ pháp | /ai/generate kind grammar |
| /reading/:id | bài đọc, word-bank, câu hỏi | /ai/generate kind reading |
| /comprehensive/:id | luồng 5 từ/bài, 5 bước | /sets/:id/lessons và /lessons/:index/steps/:step/start, /complete |
| /courses | curriculum theo ngôn ngữ/cấp độ | /courses, /courses/:id |
| /courses/:courseId/lesson/:id | bài học trong curriculum | /course-lessons/:id, /submit |
| /repetition-study | lịch ôn/từ đến hạn | /srs/summary, /srs/queue |
| /my-created | bộ đã tạo/đã lưu, folders | /sets?filter=mine hoặc saved, /folders |
| /create-flashcard, /edit-flashcard/:id | editor và import | /sets, /sets/import, /words |
| /create-learning-path, /edit-learning-path/:id | chọn/sắp xếp bộ | /paths, /paths/:id/sets |
| /classes, /class/:id | lớp, thành viên, bài giao | /classes, /classes/:id |
| /ranking | thứ hạng từ điểm thật | /ranking |
| /profile | tên, ngôn ngữ, giao diện | /me |

Các route trên là đề xuất tích hợp FE với BE này. Không tự suy rằng tên route trùng web gốc nghĩa là payload/API gốc được hỗ trợ.

## Dashboard

Đọc `/dashboard`, dựng đúng thứ tự: search; khối từ đến hạn; lộ trình đang học; bộ từ đang học; phần khóa học nếu capability hỗ trợ; lộ trình gợi ý theo ngôn ngữ và nhóm; truy cập gần đây; đường dẫn đã tạo/đã lưu. Khối quảng bá/extension/community trong ảnh là nội dung phụ; không làm chúng thay thế dữ liệu học tập.

Card hiển thị title, mô tả tùy kích thước, cặp ngôn ngữ, số bộ hoặc số từ, tác giả, progress thật. Chỉ hiển thị nhãn verified nếu có dữ liệu xác thực; BE hiện không phát nhãn đó. Dữ liệu seed nhỏ thì dashboard phải thể hiện đúng quy mô, không điền số 314 hay 600 bằng hằng số.

## Bộ từ /study-set/:id

1. Header: quay lại, tên bộ, lưu/chia sẻ/menu, nút lặp lại ngắt quãng.
2. 8 nút chế độ theo ảnh: Kết hợp, Speaking, Hội thoại, Ngữ pháp, Đọc hiểu, Học, Test/Game, Nghe Chép.
3. Flashcard lớn ở giữa; mặt trước term/word type/phonetic, mặt sau definition/synonyms/example. Có phát âm, flip, mic (capability phụ thuộc provider).
4. Trái/phải đổi thẻ; Space/Enter lật khi không focus input. Shuffle và thứ tự học có tác dụng thật trên danh sách.
5. Nút Tiến độ; bộ đếm thẻ; hướng dẫn.
6. Sort: gốc, sao trước, chưa học trước, đang học trước, đã thành thạo trước. Nhóm từ tương ứng, nút ẩn/hiện.
7. Mỗi row: term/word type/phonetic/synonyms ở trái, definition/example ở phải, sao và audio; image nếu có. Ảnh khóa trong nguồn không có nghĩa phải tạo paywall giả ở bản dựng.

Bookmark và word star là dữ liệu khác nhau: `/bookmarks/set/:id` để lưu bộ, `/words/:id/progress {starred:true}` để đánh dấu từ. List progress phải reload/cache-update sau bài học.

## Học và cài đặt

FE không tự chấm câu trả lời. Khởi tạo session, lưu session.id trong route/query hoặc sessionStorage để resume, hiển thị question từ server, submit rồi lấy session mới. Hiển thị expected sau khi trả lời; không gửi correct/score do FE tự tính.

Các tùy chọn nhìn thấy trên web gốc: hỏi Anh→Việt, Việt→Anh, đồng nghĩa, trả lời bằng phát âm; sao/chưa thuộc; học theo thứ tự; chấp nhận đồng nghĩa; tự động tiếp tục; điền từ/trắc nghiệm; reset. Hiện BE đã hỗ trợ direction/shuffle/starred_only/due_only/limit, lưu word status và reset. Những setting còn lại phải được tích hợp thêm, **không chỉ vẽ công tắc rồi bỏ qua**. Settings UI-only như auto advance có thể lưu `/me.settings.study`.

Các thanh progress phải lấy số câu từ server. Ảnh gốc có 12 từ và 20 câu nhưng đó không phải số cố định cho mọi bộ hoặc thuật toán hiện tại. BE hiện dùng queue độc lập, chưa tái tạo thuật toán adaptive của web gốc.

## Test/Game

Web gốc có dialog chọn Bài kiểm tra / Vượt Sa Mạc / Húc Cổng / Ghép từ. Đã quan sát màn hình /exam với câu điền và 4 đáp án, nút nộp toàn bộ. BE hỗ trợ exam và match. Hai game còn lại chưa được dựng engine; hiển thị trạng thái chưa hỗ trợ thay vì giả rằng quiz là cùng game.

Exam: fetch /questions, lưu draft đáp án ở FE, đếm đã trả lời, gửi toàn bộ /submit, rồi render kết quả. Không cộng điểm ở FE. Matching: người chơi được chọn cặp theo thứ tự bất kỳ, /answers idempotent, không cộng lại điểm khi retry.

## Kết hợp và curriculum

Kết hợp đã xác minh: 5 từ/bài, tổng 5 bước; chọn Bài 1 mở dialog liệt kê Flashcard & Phát âm → Học → Nghe chép điền từ → Speaking → Hội thoại. Dùng API /sets/:id/lessons, không dùng mode comprehensive ba chặng cũ để giả làm đủ luồng này. Progress hoàn thành phải có evidence ở BE. Bước nghe-chép hiện BE hỗ trợ word dictation, chưa hoàn toàn tương đương gap-fill câu ví dụ. Speaking/hội thoại cần gateway.

Trang Khoá học là curriculum thật, khác thư viện flashcard/lộ trình. Đã quan sát A1 có 6 PART, mỗi PART 5 bài và nút Sổ từ vựng; có chọn ngôn ngữ/cấp độ. BE đã có catalog/parts/lessons/import/submission; seed chỉ có tên bài A1. CONTENT_NOT_IMPORTED cần empty state rõ ràng, không tự điền bài gốc hoặc dùng flashcard khác thay vào.

## Speaking, hội thoại, ngữ pháp, đọc hiểu

Speaking đã thấy: thoát/lịch sử/cài đặt; đổi câu hỏi; dịch/TTS; câu gợi dẫn lớn; yêu cầu dùng từ mục tiêu; xem gợi ý/bí ý tưởng/định nghĩa; chọn ngôn ngữ nói; mic hoặc nhập; bộ đếm câu. API gốc thực tế có thể trả 429 nên cần UI hạn lượt/backoff, không spam đổi câu hỏi.

Hội thoại: trang cài đặt trước khi bắt đầu, ngôn ngữ, mục tiêu thi, chủ đề tự động theo bộ, bộ lọc từ và thứ tự. Sau đó là thread chat/lịch sử. Không tự gọi provider trên mỗi rerender.

Ngữ pháp: cài đặt sao/chưa thuộc/thứ tự, độ khó Dễ/Trung bình/Khó, loại Dịch câu/Điền từ/Sắp xếp câu. Provider của dự án cần quy định thêm schema câu hỏi trước khi có thể tái tạo đầy đủ.

Đọc hiểu: đoạn văn có chỗ trống, ngân hàng từ, câu hỏi A/B/C/D, nghe toàn bài/từng câu, điều tốc, dịch, chỉ dẫn ô chưa điền/câu chưa chọn, bài tiếp theo, lịch sử. BE hiện có gateway và lưu nội dung; chưa có schema/chấm gap-fill tương đương đầy đủ. FE phải phối hợp contract, không hardcode bài đọc gốc.

`GET /capabilities` quyết định hiển thị khả dụng. AI chưa cấu hình => giải thích và cho người dùng quay lại các chế độ vocab hoạt động. Chấm phát âm từ audio là tính năng riêng, không được dùng transcript hoặc random để sinh PronScore.

## Tiêu chí bàn giao FE

- Dùng ảnh reference để so desktop/mobile đúng ứng dụng, không chỉ landing.
- Đăng ký/đăng nhập/đăng xuất thật; refresh giữ session; 401 về login.
- Tạo bộ mới → thêm/import từ → học → tải lại vẫn giữ tiến độ trong SQLite.
- Chọn hai bộ khác nhau phải có nội dung khác nhau. Path mở đúng bộ và đúng thứ tự.
- Save/star/filter/sort/folder có tác dụng. Browser back/forward và mở deep link hoạt động.
- Câu sai/đúng, Tôi không biết, nộp cả bài, resume và retry đều dùng API đúng.
- Lớp chỉ thành viên được xem; học sinh không thấy nút quản trị; giáo viên xem điểm thật.
- Không hiển thị OAuth/payment/AI score/full catalog như đã hoạt động khi capability chưa hỗ trợ.
- Chạy typecheck/build FE và test BE. Đối chiếu lại bằng browser, ghi rõ lỗi/giới hạn còn lại.

## Phần chưa được phép gọi là “giống 100%”

Backend source của OpenQuiz không thể lấy từ trình duyệt. Nội dung database toàn bộ, algorithm riêng, OAuth, billing, pronunciation audio, course curriculum, reward shop/avatar/video/extension và vài mode nâng cao chưa được tái tạo hoàn chỉnh. Bản BE hiện là nền hoạt động thật cho FE, kèm danh sách thiếu để tiếp tục, không phải xác nhận đã clone toàn bộ dịch vụ.
