# CONTENT-05 — nhánh IT/System mở rộng

21/10/2026. Contract **1.9.4**, schema **10**, **128 route**. Chỉ thêm nội dung; không đổi API/schema, không reset dữ liệu hoặc gọi Gemini.

| Lesson id | Bài | Nội dung ngôn ngữ |
| --- | --- | --- |
| `system-files-01` | Hướng dẫn thao tác với tệp | Open/Create/Save, First/Then, Do not + nguyên mẫu |
| `system-service-status-01` | Hỏi và mô tả trạng thái dịch vụ | Is/are, running/connected, hỏi và báo điều quan sát được |
| `system-incident-handoff-01` | Báo sự cố và bàn giao ngắn | Việc đã làm, trạng thái hiện tại, bước theo dõi và người nhận |

Ba bài ở vị trí 1–3 của `english-it-system`, sau bài giới thiệu. Mỗi bài tám bước: nghe, cụm từ, ngữ pháp, đọc tình huống mới, phát âm tự luyện, nói, viết, reflection. Nghe/ngữ pháp/đọc được chấm trên BE; nói/viết lưu bản gốc, tự đối chiếu rubric, có thể chủ động yêu cầu AI nhận xét qua API đã có. Không suy ra điểm phát âm hoặc trình độ từ việc hoàn tất.

Tình huống dịch vụ/tệp là bài luyện giao tiếp giả định, không thực thi lệnh trên máy. Bài dạy báo rõ bằng chứng và điều chưa biết; không tự thêm nguyên nhân sự cố. Audio và câu hỏi không phụ thuộc API AI.

Tổng **17 mục học**: nền tảng 13 (11 bài thường + 2 ôn chặng), IT/System 4 bài thường. Đã có 15 bài thường/2 ôn, mục tiêu 24 bài thường/3 ôn còn chưa hoàn tất. Thư viện nghe **17 học liệu/98 clip**, gồm ba WAV nguyên bài và 18 clip mới. Nguồn Windows Microsoft David Desktop TTS; clip tổng hợp riêng, chưa duyệt chất lượng bằng tai người.

## Anti tiếp nhận

- Dùng chương trình `english-it-system` và lesson metadata để render, không thêm menu riêng cho từng bài. Các type bước đã có, không cần màn mới.
- Giữ nền tảng là lựa chọn mặc định cho mọi người. Khóa chuyên ngành là nhánh tự chọn; không đổi focus thành system chỉ vì mở bài. General không tự nhận bài chuyên ngành mới trong Today. Một phiên chuyên ngành do người học tự mở vẫn có thể tiếp tục theo cơ chế resume hiện có.
- Lịch daily plan giữ nguyên snapshot trong ngày. Chọn focus system không thay kế hoạch đã lưu ngay lập tức; nền tảng được ưu tiên trước nhánh chuyên ngành khi giao bài mới. Người học có thể tự chọn bài IT/System từ lộ trình/thư viện.
- Danh mục nghe tự có thêm ba bài; không hardcode 14/80 hoặc 17/98 trong logic. Kiểm nhãn chương trình, instruction nhiều dòng, bài đọc và kết quả của cả ba bài. Không đổi server/.env.

## Nghiệm thu cleanup thu âm

Sau bản sửa của Anti, đã build FE và chạy **14 kiểm tra Chrome thật** trên DB tạm, danh mục 17 mục. Giữ các kiểm tra checkbox/retry mất response/history/resume. Thêm micro giả của Chrome: thu → dừng tạo một URL nghe lại và dừng toàn bộ tracks; thu tiếp → thoát bằng router dừng tracks, thu hồi URL trước đó, không tạo URL mới sau unmount. `v2-browser-listening-audit.json` passed true, không pageerror/BE500, fe_followups rỗng trong phạm vi kiểm tra này.

Đây là kiểm vòng đời tài nguyên ở ListeningPracticeView; không thay cho kiểm micro vật lý, chất lượng giọng đọc/phát âm hoặc kiểm thu âm trong mọi màn. Sửa cleanup ở LessonRunView được Anti ghi nhận riêng, chưa có bài thử micro giả riêng cho màn đó.

## Kiểm BE

**15 test liên quan đạt**: ba bài chuyên ngành chạy hết, chấm ba câu thật mỗi bài, evidence giữ bài viết, danh mục/tổng tiến độ đúng, tách khỏi chương trình nền tảng, default Today không tự chọn chuyên ngành, seed/version/resume và toàn bộ 98 clip sẵn sàng. Không chạy lại toàn suite; 66 test ở CONTENT-04 là kết quả lịch sử, không ghi thành 67 test vừa chạy.
