# Mốc 3 — Chất lượng khóa nền tảng

Trạng thái26/10/2026: **đợt1 đã triển khai cho4 bài nền tảng đầu, cả BE và FE**. Đọc `REFINEMENT-M3-SUPPORT-API.md` để biết phạm vi/hợp đồng/kiểm thử. Chưa mở rộng toàn bộ giáo trình; không giao Anti tiếp tục đổi bố cục/sidebar trong mốc này.

## Mục tiêu

Người mất gốc hiểu đang học gì, có kiến thức trước khi bị hỏi, có mẫu/dịch và biết vì sao sai. Không mở rộng số lượng tính năng hoặc quảng bá đủ trình độ/chứng chỉ khi chưa có kiểm chứng.

## Thứ tự thực hiện

1. Codex kiểm4 bài nền tảng đầu: giới thiệu bản thân, giờ giấc, nhờ giúp đỡ và một ngày học tập. Kiểm mục tiêu, từ/cụm, ngữ pháp, câu hỏi, đáp án, giải thích và bản dịch cùng ngữ cảnh.
2. Hoàn thiện một gói hỗ trợ học mẫu: từ/cụm có nghĩa theo câu; phân biệt từ loại cần dùng; ghi chú ngữ pháp ngắn bằng tiếng Việt; câu mẫu và bản dịch; lỗi thường gặp và hướng dẫn tự luyện nói/viết.
3. Chốt hợp đồng dữ liệu bổ sung rồi mới giao Anti hiển thị panel hỗ trợ gọn. Không yêu cầu Anti tự bịa dữ liệu để lấp màn hình.
4. Nghiệm thu gói mẫu trên người học thật, sau đó mở rộng các bài nền tảng còn lại. IT/System vẫn là nhánh riêng, không bắt mọi người học theo chuyên ngành chủ dự án.

## Bảo toàn

- Giữ ID nội dung, progress, bản nháp, các phiên đã pin version; không reset hoặc đổi đáp án của bài đã nộp.
- Không tự xuất bản hàng loạt version mới khiến người học phải làm lại khóa chỉ vì thêm ghi chú. Phần hỗ trợ phải gắn rõ lesson_id/content_version và có thiết kế tương thích trước khi đưa vào API.
- Không ghi đè ví dụ/dịch do người dùng tự viết. Giữ riêng nội dung sẵn, nội dung cá nhân và kết quả AI.
- Học thường ngày không yêu cầu AI. AI là mở rộng do người học chủ động chọn; không xoay key để né hạn mức.
- Nghe/nói tự luyện không được gắn điểm phát âm hoặc mức CEFR giả. Audio TTS giữ nhãn nguồn và tình trạng chưa được người nghe thẩm định khi chưa thực sự kiểm.

## Phân công

- Codex: inventory và rà logic/nội dung; chuẩn bị dữ liệu hỗ trợ, API bổ sung nếu cần, kiểm thử bảo toàn phiên và quyền tài khoản; tài liệu hợp đồng.
- Anti: chỉ triển khai phần trình bày sau khi có hợp đồng và dữ liệu mẫu được đánh dấu sẵn sàng. Trong lúc đợi có thể rà thủ công Mốc2 trên mobile, không mở thêm feature.

## Điều kiện nghiệm thu

- Trước câu hỏi có đủ kiến thức hoặc nội dung mẫu cần thiết; ví dụ/dịch cùng nghĩa và mức khó với bài.
- Giải thích lỗi cho người mới hiểu, không chỉ báo đúng/sai hoặc nhắc mã kỹ thuật.
- Nghe, đọc, nói, viết có nhiệm vụ thật và ranh giới đánh giá rõ; không ép dùng mọi phương pháp trong một ngày.
- Reload/Back và phiên cũ còn nguyên. Không làm phát sinh lượt AI khi chỉ mở kiến thức hỗ trợ.
- Sau buổi học, người học chỉ ra được đã học gì, cần ôn gì và lần sau học tiếp đâu.
