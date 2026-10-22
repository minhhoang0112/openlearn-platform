# CONTENT-04 — việc đang diễn ra và ôn chặng thời gian

> Cập nhật sau: CONTENT-05 đã kiểm cleanup ListeningPracticeView bằng micro giả Chrome, tracks/URL đều được dọn khi rời màn. Ghi nhận cleanup còn thiếu phía dưới là lịch sử. Danh mục mới 17 mục/98 clip, xem UPGRADE-V2-CONTENT-05.md.

21/10/2026. Contract **1.9.3**, schema **10**, **128 route**. Không đổi API hoặc schema; giữ nội dung/phiên/tiến độ cũ.

| Lesson id | Nội dung | Bước |
| --- | --- | --- |
| `foundation-now-01` | Am/is/are + V-ing; phân biệt thói quen và việc đang diễn ra | 8 |
| `foundation-checkpoint-02` | Ôn hôm qua/bây giờ/ngày mai: nghe, đọc, cấu trúc, nói, viết | 9 |

Hai mục nằm sau ba bài CONTENT-03. Tổng **14 mục học**: nền tảng 13 (11 bài thường, 2 ôn chặng) và IT/System 1 bài thường. Mục tiêu 24 bài thường + 3 ôn chặng chưa hoàn tất; hiện có 12 bài thường + 2 ôn chặng.

Có hai WAV nguyên bài và 12 clip từng câu mới, nguồn Windows Microsoft David Desktop TTS. Thư viện nghe tổng **14 học liệu/80 clip**, không gọi Gemini để tạo bài. Transcript/dịch nguyên đoạn lưu sẵn; chưa duyệt chất lượng giọng đọc bằng tai người.

Ôn chặng có sáu câu được BE chấm, cần tối thiểu bốn câu đúng độc lập. Câu đúng có trợ giúp không tính thành nhớ độc lập. Nói/viết là tự luyện với rubric, giữ bài nộp gốc và có thể yêu cầu nhận xét AI riêng như API hiện có. Kết quả completed không đồng nghĩa passed hoặc chứng chỉ trình độ. Câu sai/gợi ý ôn trỏ về đúng bài yesterday/past-questions/plans/now; không khóa bài tiếp theo.

## Anti tiếp nhận

Không cần màn mới: renderer hiện có dùng lesson_kind/summary.checkpoint, không hardcode id checkpoint-01 hoặc tổng bước. Danh mục, Today và thư viện nghe tự nhận nội dung mới từ API; đọc số lượng động. Kiểm hiển thị kết quả checkpoint-02 và nút ôn bài gợi ý. Không reset dữ liệu, không đổi server/.env.

## Kiểm lại FE-LISTEN-02

Đã build FE và chạy Chrome thật trên DB tạm: **12 kiểm tra đạt**, không pageerror/BE500. Kiểm checkbox false ở câu đầu/câu mới/reload; không cho lưu trước xác nhận; cố tình làm mất response sau BE commit, retry giữ nguyên payload/UUID và chỉ ghi một lần; history/resume/reload đúng câu. Báo cáo v2-browser-listening-audit.json, fe_followups rỗng trong phạm vi các kiểm tra này. Thử Chrome diễn ra trước khi bổ sung hai học liệu mới; kiểm audio/danh mục 14 mục được thực hiện trong test BE sau đó.

Đọc code xác nhận Anti đã thêm xử lý lỗi audio, khóa Lưu/Bỏ qua khi ghi âm, dừng tracks và tách type history. Chưa thử micro vật lý hoặc toàn bộ trường hợp lỗi quyền. **Còn một điểm cleanup cần Anti chỉnh:** recorder.onstop vẫn tạo ObjectURL và set state cả sau unmount; effect unmount chưa revoke recordedAudioUrl hiện có (effect theo sentence id chỉ chạy lúc đổi câu, không phải cleanup). Dùng ref giữ URL hiện tại, revoke khi rời màn/đổi câu, và guard onstop bằng isMountedRef trước khi tạo URL hoặc set state. Dừng tracks vẫn phải chạy dù đã unmount. Không đánh đồng việc không có lỗi trang trong bài test với đã kiểm hết micro.

## Kiểm chứng BE

66 kiểm thử toàn BE đạt sau CONTENT-04, gồm bài mới hoàn tất, chấm nghe/đọc/ngữ pháp, phân biệt assisted pass, gợi ý ôn khi chưa đạt, Sổ lỗi, bài viết gốc, 80 clip thật và regression phiên bản cũ. Không gọi AI thật. API đang chạy contract 1.9.3.
