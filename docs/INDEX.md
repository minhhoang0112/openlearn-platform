# MỤC LỤC TÀI LIỆU PHÂN TÍCH TOÀN BỘ HỆ THỐNG OPENQUIZ.AI
### (Dành cho việc ghép nối Frontend và Codex lập trình Backend)

Tài liệu được phân tích chuyên sâu qua REA từ toàn bộ mã nguồn bundle 70+ chunks của OpenQuiz.ai:

1. [**01. Hệ Thống, Công Nghệ & Bản Đồ 72 Routes**](./01_HE_THONG_VA_KIEN_TRUC_OPENQUIZ.md):
   - Tổng quan, Stack công nghệ, Design system tokens (Tailwind + shadcn).
   - Bản đồ chi tiết toàn bộ 72 Routes trên toàn hệ thống (URL, vai trò, auth).

2. [**02. Lộ Trình Học & Chứng Chỉ Quốc Tế**](./02_LO_TRINH_HOC_VA_CHUNG_CHI.md):
   - Hệ thống khóa học chuẩn CEFR (A1, A2, B1, B2.1, B2.2, C1, C2).
   - Luyện thi IELTS Speaking (Band 4.5–7.5+), TOEIC 600 từ, HSK 1–6, TOPIK I–II, JLPT N5–N1.
   - Quy trình sư phạm bài học 7 bước chuẩn OpenQuiz.

3. [**03. Hệ Thống AI & Luyện Nói PronScore**](./03_HE_THONG_AI_VA_LUYEN_NOI.md):
   - Thuật toán chấm điểm PronScore 4 trụ cột (Accuracy, Fluency, Completeness, Prosody).
   - AI Conversation đàm thoại nhập vai ép từ vựng bắt buộc.
   - AI Grammar Coach phát hiện lỗi ngữ pháp tức thì và gợi ý câu chuẩn bản xứ.
   - Đọc hiểu tương tác chạm để tra từ (`VocabularyLookupDialog`).
   - Tự động sinh bộ từ bằng AI từ chủ đề hoặc văn bản.

4. [**04. Quản Lý Lớp Học LMS & Gamification**](./04_LMS_LOP_HOC_VA_GAMIFICATION.md):
   - Hệ thống LMS dành cho giáo viên và học sinh (tạo lớp, giao bài tập tự luận/ghi âm, chấm điểm).
   - Cơ chế Gamification: Streak chuỗi ngày học, thẻ đóng băng chuỗi (Streak Freeze v2), tiền xu (Coins), cửa hàng vật phẩm và mở rương Lootbox.

5. [**05. Thiết Kế Backend API & Database Schema (Dành riêng cho Codex)**](./05_THIET_KE_BACKEND_API_VA_DATABASE_CHO_CODEX.md):
   - Thiết kế lược đồ cơ sở dữ liệu (Database Schema) chi tiết từng bảng, trường dữ liệu, khóa ngoại.
   - Toàn bộ danh mục REST API endpoints (Auth, Sets, Words, SRS SM-2, AI Speaking, LMS, Shop).
   - Cổng thanh toán quét mã VietQR tự động qua SePay webhook.

