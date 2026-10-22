> Bàn giao mới nhất sau khi hoàn thiện logic học: [ANTI-FUNCTIONAL-HANDOFF.md](ANTI-FUNCTIONAL-HANDOFF.md). Bản dưới đây giữ làm tham khảo nền; phiên bản hiện tại là contract 1.2.0, schema 5.

> Cập nhật 21/10/2026: đọc [bàn giao ứng dụng cá nhân hiện tại](PERSONAL-APP-HANDOFF.md). Tài liệu dưới đây là bản trước; các nhận định thiếu key, khóa Pro, chưa có audio hoặc chưa có nội dung bài học đã được thay thế.

# Bàn giao Anti: sửa logic và học liệu tiếng Anh

Tài liệu này cập nhật kết quả rà soát ngày 21/10/2026, ưu tiên hơn các mô tả cũ nếu mâu thuẫn. Phạm vi đang triển khai: từ vựng tiếng Anh với nghĩa tiếng Việt, ba nhóm Nền tảng, TOEIC và Công việc. FE hiện đã nối dữ liệu thật; Anti có thể tiếp tục chỉnh giao diện dựa trên các view hiện tại.

## Học liệu đã đối chiếu

Đã nhập **10 lộ trình, 180 bộ, 8.363 mục từ; 5.543 cách viết khác nhau**. Có từ lặp giữa các chủ đề và mục cùng cách viết có nghĩa/loại từ khác nhau. Không gộp các mục này làm mất dữ liệu.

| Nhóm | Lộ trình | Bộ | Mục từ |
|---|---|---:|---:|
| TOEIC | 600 Essential words | 50 | 600 |
| Nền tảng | A1–A2 | 20 | 601 |
| Nền tảng | B1–B2 | 20 | 1.021 |
| Nền tảng | C1–C2 | 20 | 1.705 |
| Nền tảng | Word Form | 20 | 2.112 |
| Nền tảng | Chunking | 10 | 500 |
| Công việc | Technology | 10 | 300 |
| Công việc | Y tế | 10 | 500 |
| Công việc | Technical Work | 10 | 510 |
| Công việc | Business | 10 | 514 |

Các số khác “30/50/100 từ” tròn là số mục thực sự hiển thị sau khi tải hết trên nguồn. `verified-content-inventory.json` lưu số lượng và URL gốc từng lộ trình; `server/content/visible-english.json` lưu vị trí, ID nguồn, URL nguồn và các trường từng mục.

Các trường đã lấy: tên bộ, thứ tự, từ, nghĩa, loại từ, IPA nếu hiển thị. Đã thao tác tải thêm qua giao diện cho các bộ hơn 50/100 mục. Không lấy ví dụ bị khóa, đồng nghĩa, hình ảnh, âm thanh hay học liệu mở rộng. Chỉ giữ thêm ba ví dụ bộ 163 có trong ảnh người dùng cung cấp; các ví dụ/đồng nghĩa suy đoán của bản nháp bị bỏ khỏi thư viện đã đối chiếu. `vocabulary_verified` chỉ có nghĩa đã đối chiếu các trường từ vựng này; không phải toàn bộ nội dung đã hoàn chỉnh hoặc mọi định nghĩa trên nguồn đều đúng về mặt sư phạm.

Thu thập bằng Playwright thao tác giao diện thông thường. REA quan sát thụ động riêng, không gán nhãn toàn bộ thao tác Playwright là REA. Bằng chứng: `research/REA-AUDIT-2026-10-21.json`, các capture trong `research/captures/`, và ma trận nghiên cứu trước đó. Không đọc cookie, mật khẩu, token hoặc dữ liệu storage.

## Các lỗi logic đã sửa

| Lỗi trước khi rà soát | Hành vi hiện tại |
|---|---|
| API lỗi vẫn vào bằng tài khoản mẫu; login đọc `res.user` sai | Đợi `/me`; 401 yêu cầu đăng nhập; lỗi kết nối có nút thử lại; login/register trả UserProfile trực tiếp |
| Trang chủ và danh mục ghi sẵn tiến độ, số bộ, ID | Dùng API dashboard/paths, số bộ thực tế và tiến độ tài khoản |
| 50 bộ TOEIC chỉ có 174 từ khác nhau, 36 bộ trùng nguyên danh sách | Thay lộ trình chính bằng 50 bộ nguồn, 600 từ khác nhau; bản nháp cũ không được đề xuất |
| Seed xóa toàn bộ từ bộ 163 mỗi lần chạy | Upsert giữ ID, không xóa từ/tiến độ; import có digest, chạy lại không thêm liên kết lặp |
| Đọc sai kết quả tìm kiếm, từ điển, SRS, exam, matching | Chuẩn hóa hợp đồng trong `src/api/client.ts`; đã kiểm tra qua trình duyệt |
| Ghép từ gửi ID tile giả, bỏ qua lỗi lưu | Tile có ID riêng và question_id thật; lưu thành công rồi mới gỡ cặp |
| Phản hồi câu cũ xuất hiện dưới câu mới; bỏ qua phản hồi câu cuối | Hiển thị phản hồi trước, bấm Tiếp tục mới chuyển câu hoặc kết quả |
| React StrictMode tạo hai phiên cùng lúc | API client dùng chung yêu cầu start đang chờ cho cùng bộ/mode/settings |
| Speaking chấm điểm ngẫu nhiên; hội thoại chọn câu mẫu | Gọi Gemini/gateway thật, chưa cấu hình thì báo chưa kết nối; không có điểm phát âm giả |
| Reading/Grammar cố định bộ tuyển dụng cho mọi bộ | Tạo bài mới theo bộ đang mở, kiểm tra cấu trúc phản hồi AI |
| Kết hợp bỏ phiên BE trả về, tự gửi `score:100` | Dùng phiên đúng 5 từ và nộp session_id hoàn thành; bước AI dùng feedback_ids/conversation_id thật |
| SRS mặc định 24 lượt và 94%; nút luôn mở bộ 163 | Số thực từ API, chọn đúng bộ có từ đến hạn và `due_only` |
| Từ điển lỗi tự tạo nghĩa/IPA/đồng nghĩa | Tra thư viện thật; không có thì báo thiếu; lưu thành bộ thẻ thực qua BE |
| Join class gửi sai key, ranking đọc sai ID, feedback sai body | Đổi đúng code/id/message; danh sách lớp có số thành viên thực |
| “Đã tạo” hiển thị thư viện công khai | Dùng filter=mine/saved theo tab |
| Tạo lộ trình mở form tạo bộ thẻ | Có form lộ trình riêng, chọn/sắp xếp bộ và lưu BE |
| Giáo trình đánh dấu bài đầu hoàn thành, bấm bài nào cũng mở 163 | Chỉ hiển thị hoàn thành từ BE; học liệu chưa nhập được ghi rõ |

## Hợp đồng Anti cần giữ

- API gốc: `/api/v1`; success `{data,request_id}`. Client đã mở envelope, không mở lần nữa ở view.
- Auth login/register/me trả **UserProfile trực tiếp trong data**, không có `data.user`.
- Dashboard: `due_today` là số, `recommended` là `{tag,items}[]`.
- `/search`: wire trả `{sets:{items,...},paths:{items,...}}`; client chuyển thành hai mảng cho view.
- `/dictionary`: wire trả `{items,source}`; client chuyển `items` thành `words`.
- Exam: wire trả `{session,results}`; client lấy `session.correct/total` cho giao diện. Mọi answer đều phải có chuỗi `answer`, kể cả trắc nghiệm.
- Match: wire trả `terms[]`, `definitions[]`, ghép bằng ID câu hỏi chung. Không gửi ID tile có tiền tố `term:`/`definition:` về BE.
- SRS dùng `due`, `tracked`, `learning`, `mastered`, `forecast`. `tracked` không phải tổng lượt ôn.
- Lớp: wire có `owner_id`, `role`, `join_code`, thành viên có `id`. Client còn alias một số tên cũ để view hoạt động.
- `PathCard.set_count` là số bộ có trong dữ liệu. `expected_set_count` là tổng nguồn công bố, không dùng thay số bộ thực tế.
- ID local của lộ trình và bộ thường khác ID nguồn để tránh đè nội dung có sẵn. Lấy ID từ API; không suy ra bằng công thức trong FE. URL nguồn nằm ở `source`.
- Khi chưa có AI key, không thay bằng kết quả mẫu. Cấu hình theo `AI-SETUP.md`.

## Dữ liệu và chạy dự án

Database đã được sao lưu vào `server/data/library-backup-*.sqlite` trước khi cập nhật. Giữ các bản nháp cũ và lịch sử liên quan, không xóa dữ liệu người học. Seed mới không tạo tài khoản/mật khẩu demo. Các tệp TOEIC sinh cũ chỉ còn phục vụ báo cáo sai lệch, không dùng để seed.

Chạy `run.bat` ở thư mục gốc, yêu cầu Node 24.15+. FE cổng 3000, BE cổng 4000. Nếu đang chạy phiên cũ, dừng cửa sổ chạy cũ rồi mở lại. Đăng ký tài khoản local của bạn; tài khoản OpenQuiz gốc không tự dùng chung với ứng dụng này.

Kiểm tra đã thực hiện: build TypeScript/Vite thành công; 22 kiểm tra BE bao gồm quyền truy cập, chấm bài, idempotency, SRS, bằng chứng Kết hợp, AI gateway, adapter Gemini và import giữ tiến độ. Kiểm tra trình duyệt có 7 luồng qua, không có lỗi JS; xem `browser-qa.json`.

## Phần chưa thể gọi là giống 100%

- Chưa có nội dung các bài giáo trình, ví dụ/đồng nghĩa bị khóa, audio, hình gốc hoặc phiên bản định nghĩa tiếng Anh của các lộ trình.
- Chưa xác minh thuật toán học thích ứng, SRS, prompt AI và cách chấm nội bộ của OpenQuiz. BE dùng thuật toán độc lập.
- Chưa có chấm phát âm từ âm thanh; chưa kiểm tra AI trực tiếp vì chưa có key. Bước nghe chép Kết hợp đang luyện từ, chưa phải điền khuyết câu gốc.
- Giao diện các view được sửa để chạy đúng logic; Anti vẫn cần chỉnh khoảng cách, component và bố cục theo ảnh tham chiếu. Không dùng trạng thái/điểm mẫu để lấp phần thiếu.
- Giáo trình theo bài hiện hiển thị metadata; màn học nội dung đã nhập, giao/thu bài đầy đủ và các thao tác lớp nâng cao cần FE nối tiếp các endpoint đã có. Xem `API-CONTRACT.md`.
