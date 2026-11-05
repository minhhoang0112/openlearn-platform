# Khóa học có hướng dẫn — V2

## Phạm vi

Thêm **Khóa học** ở thanh điều hướng, độc lập với `/my-program` (Lộ trình) và `/my-created` (Thư viện). Luồng mới nằm tại `/courses`, bài tại `/courses/:courseId/lesson/:lessonId?guided=1`.

**A1 có đủ 30 bài trong 6 phần**, dùng nội dung Anh–Việt tự soạn đã có, thêm 4 từ/cụm từ đúng chủ đề cho mỗi bài. Không tự sinh nội dung bằng AI. A2/TOEIC dùng phiên bản trước; `/courses?legacy=1` và URL bài cũ vẫn hoạt động. Không xóa giáo trình khác hoặc lịch sử.

## Đối chiếu và phát hiện

- Ảnh người dùng cho thấy bản đồ bài theo phần, hoạt động trong mỗi bài, tiến độ tổng / hoạt động riêng, ghi âm và nghe lại. Đây là quan sát giao diện, không chứng minh thuật toán chấm hoặc mở khóa ở backend gốc.
- REA kiểm tra công khai `/courses` ngày 03/11/2026: bị chuyển về landing khi không đăng nhập. Evidence `ev_9f9521ee137f075bc7ed488d668dfb465d3f8b3191bac8ef927c11eef6b06737`. Không có trang gốc ở CDP 9222; không đọc được khóa học sau đăng nhập và không tuyên bố sao chép logic gốc 100%.
- Tham khảo bài ngắn, thực hành xen kẽ và ôn lỗi: [Duolingo về đường học](https://blog.duolingo.com/new-duolingo-home-screen-design/), [ôn cách quãng](https://blog.duolingo.com/spaced-repetition-for-learning/). Đây là thiết kế riêng, không phải thuật toán nội bộ của họ.
- Bản cũ: hoạt động trong modal dẫn ra bài luyện cả bộ từ liên quan; nghe/nhắc mẫu câu xen kẽ máy móc; quiz dài hiện cùng lúc; quiz sai vẫn có `completed_at`; mọi bài đều mở; sidebar gộp Khóa học vào Lộ trình.

## Bảy nhóm hoạt động

1. Làm quen: mục tiêu và 4 từ/cụm từ có nghĩa, nghe mẫu.
2. Nhận biết từ: mỗi lần một câu chọn nghĩa.
3. Nghe và nhớ: nghe TTS rồi nhập câu.
4. Xếp câu: dùng từng ô từ một lần, ô trùng từ có ID riêng.
5. Luyện nói: nghe, ghi âm, nghe lại bản ghi cục bộ, nhận dạng hoặc nhập câu đã nói; có lựa chọn chưa tiện nói.
6. Vận dụng: chọn câu diễn đạt ý tiếng Việt trong bài.
7. Ôn tập: câu hỏi của chính bài và mẫu câu từ tối đa hai bài trước đã hoàn thành.

Vận dụng là bài có đáp án biên soạn sẵn, không phải hội thoại AI tự do. Giao tiếp AI vẫn là mục riêng. Ôn bài trước không thay hàng đợi SRS toàn web và không tự đánh dấu từ ngoài bài đã thành thạo.

## Quy tắc backend

- `guided_course_v2` lưu trong bảng `course_learning_sessions`, tách bằng trường engine. Giữ schema SQLite 15 và dữ liệu legacy.
- Lưu bước, nhận xét, hàng đợi ôn và revision ở server. Reload sau Kiểm tra giữ nguyên nhận xét. Nội dung ô đang gõ chưa gửi chưa được lưu; UI nói rõ lưu sau Kiểm tra / Tiếp tục.
- Câu sai hiện đáp án/giải thích rồi quay lại cuối hoạt động khi bấm Tiếp tục. Phải trả lời đúng trong lượt sau mới hoàn tất. Luồng mới không có trạng thái 0 điểm nhưng vẫn mở bài kế tiếp.
- Hết nhiệm vụ bắt buộc và ôn xong lỗi mới ghi `course_progress`. Điểm ghi là mức hoàn thành sau ôn; UI hiển thị riêng số đúng ngay lần đầu. Bỏ qua nói được ghi rõ, không tạo điểm phát âm.
- Mở bài theo thứ tự. Kết quả cũ đạt ít nhất 80% trước khi vào chế độ mới được giữ. Kết quả legacy ghi sau khi vào V2 không dùng để vượt điều kiện mới. Có thể ôn lại bài hoàn thành.
- Revision chặn thao tác cũ / gửi trùng; đọc lại session hoàn tất không ghi điểm lại. Đổi nội dung tạo lượt mới, không xóa lượt cũ.
- Không trả đáp án / giải thích tương lai. TTS câu nghe vẫn nhận văn bản ở client, không được xem là bí mật hoặc cơ chế chống gian lận.
- Server kiểm tra chủ session, quyền truy cập khóa và điều kiện mở bài.

## Âm thanh

Nghe mẫu dùng TTS trình duyệt. Bản ghi là Blob tạm trên thiết bị; rời bước sẽ đóng mic và thu hồi URL. Web Speech Recognition có thể cần dịch vụ mạng của trình duyệt. Khớp nội dung nhận dạng **không phải** chấm âm vị, độ lưu loát hay trọng âm. Không tạo điểm 98% hoặc biểu đồ phát âm giả.

**Nhận xét phát âm AI** là thao tác riêng, tùy chọn: gửi bản ghi thực tối đa 440 KB tới Gemini khi người học bấm nút. Model trả transcript, nhận xét và gợi ý bằng tiếng Việt. Chỉ lưu văn bản nhận xét và hash của bản ghi vào session riêng; không lưu audio. Cùng bản ghi / cùng bước được dùng lại kết quả, yêu cầu đồng thời được gộp. Chuyển bước trong lúc model chạy không cho kết quả cũ ghi đè trạng thái mới. Nhận xét không tự đánh dấu hoàn thành hay tăng điểm. Không có gọi AI tự động khi mở bài, nghe mẫu hoặc kiểm tra bài tập.

## Kiểm tra

```sh
npm run build
node --test server/tests/guided-courses.test.mjs
node scripts/verify-guided-courses-browser.mjs
```

Chrome dùng tài khoản giả, mic giả và transcript mô phỏng. Playback là bản ghi MediaRecorder từ thiết bị giả; chưa nghiệm thu mic / loa vật lý hoặc nhận dạng người học. Không gọi Gemini. Báo cáo: `guided-courses-browser-validation.json`.

Contract 1.25.0, schema 15, 181 HTTP routes. `API-ROUTES.md` và `openapi.json` được xuất lại từ server.

Kết quả 03/11/2026: build đạt; toàn bộ 156 kiểm thử BE đạt; 5 nhóm Chrome đạt, không có lỗi trang. Kiểm thử hợp đồng nhận xét audio dùng provider giả, xác nhận gộp yêu cầu, dùng lại nhận xét, giữ quyền riêng tư và không đổi điểm học. Chưa gọi Gemini thật hoặc nghiệm thu mic / loa vật lý trong đợt này.
