# CONTENT-07 — đủ bộ nội dung phiên bản đầu

> Chốt sau bàn giao FE: Anti đã ghi nghiệm thu CONTENT-07. Codex build lại FE và kiểm Chrome **9 ca đạt**, bổ sung xác nhận tiêu đề kết quả ôn đúng tên bài và Subject/body email có xuống dòng thực tế. Không pageerror/BE500/request AI. Contract vẫn1.10.0; không đổi BE nên không chạy lại toàn suite70test. Các con số8ca phía dưới ghi nhận trước bản sửa FE cuối.

21/10/2026. Contract **1.10.0**, schema **10**, **128 route**. Không thay endpoint, schema, model/key hoặc dữ liệu cũ. Không sửa src/** trong lượt BE này.

## Đã có trên BE

| Lesson id | Bài | Nhánh | Bước |
| --- | --- | --- | --- |
| `foundation-directions-01` | Hỏi đường và hướng dẫn đến nơi hẹn | Nền tảng | 8 |
| `foundation-arrangements-01` | Mời và xác nhận lịch hẹn | Nền tảng | 8 |
| `system-hardware-01` | Mô tả máy tính và so sánh đơn giản | IT/System | 8 |
| `system-check-results-01` | Đọc kết quả kiểm tra và báo điều chưa biết | IT/System | 8 |
| `system-incident-questions-01` | Hỏi thông tin để làm rõ sự cố | IT/System | 8 |
| `system-handoff-email-01` | Viết cập nhật và bàn giao qua email | IT/System | 8 |
| `system-checkpoint-03` | Ôn chặng IT/System: kiểm tra và bàn giao | IT/System | 9 |

Tổng **24 bài thường + 3 ôn chặng = 27 mục học**. Nền tảng: 16 bài thường/2 ôn, tổng18; IT/System: 8 bài thường/1 ôn, tổng9. Đây là đủ số lượng biên soạn cho phiên bản đầu; chất lượng audio chưa được người thật duyệt nên API vẫn giữ nhãn pilot. Không quy đổi độ bao phủ sang trình độ/điểm chứng chỉ.

Danh mục đầy đủ: [LEARNING-CURRICULUM.md](LEARNING-CURRICULUM.md), bản máy đọc learning-curriculum-inventory.json. Sinh bằng scripts/export-learning-curriculum.mjs từ nguồn BE, không chứa đáp án. Có kiểm prerequisite tồn tại/không vòng lặp.

Có thêm 7 WAV nguyên bài và 42 clip từng câu; tổng **27 học liệu/158 clip**. Nguồn local_authored, audio Windows Microsoft David Desktop TTS. Transcript/dịch nguyên đoạn lưu sẵn; clip tổng hợp riêng, không gán timestamp giả. Không gọi Gemini để dựng nội dung này.

## Chấm và lưu kết quả

Sáu bài thường có ba câu nghe/đọc/ngữ pháp chấm trên BE. Bài ôn có sáu câu chấm; cần ít nhất bốn câu đúng độc lập. Câu đúng có trợ giúp vẫn được phản hồi đúng nhưng không tăng số nhớ độc lập. Nói/viết là tự luyện với rubric, lưu bài gốc và có nhận xét AI khi người học chủ động yêu cầu. Chưa chấm phát âm audio trong V2.

Ôn chuyên ngành có gợi ý đúng bài cần ôn: kết quả kiểm tra, câu hỏi sự cố, so sánh máy, email/bàn giao. Kết quả các phiên trước giữ nguyên khi luyện lại. Nhánh IT/System vẫn tự chọn, focus mặc định general không đổi chỉ vì mở bài chuyên ngành.

## Anti tiếp nhận

1. Không tạo màn mới hoặc đổi BE. Dùng renderer hiện có, count/lesson_kind/summary.checkpoint động. Không hardcode foundation-checkpoint-01/02 hoặc số bước.
2. Kiểm sáu bài mới: instruction/prompt nhiều dòng, đoạn đọc khác bài nghe, lưu nháp, phản hồi, bài viết gốc trong evidence. Bài system-handoff-email-01 có model nhiều dòng kèm Subject.
3. Kiểm ôn system-checkpoint-03 ở danh mục IT/System: trạng thái đạt/chưa đạt, số câu đúng độc lập và nút ôn bài gợi ý. Không coi completed là passed; không coi ôn chặng này là bài kiểm tra chứng chỉ.
4. Thư viện nghe tự có27/158, phân loại18mục nền tảng/9mục chuyên ngành. Today giữ snapshot trong ngày và cơ chế resume; không đổi focus hoặc reset kế hoạch để ép hiện bài mới.
5. Nghiệm thu lượt này theo danh mục đầy đủ thay vì phát sinh thêm số lượng bài. Ghi CONTENT-07 vào STATUS sau kiểm; cần nghe duyệt chất lượng giọng đọc/nội dung bằng người thật trước khi coi là học liệu đã duyệt.

## Kiểm chứng thực tế

- **70 test toàn BE đạt**, bao gồm chạy hết bảy mục mới, câu sai vào Sổ lỗi, bài viết/evidence, độ đúng độc lập, gợi ý ôn và 158 clip thực. Tài khoản/DB kiểm thử tách riêng, không gọi AI thật.
- Build FE thành công; cảnh báo bundle lớn có sẵn vẫn còn, không phải lỗi build.
- **8 kiểm tra Chrome xuyên suốt đạt**, gồm bài ôn mới system-checkpoint-03 đủ chín bước trên giao diện, bài đọc tám bước, câu sai → Sổ lỗi → ôn, reload draft và lịch sử bài nộp. Báo cáo v2-browser-integration.json có checkpoint_lesson_id và ảnh anti-reference/local-v2-checkpoint.png. Không có pageerror/BE500 hoặc request AI. Sáu bài thường mới được kiểm qua API; Anti kiểm thêm trình bày từng bài.
- Kiểm micro giả Chrome ở màn nghe đã đạt trong đợt trước; micro vật lý/chất lượng audio và micro giả riêng cho LessonRunView chưa được kiểm trong lượt này.

Sau mốc nội dung này, các phần còn lại thuộc nghiệm thu thực tế, phát âm audio V2 và các tính năng mở rộng đã hoãn (ví dụ thư viện video). Đủ số bài không xác nhận các phần đó đã hoàn tất.
