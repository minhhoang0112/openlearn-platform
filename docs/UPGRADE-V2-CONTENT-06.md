# CONTENT-06 — số lượng, thói quen và hỏi lại

21/10/2026. Contract **1.9.5**, schema **10**, **128 route**. API/renderer không đổi; giữ bài, phiên và dữ liệu cũ.

| Lesson id | Bài | Mục tiêu |
| --- | --- | --- |
| `foundation-quantities-01` | Nói số lượng và đồ vật cần dùng | a/an, số ít/số nhiều, there is/are, a bottle of water |
| `foundation-frequency-01` | Hỏi tần suất và kể thói quen | How often, twice a week, I study/She studies, does not study |
| `foundation-clarification-01` | Nhờ nói lại và làm rõ điều chưa hiểu | Could you…?, Can I…?, xin nói chậm/nhắc lại/viết vào chat |

Mỗi bài tám bước, có ba câu nghe/đọc/ngữ pháp chấm thật. Bài đọc dùng thông tin khác bài nghe để người học phải đọc đúng người/số lượng/tần suất. Có gợi ý phát âm, nhiệm vụ nói và viết với rubric, lưu bản gốc; tự luyện không biến thành điểm phát âm. AI nhận xét chỉ chạy khi người học yêu cầu qua chức năng hiện có.

Ba bài nằm ở vị trí 13–15 trong chương trình nền tảng, sau ôn chặng 2; prerequisites là gợi ý, không khóa quyền học. Tổng **20 mục**: nền tảng 16 (14 bài thường, 2 ôn chặng) và IT/System 4 bài thường. Đã có 18 bài thường/2 ôn; còn **6 bài thường và 1 ôn chặng** so với mục tiêu 24/3. Khóa chưa đổi trạng thái pilot thành hoàn chỉnh.

Thêm ba WAV nguyên bài và 18 clip từng câu; thư viện nghe tổng **20 học liệu/116 clip**. Nội dung tự biên soạn, audio Windows Microsoft David Desktop TTS lưu local; không cần gọi Gemini để tạo bài. Không gán timestamp giả cho audio nguyên bài. Chất lượng giọng đọc chưa được duyệt bằng tai người.

## Anti tiếp nhận

Không cần tạo màn mới. Danh mục, Today và player lấy dữ liệu động; không hardcode số bài/bước/clip. Kiểm cả ba bài trong LessonRunView: instruction/prompt nhiều dòng, thì của câu mẫu, thông tin bài đọc độc lập với bài nghe, phản hồi câu sai dẫn tới Sổ lỗi và evidence bài viết không bị sửa. Vẫn giữ nhánh IT/System tự chọn; CONTENT-06 thuộc nền tảng chung.

Phần giao diện mới được build cùng FE hiện tại, không sửa src/** ở lượt BE này. Kiểm Chrome 14 ca trong CONTENT-05 là kết quả trước đó trên danh mục 17 mục, không ghi thành đã kiểm ba bài mới bằng Chrome. Anti nghiệm thu giao diện CONTENT-06 và cập nhật STATUS khi xong.

## Kiểm chứng

**68 test toàn BE đạt**, build FE thành công. Test mới hoàn tất ba bài, cố tình trả lời sai cấu trúc số nhiều để kiểm Sổ lỗi, draft/reload giữ bài viết, evidence trả đúng text gốc, thống kê đọc lấy kết quả chấm thật. Hồi quy xác nhận daily plan, content version, privacy và 116 clip thật vẫn hoạt động. Không gọi AI thật, không thay model/key/schema.
