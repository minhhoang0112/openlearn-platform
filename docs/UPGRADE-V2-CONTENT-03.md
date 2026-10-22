# CONTENT-03 — từ sinh hoạt sang quá khứ và kế hoạch

21/10/2026. Contract **1.9.1**, schema **10**, **128 route**. Chỉ thêm học liệu, không đổi endpoint/payload hoặc schema. Giữ phiên và kết quả cũ; không cần migrate/reset tài khoản.

## Nội dung phát hành

| Lesson id | Bài | Vị trí |
| --- | --- | --- |
| `foundation-yesterday-01` | Kể việc đã làm hôm qua — studied/finished/called, did not + nguyên mẫu | 8 |
| `foundation-past-questions-01` | Hỏi về một chuyến đi đã qua — went/had, Did you go…? | 9 |
| `foundation-plans-01` | Nói kế hoạch sắp tới — am/is/are going to + nguyên mẫu | 10 |

Ba bài nằm sau ôn chặng đầu, mỗi bài tám bước và ba câu chấm được (nghe/ngữ pháp/đọc). Đoạn đọc dùng tình huống khác đoạn nghe để tránh nhớ đáp án thay vì đọc. Nói/viết lưu bài gốc và tự đối chiếu rubric; người học có thể chủ động yêu cầu AI nhận xét theo API đã có. Tự luyện phát âm chưa có điểm AI.

Tổng hiện tại **12 mục**: nền tảng 11 (10 bài thường + 1 ôn chặng), IT/System 1. Chưa phải hoàn tất mục tiêu 24 bài thường và 3 checkpoint.

Nguồn local_authored; audio Windows Microsoft David Desktop TTS, có 3 WAV nguyên bài mới và 18 WAV từng câu mới. Thư viện nghe tổng **12 học liệu/68 clip**. Transcript và bản dịch nguyên đoạn có thật; clip tổng hợp riêng, không gán timestamp vào audio nguyên bài. Chưa đánh giá chất lượng bằng tai người.

## Anti tiếp nhận

- Dùng GET /learning/programs và /learning/programs/english-foundation; không hardcode số bài hoặc bước. Không cần tạo màn mới cho CONTENT-03. Renderer choice/reading_comprehension/text/self_reflection hiện có dùng được.
- Hiển thị instruction/prompt nhiều dòng, rubric và phản hồi sau nộp. Phát âm là tự luyện; summary.mastered=false không có nghĩa bài bị khóa.
- Thư viện `/learning/listening` tự có thêm ba mục. Tiếp tục **FE-LISTEN** theo [hợp đồng nghe](UPGRADE-V2-LISTENING.md): player, tốc độ/lặp, tự xác nhận/skip, lịch sử/resume, thu âm local tùy chọn. Những con số 9 học liệu/50 clip trong bản bàn giao đầu là lịch sử; luôn đọc danh mục thực tế.
- Giữ các chức năng cũ và dữ liệu người học. Không gọi Gemini để dựng lại bài đã có; không sửa server/.env để hiển thị bài mới.

## Kiểm chứng

Test foundation-next.test.mjs chạy hoàn tất ba bài bằng API, nộp sai có chủ ý một câu ngữ pháp để kiểm Sổ lỗi; kiểm chấm nghe/đọc đúng tình huống, draft qua reload, đọc lại bài viết gốc, tổng tiến độ và clip từng câu sẵn sàng. Không cần AI. Bộ test hồi quy cũng kiểm seed không ghi đè bài/phiên bản và tiến độ cũ. Nghiệm thu giao diện các bài mới vẫn thuộc Anti.
