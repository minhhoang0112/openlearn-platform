# BÁO CÁO PHÂN TÍCH KỸ THUẬT TOÀN DIỆN OPENQUIZ.AI (PHẦN 1)
## KIẾN TRÚC HỆ THỐNG, CÔNG NGHỆ & BẢN ĐỒ 72 ROUTE

---

## 1. TỔNG QUAN HỆ THỐNG
OpenQuiz (https://openquiz.ai) là một nền tảng học ngoại ngữ thế hệ mới kết hợp giữa:
- **Flashcard & Spaced Repetition (SRS)** (tương tự Anki, Quizlet).
- **AI Conversation & Speaking Coach** (Luyện nói tương tác phản xạ có hỗ trợ AI).
- **PronScore Engine** (Hệ thống chấm điểm phát âm đa tiêu chí: Accuracy, Fluency, Completeness, Prosody).
- **Teacher LMS & Classroom** (Hệ thống quản lý lớp học, bài tập trắc nghiệm, bài tập tự luận và chấm bài của giáo viên).
- **Gamification & Shop** (Hệ thống streak chuỗi ngày học, đóng băng streak, tiền xu ảo, rương phần thưởng lootbox, bảng xếp hạng).
- **Lộ trình học theo khung chuẩn quốc tế**: CEFR (A1, A2, B1, B2.1, B2.2, C1, C2), IELTS Speaking, TOEIC, HSK, TOPIK, JLPT.

---

## 2. STACK CÔNG NGHỆ CHI TIẾT ĐƯỢC PHÂN TÍCH QUA REA

| Tầng hệ thống | Công nghệ sử dụng | Mục đích / Chi tiết |
| :--- | :--- | :--- |
| **Framework Frontend** | React 19 + TypeScript | SPA (Single Page Application) tối ưu hiệu năng cao |
| **Build Tool & Bundler** | Vite 6.x | Tách code động (Dynamic code splitting) thành hơn 70 chunk tối ưu |
| **Styling & Design System** | Tailwind CSS v3 + shadcn/ui | Thiết kế phẳng hiện đại, biến màu HSL, radius chuẩn `8px`, glassmorphism |
| **UI Components** | Radix UI primitives | Accordion, Dialog, Dropdown, Tabs, Tooltip, Sheet accessible |
| **Iconography** | Lucide React | Bộ biểu tượng vector nhất quán |
| **Biểu đồ & Thống kê** | Recharts (`vendor-charts`) | Biểu đồ tiến độ, độ lưu loát, phân tích điểm phát âm theo thời gian |
| **Âm thanh & Speech** | Web Speech API & ElevenLabs | Text-to-Speech phát âm bản xứ, Speech Recognition nhận diện giọng nói |
| **Chấm điểm phát âm** | Azure Speech / PronScore Algorithm | Chấm điểm âm vị (phoneme), trọng âm (syllable stress), ngữ điệu (prosody) |
| **Backend & Cơ sở dữ liệu** | Firebase (Auth + Firestore + Functions) | Xác thực Google/Apple, đồng bộ dữ liệu thời gian thực, lưu trữ học phần |
| **Thanh toán & Cổng nạp** | SePay (VietQR API) | Tạo mã QR chuyển khoản ngân hàng tự động kích hoạt gói Premium tức thì |
| **Đa ngôn ngữ (i18n)** | Custom i18n Dictionary | Hỗ trợ Tiếng Việt (VI), English (EN), Hàn (KO), Trung giản thể (ZH-CN), Trung phồn thể (ZH-TW) |

---

## 3. BẢN ĐỒ TOÀN BỘ 72 ROUTE TRÊN HỆ THỐNG

Dưới đây là danh sách đầy đủ 72 Route được phân tích trực tiếp từ mã nguồn bundle `index-B-PTL6ee.js`:

### 3.1. Nhóm Trang Chủ, Giới Thiệu & Tài Khoản (12 Routes)
1. `/` : Trang đích (Landing Page) khi chưa đăng nhập / Bảng tin học tập (LoggedInHome) khi đã đăng nhập.
2. `/onboarding-intro` : Hướng dẫn người dùng mới làm quen với phương pháp học của OpenQuiz.
3. `/onboarding-practice` : Bài kiểm tra thử phản xạ ban đầu để xác định trình độ người học.
4. `/pricing` : Bảng giá gói cá nhân ($7.98/tháng, $26.99/quý, $52.98/năm).
5. `/free-premium` : Chương trình nhận gói Premium miễn phí qua làm nhiệm vụ hoặc đánh giá.
6. `/gioi-thieu-nhan-premium` : Trang chia sẻ mã giới thiệu bạn bè nhận ngày học VIP.
7. `/invite-friends` : Trang quản lý lời mời bạn bè và hoa hồng/ngày thưởng.
8. `/profile` : Trang hồ sơ cá nhân của người dùng hiện tại (thông tin, mục tiêu, ngôn ngữ).
9. `/user/:userId` : Trang thông tin công khai của học viên khác (thành tích, bộ từ công khai).
10. `/ranking` : Bảng xếp hạng học viên theo điểm kinh nghiệm (XP), chuỗi ngày học (Streak).
11. `/get-app` : Hướng dẫn cài đặt Web App (PWA) trên iOS và Android.
12. `/tuyen-dung` : Trang thông tin tuyển dụng của công ty OpenQuiz.

### 3.2. Nhóm Học Từ Vựng & Quản Lý Học Phần (14 Routes)
13. `/study-set/:id` : Xem chi tiết một học phần từ vựng (danh sách từ, chế độ học, người tạo).
14. `/study-set/:id/progress` : Xem báo cáo chi tiết tiến độ học của bộ từ (từ đã thuộc, từ chưa thuộc, ngày cần ôn lại).
15. `/create-flashcard` : Giao diện tạo học phần từ vựng mới (nhập tay, paste danh sách, hoặc dùng AI tự sinh).
16. `/edit-flashcard/:id` : Chỉnh sửa học phần từ vựng đã tạo.
17. `/my-created` : Danh sách tất cả các bộ từ vựng do người dùng tự tạo.
18. `/studying-all` : Danh sách tất cả các bộ từ đang trong quá trình học.
19. `/recommended-all` : Khám phá tất cả các học phần được cộng đồng và ban biên tập đề xuất.
20. `/user-words` : Kho từ vựng tổng hợp của cá nhân (tất cả các từ đã lưu từ các bài đọc, hội thoại).
21. `/user-words-study` : Chế độ học gom tất cả các từ riêng lẻ của người dùng vào 1 phiên ôn tập.
22. `/learning-path/:id` : Chi tiết một lộ trình học có cấu trúc (gồm nhiều học phần liên kết).
23. `/learning-path/:id/all-words` : Danh sách tổng hợp toàn bộ từ vựng nằm trong lộ trình.
24. `/create-learning-path` : Dành cho giáo viên/biên tập viên tạo lộ trình học mới.
25. `/edit-learning-path/:id` : Chỉnh sửa lộ trình học.
26. `/search` : Tìm kiếm học phần, từ vựng, bài học, người dùng và khóa học.

### 3.3. Nhóm 8 Chế Độ Ôn Tập & Kiểm Tra (10 Routes)
27. `/study/:id` : Chế độ học Thẻ ghi nhớ (Flashcards) chuẩn với lật 3D, phát âm, xáo trộn.
28. `/quiz` : Chế độ làm bài trắc nghiệm nhanh 4 lựa chọn (nghĩa -> từ hoặc từ -> nghĩa).
29. `/writing-practice/:id` : Chế độ luyện viết chính tả (gõ từ theo định nghĩa và ngữ cảnh).
30. `/writing-practice/:id/print` : Tạo bản in bài tập luyện viết dạng PDF/Printable cho giáo viên in ra giấy.
31. `/dictation/:id` : Chế độ nghe chính tả (nghe audio phát âm bản xứ rồi gõ lại chính xác).
32. `/repetition-study` : Chế độ ôn tập theo thuật toán lặp lại ngắt quãng (Spaced Repetition).
33. `/repetition-study/:wsetId` : Ôn tập SRS cho một bộ từ cụ thể.
34. `/repetition-study/lp/:lpId` : Ôn tập SRS cho một lộ trình học cụ thể.
35. `/spaced-repetition` : Trang giải thích cơ chế khoa học của đường cong quên lãng Ebbinghaus & thuật toán SM-2.
36. `/game/:gameType/:id` : Chế độ trò chơi ghép thẻ từ vựng tính giờ đối kháng.
37. `/exam/:id` : Chế độ thi thử mô phỏng đề thi chuẩn (giới hạn thời gian, không hiển thị đáp án trước khi nộp).

### 3.4. Nhóm Khóa Học Khung Chuẩn & Luyện Thi (7 Routes)
38. `/courses` : Danh mục toàn bộ các khóa học chuẩn hóa CEFR (A1 đến C2) và chứng chỉ.
39. `/courses/:level/part/:partNum/lesson/:lessonNum` : Giao diện học bài học chi tiết trong khóa học (quy trình 7 bước).
40. `/comprehensive/:id` : Khóa học tổng thể toàn diện 4 kỹ năng.
41. `/comprehensive/:id/lesson/:lessonNum` : Bài học chi tiết trong khóa học tổng thể.
42. `/colab` : Khóa học hợp tác cùng chuyên gia, giáo viên có tiếng.
43. `/reading/:id` : Bài luyện đọc hiểu tương tác (chạm vào bất kỳ từ nào để tra từ điển tức thì).
44. `/reading-history` : Lịch sử các bài đọc đã hoàn thành và danh sách từ vựng đã thu thập được.

### 3.5. Nhóm AI Thông Minh & Luyện Nói (6 Routes)
45. `/ai-study/:id` : Phòng học thông minh nơi AI tự động nhận biết điểm yếu của học viên để tạo bài tập tương thích.
46. `/conversation/:id` : Phòng luyện nói hội thoại tương tác thời gian thực với AI đóng vai nhân vật.
47. `/conversation/:id/:threadId` : Cuộc hội thoại theo chủ đề nhánh cụ thể.
48. `/conversation-history/:id` : Lịch sử cuộc trò chuyện kèm theo nhận xét phân tích ngữ pháp và phát âm của AI.
49. `/speaking-history` : Nhật ký toàn bộ các bài nói đã thu âm, biểu đồ điểm PronScore qua các ngày.
50. `/grammar/:id` : Bài học ngữ pháp tương tác có AI phân tích cú pháp câu.
51. `/saved-grammar` : Sổ tay lưu các quy tắc ngữ pháp quan trọng cần ôn lại.

### 3.6. Nhóm Lớp Học Dành Cho Giáo Viên & Học Sinh (LMS - 10 Routes)
52. `/classes` : Bảng điều khiển danh sách các lớp học của giáo viên và học sinh.
53. `/create-class` : Giáo viên tạo lớp học mới, sinh mã tham gia lớp (`classSharedId`).
54. `/class/:classSharedId` : Trang tổng quan lớp học dành cho học sinh (xem thông báo, bài tập).
55. `/class/:id/manage` : Trang quản trị lớp học dành riêng cho giáo viên (quản lý học sinh, duyệt bài).
56. `/exercise-library` : Kho thư viện bài tập dùng chung của giáo viên.
57. `/class/:classSharedId/exercise/:exerciseId` : Chi tiết bài tập được giao trong lớp.
58. `/class/:classSharedId/exercise/:exerciseId/do` : Học sinh vào làm bài tập trắc nghiệm / điền khuyết.
59. `/class/:classSharedId/exercise/:exerciseId/essay` : Học sinh nộp bài tập tự luận (bài viết hoặc file ghi âm).
60. `/class/:id/exercise-management` : Giáo viên chấm điểm và để lại lời phê cho học sinh.
61. `/user-feedback` : Kênh gửi ý kiến đóng góp và báo lỗi bài học.

### 3.7. Nhóm Gamification & Shop Tiền Ảo (2 Routes)
62. `/shop` : Cửa hàng vật phẩm (đổi tiền xu lấy lượt đóng băng chuỗi Streak Freeze, mua avatar độc quyền, mở rương Lootbox).

### 3.8. Nhóm Cộng Đồng & Diễn Đàn Thảo Luận (2 Routes)
63. `/discussion` : Diễn đàn học tập cộng đồng (chia sẻ kinh nghiệm thi cử, hỏi đáp bài tập).
64. `/discussion/:slug` : Chi tiết bài viết thảo luận, bình luận và bình chọn hữu ích (Upvote).

### 3.9. Nhóm Thanh Toán Tự Động (4 Routes)
65. `/payment-qr/:packageType` : Giao diện thanh toán quét mã VietQR tự động qua SePay.
66. `/payment-qr-group/:planType/:groupSize` : Giao diện thanh toán gói nhóm (mua chung giảm giá).
67. `/payment-success` : Trang thông báo thanh toán thành công và nâng cấp tài khoản VIP.
68. `/payment-cancel` : Trang xử lý khi giao dịch bị hủy hoặc quá thời gian thanh toán.

### 3.10. Nhóm Quản Trị Hệ Thống (Admin - 4 Routes)
69. `/admin` : Bảng điều khiển quản trị viên hệ thống.
70. `/admin/recommended-paths` : Quản lý các lộ trình học được gắn nhãn khuyên dùng trên trang chủ.
71. `/admin-ads` : Quản lý chiến dịch quảng cáo và đối tác tài trợ trên web.
72. `/admin-app-ads` : Quản lý phân phối quảng cáo trên ứng dụng di động.

