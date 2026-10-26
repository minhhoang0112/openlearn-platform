# Mốc 2 — Một nơi bắt đầu, điều hướng5 mục

Ngày bàn giao:26/10/2026. BE giữ contract1.20.0/schema14/156route; không cần API mới để làm mốc này. Không đổi DB, kết quả học, engine, planner hoặc thuật toán SRS.

## 1. Giữ các sửa logic Codex vừa bổ sung

Sau khi kiểm bản1B, Codex đã sửa trực tiếp hai phần chức năng (không đổi bố cục):

- `LessonRunView.tsx`: xác nhận mục tiêu từ GET today theo plan_id/item_id/session/version. Không dùng target_cursor trên URL để tự kết luận đạt mục tiêu. Có thông báo và thử lại khi không xác nhận được.
- `TodayView.tsx`: lỗi start theo kế hoạch không tự fallback sang start bài thường. Học lại chủ động và legacy mới dùng luồng tương ứng.

Giữ hai sửa này khi chỉnh giao diện. Kiểm bằng `scripts/verify-daily-goal-guards-browser.mjs`.

## 2. Năm mục chính

| Mục | Route chính | Nội dung |
|---|---|---|
| Học hôm nay | `/today` | Kế hoạch ngày, tiếp tục bài, ôn từ và Sổ lỗi |
| Lộ trình | `/my-program` | Khóa nền tảng/chuyên ngành và vị trí học hiện tại |
| Thư viện | `/my-created` | Nội dung cá nhân/đã lưu, lối vào Khám phá và học liệu cá nhân |
| Luyện tập | `/practice` | Luyện tự do theo kỹ năng/chế độ; giữ trang con chọn bộ |
| Tiến độ | `/progress` | Hoạt động toàn hệ thống, chương trình và bằng chứng kỹ năng |

- Ôn đến hạn `/repetition-study` và Sổ lỗi `/mistakes` là mục con/shortcut trong khu Học hôm nay/Ôn tập, không cạnh tranh thành hai mục chính mới. Giữ badge có dữ liệu thật.
- Lớp học, Cài đặt học, Cài đặt AI vào menu phụ/tài khoản. Tạo bộ thẻ/Tạo lộ trình vào nút Thêm trong Thư viện; không xóa route hoặc tính năng.
- Tra từ là công cụ hỗ trợ, không phải mục điều hướng học tập. Giữ khả năng mở và lịch sử hiện có.
- Chỉ một ô tìm kiếm chính trên một màn hình. Không thêm banner quảng bá chen giữa các nhiệm vụ học.

## 3. Một cửa vào

- `/` là alias tới `/today` cho người đã đăng nhập. Logo về `/today`.
- Đăng nhập từ trang gốc thì vào Học hôm nay. Nếu người học mở deep link bài/bộ từ khi chưa đăng nhập, sau đăng nhập giữ deep link đó; không ép tất cả về Today.
- Redirect dùng replace để không tạo vòng lặp BrowserBack. Nếu mở rộng RouterContext, giữ tương thích navigate(to) cho caller cũ.
- Không để unknown route âm thầm render Dashboard khám phá. Có màn không tìm thấy và nút về Học hôm nay/Thư viện.

## 4. Khám phá thuộc Thư viện

- Chuyển Dashboard khám phá hiện có sang route `/explore`, nhãn **Khám phá bộ từ & lộ trình**. Truy cập từ Thư viện bằng tab/link rõ ràng. Giữ dữ liệu, tìm kiếm và các card đang hoạt động; không xây một catalog giả khác.
- Mọi link mở từ `/explore` phải ghi nguồn Thư viện và `from` là URL explore thực tế (bao gồm bộ lọc), không giữ `source=home, from=/` hardcoded từ Dashboard cũ.
- `/explore`, category và learning-path mở từ đó phải highlight Thư viện. Bài học mở từ nguồn nào thì giữ nguồn đó khi Back/reload.
- Nội dung đang học/gợi ý phân biệt theo dữ liệu thật; không gắn nhãn Đang học cho fallback.

## 5. Ngôn ngữ và nhịp màn hình

- Hôm nay chỉ một CTA chính: **Bắt đầu buổi học** hoặc **Tiếp tục**; các tác vụ phụ xếp gọn bên dưới.
- Đã xong mục tiêu ngày thì hiển thị kết quả ngày và học thêm tùy chọn, không thúc ép như chưa học.
- Thư viện trả lời “Tôi có gì / tìm gì / thêm gì”; Lộ trình trả lời “Tôi đang ở đâu / học tiếp bài nào”; Luyện tập trả lời “Tôi muốn luyện thêm kỹ năng nào”. Tránh đưa cùng một grid khổng lồ vào cả ba.
- Giữ typography/khoảng cách/CTA thống nhất. Không cần thêm animation hoặc asset mới chỉ để làm mốc này.
- Mobile có menu gọn; nếu dùng thanh đáy, kiểm safe area và tránh che CTA, bàn phím, audio hoặc Tra từ. Không bắt buộc đổi sang bottom navigation nếu menu hiện tại làm được rõ ràng.

## 6. Phạm vi

Anti sửa src và script FE; ghi báo cáo Mốc2 vào `FE-REFINEMENT-STATUS.md`. Không sửa server/DB/.env hoặc các tài liệu Codex quản lý. Không mở thêm AI feature/giáo trình/payment trong mốc này.

## 7. Nghiệm thu thật

1. Login từ `/` → Today; logo → Today; BrowserBack không mắc redirect loop.
2. Deep link bộ/bài trước login → sau login vẫn về đúng nội dung.
3. Năm mục chính rõ ràng ở desktop/mobile; các chức năng cũ vẫn có lối vào, không bị xóa để giảm số mục.
4. Explore → category/path/set → học → Back/reload trả đúng filter và highlight Thư viện.
5. Today → phiên theo kế hoạch → đạt target → kết thúc ngày; và Lộ trình → bài → Back vẫn giữ chương đã chọn.
6. Mọi số liệu học lấy API thật; không reset profile/progress, không gọi AI tự động khi chỉ điều hướng.
7. Kiểm360/390/768/1440px; menu/dialog/CTA không che nhau; keyboard focus và accessible names còn hoạt động.
8. Build và hồi quy1B + daily-goal-guards qua. Test phải thử hành động/back/deep link, không chỉ đếm5 nhãn hoặc dò CSS class.

Codex sẽ kiểm bản hoàn tất trước khi chuyển sang biên tập khóa học Mốc3. Không coi Mốc2 tự động là toàn bộ web đã sẵn sàng bán.
