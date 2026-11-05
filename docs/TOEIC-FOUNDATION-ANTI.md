# Bàn giao Anti: FE và kiểm thử TOEIC nền tảng

Đọc [TOEIC-FOUNDATION-API.md](TOEIC-FOUNDATION-API.md) trước. Codex đã làm nội dung, BE, mở khóa, SRS và 15 API. Không xây một phiên bản logic riêng trong FE. Không gọi AI để sinh bài nền tảng và không thêm ảnh/audio nặng.

## Phân công và ranh giới

Anti làm FE, client API riêng, kiểm thử API và trình duyệt. Được sửa `src/**`, thêm scripts/test và ghi kết quả vào tài liệu FE mới `docs/TOEIC-FOUNDATION-FE-STATUS.md`. Không sửa `server/**`, DB, `.env`, nội dung khóa, `docs/openapi.json`, `docs/API-ROUTES.md` và hai tài liệu bàn giao này. Phát hiện BE sai: ghi route/request/status mong đợi và thực tế, bàn giao Codex; không tự giả lập đáp án/progress trong FE.

Giữ các thay đổi A1 V2 đã có trong workspace. Không ghi đè toàn bộ CoursesView từ mẫu cũ. Không đổi Trang chủ, logo, `/my-program`, Lộ trình, Thư viện, Giao tiếp AI hoặc di chuyển bộ System & Network.

## Cấu trúc giao diện

1. Trong mục **Khóa học** hiện tại, thêm thẻ **TOEIC — Từ nền tảng**, gọi catalog API riêng. Giữ A1 và khóa legacy. Không thêm sidebar TOEIC thứ hai, không dùng thẻ “850+” cho khóa mất gốc.
2. Trang con đề xuất `/courses/toeic`: tóm tắt “Dành cho người học lại từ đầu”; hai giai đoạn, tám chặng; một nút **Bắt đầu khóa** nếu chưa enroll, sau đó **Học tiếp** từ today. Thời gian/ngày tùy chỉnh có thể đóng gọn; điểm mục tiêu để trống mặc định, không bắt trả lời trước khi học. Giai đoạn3/4 chỉ ghi “Sẽ phát triển sau”, không có CTA học.
3. Danh sách bài theo chặng có trạng thái BE. Chỉ hiện chi tiết chặng đang học khi vào lần đầu; không bắt cuộn qua 40 thẻ. Bài khóa giải thích cần hoàn thành bài/chặng trước. Có “Xem trước” tài liệu nhưng không được gọi session để vượt khóa.
4. Trang bài đề xuất `/courses/toeic/units/:id`: tiêu đề, mục tiêu ngắn, bốn phần Ngữ pháp/Từ vựng/Nghe/Đọc với trạng thái thực. Nút Học tiếp chọn phần chưa xong. Phát âm là mục hỗ trợ tùy chọn, không chặn tiến độ. Giải thích từ loại bằng nhãn Việt dễ hiểu; không có `word -` hoặc dấu phân cách thừa khi thiếu IPA.
5. **Trước đánh giá phải có tài liệu học** lấy từ GET unit: giải thích Việt, từ/loại từ/nghĩa, câu mẫu song ngữ; nút nghe từ/câu bằng TTS. Với bài5 mỗi chặng có hội thoại theo vai A/B. Không đưa ngay bài kiểm tra chưa dạy cho người mất gốc. Không cần BE tự ghi “đã xem” vì xem không tính hoàn thành.
6. Trang phiên `/courses/toeic/sessions/:id`: mỗi lần một câu, progress nhỏ, nội dung chính gọn, thanh trả lời/tiếp tục dễ bấm. Reload bằng GET phiên, không POST tạo mới. Chỉ có một vùng cuộn chính, không để ô nhập rơi xuống dưới viewport. Mobile 390px không tràn ngang; focus ô nhập vừa phải, không mở bàn phím khi đang chọn đáp án/nghe. Khai báo route TOEIC cụ thể trước route động `/courses/:id` để slug toeic không bị hiểu là ID khóa cũ.
7. Nút **Về bài học**, **Về khóa TOEIC**, breadcrumb Khóa học → TOEIC → Bài. Sidebar active Khóa học trên mọi route con. Browser Back trở về đúng bài/khóa, giữ phiên. Rời bài không xóa trạng thái. Không điều hướng người học sang trang bộ thẻ chung sau mỗi phần.
8. Kết thúc phần: “Đã hoàn thành phần này”, số câu lần đầu và lỗi đã sửa riêng. Kết thúc checkpoint passed: Học tiếp chặng mới. `needs_review`: nói rõ số đúng lần đầu, gợi ý xem lại bài vừa học và nút làm lại, không hiển thị100%.
9. Ôn từ đến hạn trong trang TOEIC gọi review session; không kéo toàn bộ từ khác vào. NO_DUE_WORDS là empty state nhẹ. Mục từ ngày là gợi ý10–15, có thể dừng giữa phiên, không khóa lượt giả.

## Tương tác quan trọng

- Gửi đúng module cho POST session; mặc định resume. Nút “Luyện lại lượt mới” dùng resume:false rõ ràng. Một câu đang gửi thì khóa nút tránh double submit.
- Gửi option_id, không gửi label/index; sắp xếp gửi token_ids đủ mỗi ID một lần.
- Nhận xét đúng/sai/vàng giữ lại cho đến khi nhấn Tiếp tục. Không tự chạy qua lỗi/vàng; có expected + explanation. Câu có trợ giúp phải ôn lại và không tính đúng lần đầu.
- Help trả revision mới, mọi thao tác sau đó lấy revision mới. STALE_REVISION tải GET phiên; không gửi lại câu trả lời cũ tự động.
- Nghe: POST listen với revision, đọc text bằng Web Speech tiếng Anh. Nút nghe lại, tốc độ 0.75/0.9/1.0. User gesture trên mobile; nếu không có TTS/giọng phù hợp, báo rõ và cho chọn phần khác. Không bật mic ở ô nhập, không giả điểm phát âm98%.
- Không hiển thị bản dịch/đáp án dưới câu nghe trước lần trả lời trừ khi người học bấm trợ giúp (gọi BE). Các câu hội thoại đọc đúng lượt A/B. Khi ra trang/dừng, hủy TTS đang đọc để tránh chồng tiếng.
- Các tài liệu song ngữ đã có sẵn; nút “Xem nghĩa” mở dữ liệu này, không dùng Gemini.
- Chỉ tin tiến độ API, không tăng completed_modules trong localStorage. Sau passed tải lại roadmap/today; không POST grade vào API course legacy.
- API helper dùng prefix `/api/v1`, cookie credentials và X-Requested-With như client hiện có; giữ thông báo lỗi an toàn, không lộ state nội bộ.

## Kiểm thử Anti cần thực hiện

Không dùng tài khoản/DB người dùng để chạy vòng học tự động. Tạo app in-memory hoặc DB test tạm, tài khoản test tách biệt, không gọi AI thật.

| Nhóm | Tình huống phải đạt |
| --- | --- |
| Seed/upgrade | Khởi động hai lần vẫn một khóa, hai phần, 48 bài/ôn tập, 40 bộ, 540 mục từ; IDs và dữ liệu học cũ giữ nguyên; không tự enroll |
| Auth | GET catalog không cần login; các route khác trả 401; session người khác trả 404; mutation cần header CSRF |
| Khởi đầu | Enroll idempotent; PUT profile chỉ đổi trường TOEIC; bỏ target_score vẫn học; GET roadmap không ghi DB |
| Mở khóa | Bài 1 mở, bài 2 khóa; được chọn trong bốn phần của bài 1; hoàn thành 3/4 chưa mở bài 2, đủ 4/4 mới mở; checkpoint chưa xong thì chặng sau khóa; grade legacy không vượt khóa |
| Nội dung | Soát nghĩa/từ loại, 40 giải thích, 120 câu dịch, 40 câu thông tin và tám hội thoại; không hiện mẫu câu sinh chung hoặc IPA đoán; câu hỏi đọc đủ ngữ cảnh |
| Từ vựng | Xáo từ; đủ 15/12 từ nhận diện và tự viết; đảo nghĩa/thiếu dấu được vàng đúng; thêm nghĩa sai phải sai; không chấm thoáng lỗi đánh vần tiếng Anh |
| Chấm/tiếp | Chưa trả lời mà continue trả 409; câu sai được ôn lại; dùng help rồi đúng vẫn phải ôn; làm lại không tăng first_correct; Enter không gửi hai lần |
| Resume | Reload giữa câu/sau feedback/sau help vẫn giữ cursor và revision; hai tab cũ trả stale 409; session xong không ghi SRS lần hai; nội dung cũ trả 409 và lượt mới giữ lịch sử |
| Checkpoint | 16/20 đúng đầu và sửa bốn lỗi thì đạt; 15/20 và sửa năm lỗi vẫn needs_review; lượt mới phải đạt mới mở; help không tính đúng lần đầu |
| SRS | Xem thẻ/chọn nghĩa không tự đánh dấu thuộc; tự viết cập nhật một lần; đúng trước hạn không tăng giãn lịch; sai ôn sau mười phút; review chỉ lấy từ TOEIC của user; từ khác giữ nguyên |
| Nghe/đọc | Nghe lại không chuyển câu; response không lộ đáp án tương lai; TTS đúng tiếng Anh và tốc độ; nghe hiểu không lộ transcript trước help/feedback; đổi trang dừng TTS |
| Giao diện | Desktop, mobile 390px, bàn phím; nút Back mọi trang; sidebar Khóa học active; học xong về đúng khóa; đủ loading/empty/error/retry; tránh hai scrollbar |
| Hồi quy | A1 V2, Trang chủ, /my-program, lộ trình, bộ thẻ, thư viện, AI voice; typecheck/build và test API hiện có |

Ghi số ca, lệnh và môi trường thực chạy; phân biệt mock TTS với nghe loa thật. Chưa kiểm gì thì ghi rõ, không báo “100% toàn web” từ một vài ca. Không chỉnh API/BE chỉ để làm test xanh; gửi issue cho Codex nếu hợp đồng chưa đáp ứng.

## Lệnh người dùng gửi Anti

```text
Làm FE và kiểm thử khóa TOEIC Giai đoạn 1–2 theo:
docs/TOEIC-FOUNDATION-API.md
docs/TOEIC-FOUNDATION-ANTI.md

Codex đã làm BE/nội dung/API, bạn chỉ làm FE + test, không sửa server, DB, env hay hợp đồng API. Đặt khóa TOEIC trong mục Khóa học hiện có, giữ Trang chủ/A1/Lộ trình và các chức năng cũ. Dùng tiến độ/mở khóa từ BE, tài liệu song ngữ có sẵn, không gọi AI sinh bài. Ghi kết quả vào docs/TOEIC-FOUNDATION-FE-STATUS.md; nếu BE lỗi, bàn giao request và lỗi thực tế cho Codex.
```
