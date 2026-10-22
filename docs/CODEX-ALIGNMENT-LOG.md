# Bàn giao & Đối chiếu kỹ thuật giữa Anti (FE) và Codex (BE)
*Thời gian cập nhật: 21/10/2026*

Tài liệu này ghi chú chi tiết về kiến trúc Frontend mới tái dựng theo chuẩn 100% hai ảnh giao diện thực tế mà người học cung cấp, nhằm giúp Codex dễ dàng theo dõi, đọc hiểu và tiếp tục hoàn thiện logic BE khi có token.

---

## 1. Màn hình 1 — Lộ trình khoá học & Modal 7 hoạt động (Image 1)
- **Tệp nguồn FE**: [`src/views/CoursesView.tsx`](file:///d:/Project/openquiz/src/views/CoursesView.tsx)
- **Ảnh tham chiếu**: `media_1792555026519_6f38b26b.png`

### Chi tiết đã dựng:
1. **Header Breadcrumb dạng Pill đôi**:
   - Nút 1: `🇬🇧 Tiếng Anh >` (Dropdown chọn ngôn ngữ Anh, Trung, Nhật, Hàn).
   - Nút 2: `A1 - Nhập môn >` (Dropdown đổi nhanh cấp độ: A1, A2, TOEIC...).
   - Hàng phụ trợ: `🎯 Mục tiêu khoá học` • `⭐ Góp ý khoá học`.
2. **Bản đồ học tập uốn lượn (Winding S-Curve)**:
   - Căn giữa trang theo phong cách Duolingo / OpenQuiz chuẩn gốc.
   - Tiêu đề từng Part: `PART 1`, `Hello, World!`.
   - Node bài học dạng card viên thuốc bo góc, icon huy hiệu có viền tròn màu xanh (`CheckCircle2` / `GraduationCap`), hiển thị tiêu đề bài học.
   - **Đã khắc phục lỗi Codex phát hiện**: Trạng thái "Đã hoàn thành" chỉ hiển thị khi `les.completed_at` có giá trị từ BE; không còn tự động đánh dấu bài đầu hoàn thành khi chưa học.
3. **Modal 7 hoạt động khi bấm vào bài học**:
   - Header: Icon huy hiệu viền xanh, Tên bài học (VD: `Hello & Goodbye`), phụ đề `Part 1 • Lesson 1 • 7 hoạt động`, nút đóng `✕`.
   - 7 hoạt động chuẩn:
     1. `1. Nói` — Câu chào mở đầu (VD: *Hello! Nice to meet you!*).
     2. `2. Học từ vựng` — Thẻ từ vựng (VD: *4 từ*).
     3. `3. Nói` — Tình huống nói 1 (*It is morning. You meet your friend. What do you say?*).
     4. `4. Nói` — Tình huống nói 2 (*It is 3 PM. You enter a shop. Let's greet the shop worker*).
     5. `5. Học từ vựng` — Thẻ từ vựng mở rộng (*4 từ*).
     6. `6. Nói` — Tình huống nói 3 (*It is evening. You are leaving your friend's house...*).
     7. `7. Hội thoại` — Luyện tập hội thoại (*You are at a party. Greet someone...*).
   - Nút đen toàn màn: `Tiếp tục` — Chuyển thẳng vào Màn hình tương tác bài học.

---

## 2. Màn hình 2 — Trình tương tác bài học (Interactive Lesson Player — Image 2)
- **Tệp nguồn FE**: [`src/views/CourseLessonView.tsx`](file:///d:/Project/openquiz/src/views/CourseLessonView.tsx)
- **Ảnh tham chiếu**: `media_1792555040322_8ba83a14.png`

### Chi tiết đã dựng:
1. **Thanh Header & Thanh tiến độ**:
   - Nút mũi tên quay lại `←` về `/courses`.
   - Tiêu đề bài học và `Phần 1 • Bài 1`.
   - Huy hiệu đếm bước: `2 / 7` (cập nhật theo bước người học đang đứng).
   - Thanh tiến độ ngang mảnh: Segment màu đen tô đậm theo tỉ lệ phần trăm `(currentStep / totalSteps) * 100%`.
2. **Sân khấu trung tâm — Vòng hào quang phát sáng & Linh vật OpenQuiz**:
   - Vòng tròn hào quang đa tầng gradient (cyan, tím lavender, hồng neon) chuyển động và đổi hiệu ứng khi phát âm thanh.
   - Linh vật SVG OpenQuiz chính hãng ([`src/components/MascotIllustration.tsx`](file:///d:/Project/openquiz/src/components/MascotIllustration.tsx)) với nón trùm cam, miệng cười tươi hở răng đặc trưng.
   - Chạm vào linh vật để tạm dừng / tiếp tục âm thanh (`Chạm để tạm dừng` / `Chạm để tiếp tục`).
   - Nút bỏ qua: `▷| Bỏ qua` bo tròn pill.
3. **Thẻ điều khiển tương tác nổi bên dưới**:
   - Câu tiếng Anh nổi bật: `Great job! Now let's learn the most common ways to say hello.`
   - Bản dịch tiếng Việt: `Làm tốt lắm! Bây giờ hãy cùng học những cách chào hỏi phổ biến nhất.`
   - Dải chấm tròn phân trang: `• -`.
   - Thanh công cụ phía dưới:
     - Tốc độ phát âm: `0.9x` (chuyển đổi 0.8x, 0.9x, 1.0x, 1.2x).
     - Ẩn/hiển thị bản dịch: `文A Ẩn bản dịch`.
     - Nghe lại: `↺ Nghe lại`.
   - Hỗ trợ micro nhận diện giọng nói trình duyệt thực tế (`recognizeSpeech`).
4. **Kết nối chấm điểm BE bước 7**:
   - Ở bước 7 (Hội thoại & Luyện tập), hiển thị các câu hỏi trắc nghiệm/viết từ `lesson.content.questions`.
   - Bấm `Nộp bài & Hoàn thành` gọi:
     `POST /api/v1/course-lessons/:id/submit` với `{ retry: true, answers: [...] }`.
   - BE chấm điểm nguyên tử, lưu `course_progress`, trả về `score`, `total`, `results`, `completed_at`.

---

## 3. Tối ưu hoá AppLayout & Khắc phục che khuất giao diện
- **Tệp nguồn FE**: [`src/components/layout/AppLayout.tsx`](file:///d:/Project/openquiz/src/components/layout/AppLayout.tsx)
- Đã cấu hình ẩn thanh tìm kiếm to của Dashboard khi vào các route học tập và lộ trình khoá học:
  `path.startsWith('/courses') || path.startsWith('/study/') || path.startsWith('/exam/') ...`
- Giúp lộ trình khoá học và trình học bài có không gian thoáng đạt 100% giống web gốc.

---

## 4. Kiểm thử hồi quy và an toàn hệ thống BE
1. **Toàn bộ 34 bài kiểm thử BE (`npm run test:api`) tiếp tục PASS 100%**:
   - Không có bất kỳ thay đổi nào làm phá vỡ logic chấm điểm, SRS, auth hay SQLite schema của Codex.
2. **Build Vite & TypeScript (`npm run build`)**: PASS 100% không có cảnh báo hoặc lỗi kiểu.
3. **Quyền riêng tư & Bản quyền**:
   - Hoàn toàn miễn phí, không gắn cổng thanh toán, không khóa tính năng Pro/Plus của người học cá nhân.

---

## 5. Màn hình Lặp lại ngắt quãng (SRS) & Cài đặt tài khoản (Images 21/10 11:39)
- **Tệp nguồn FE**: [`src/views/RepetitionStudyView.tsx`](file:///d:/Project/openquiz/src/views/RepetitionStudyView.tsx)
- **Ảnh tham chiếu 1**: `media_1792557493235_d1ab4226.png` (Trang tổng quan SRS & Cài đặt tài khoản)
- **Ảnh tham chiếu 2**: `media_1792557493252_6ec662fd.png` (Trình ôn tập tương tác SM-2)

### Chi tiết đã dựng:
1. **Chế độ Tổng quan & Cài đặt (Image 1)**:
   - Header: Avatar đại diện, Tên học viên, Email.
   - Thẻ Lặp lại ngắt quãng: Hiển thị đúng số liệu thật từ BE `GET /api/v1/srs/summary` (`Từ đến hạn`, `Thuần thục`).
   - Biểu đồ cột Dự báo ôn tập 7 ngày tới: 7 cột cho các thứ trong tuần (`Th4`, `Th5`, `Th6`, `Th7`, `CN`, `Th2`, `Th3`), cột hôm nay nổi bật màu cam `bg-orange-500` kèm số từ đến hạn trên đầu cột.
   - Nút đen `[ 📅 Lặp lại ngắt quãng ]`: Bấm vào chuyển thẳng sang Trình ôn tập thẻ từ vựng SM-2.
   - Khối OpenQuiz Premium: Đánh dấu đã mở khoá toàn bộ tính năng.
   - Khối Cài đặt tài khoản: Vai trò, Ngôn ngữ đang học, Chuẩn bị thi chứng chỉ (IELTS, TOEIC, TOEFL, Không), Ngôn ngữ mẹ đẻ, 4 giọng đọc tiếng Anh (Dolia, Marcus, Ivy, Oliver có nghe thử), Âm thanh học tập, Giao diện (theo hệ thống/sáng/tối), Giao diện mới (menu dọc).
2. **Trình ôn tập tương tác SM-2 (Image 2)**:
   - Header: `← Quay lại`, `Lặp lại ngắt quãng`, `⚙️ Cài đặt`.
   - Bộ lọc: `[ Cần ôn (n) ]`, `[ Tất cả (n) ]`, `[ Thuần thục (n) ]` và các chế độ Thẻ ghi nhớ / Nghe / Viết / Trắc nghiệm.
   - Thẻ Flashcard trung tâm: Huy hiệu `MỚI` / `CẦN ÔN`, Từ vựng to đậm, Phiên âm, Từ loại, nút phát âm, lật thẻ xem nghĩa tiếng Việt và câu ví dụ.
   - **4 nút đánh giá SM-2 chuẩn xác**:
     - `[ Lặp lại (< 1p) ]` -> quality: 1
     - `[ Khó (6p) ]` -> quality: 2
     - `[ Tốt (10p) ]` -> quality: 4
     - `[ Dễ (4 ngày) ]` -> quality: 5
     - Kết nối trực tiếp vào `applyReview(userId, wordId, quality)` trong `server/study.mjs` qua `PATCH /api/v1/words/:id/progress` để ghi nhận ngày đến hạn mới vào SQLite.
   - Danh sách từ vựng bên dưới: Hiển thị bảng danh sách từ kèm trạng thái, phát âm và nút tải thêm.



---

## 6. Hoàn tất các luồng kết nối FE theo ANTI-BE-HANDOFF (21/10 14:00)
- **Tài liệu căn cứ**: [`docs/ANTI-BE-HANDOFF.md`](file:///d:/Project/openquiz/docs/ANTI-BE-HANDOFF.md), [`docs/STUDY-LOGIC-CONTRACT.md`](file:///d:/Project/openquiz/docs/STUDY-LOGIC-CONTRACT.md), [`docs/EXERCISE-FE-HANDOFF.md`](file:///d:/Project/openquiz/docs/EXERCISE-FE-HANDOFF.md), [`docs/CONVERSATION-SPEAKING-CONTRACT.md`](file:///d:/Project/openquiz/docs/CONVERSATION-SPEAKING-CONTRACT.md).
- **Mã FE đã nối & kiểm tra thật**:
  1. **Course Learning Sessions ([`CourseLessonView.tsx`](file:///d:/Project/openquiz/src/views/CourseLessonView.tsx))**:
     - Thay toàn bộ bước tự dựng bằng `POST /course-lessons/:id/sessions` `{}` và `GET /course-learning-sessions/:id`.
     - Chuyển bước bằng `POST /course-learning-sessions/:id/steps/:step_id/complete`:
       - `vocab`: `{ acknowledged: true }`.
       - `speaking`: `{ transcript: "..." }` (kiểm tra khớp mẫu; nếu không khớp lưu feedback giữ bước; nút bỏ qua gửi `{ skip: true }` cho phép tiếp tục).
       - `quiz`: lưu nháp tự động với `PUT /course-learning-sessions/:id/draft`, nộp bài chấm atomically trên server qua complete step.
     - Loại bỏ hoàn toàn câu chào hỏi dự phòng không thuộc bài học.
  2. **Hoạt động bài học ([`CoursesView.tsx`](file:///d:/Project/openquiz/src/views/CoursesView.tsx))**:
     - Nối `GET /course-lessons/:id/activities` hiển thị đúng danh sách hoạt động thật (`scope: lesson` và `scope: topic`).
     - Bấm từng hoạt động hoặc nút "Tiếp tục" điều hướng theo `activity.route` của server; không trỏ cố định về 163.
  3. **Cài đặt học & số từ thật ([`StudyPractice.tsx`](file:///d:/Project/openquiz/src/components/StudyPractice.tsx), [`StudyPreferences.tsx`](file:///d:/Project/openquiz/src/components/StudyPreferences.tsx))**:
     - Nối `GET /study/options?set_id=:id&mode=learn|dictation` lấy cấu hình mặc định, cấu hình đã lưu và số từ thật (`counts: { total, starred, unmastered }`).
     - Gửi `required_correct: 2, max_attempts: 3` cho chế độ học thích nghi theo tiêu chuẩn mới của BE.
     - Bố cục cài đặt học khớp ảnh `source-study-settings.png`.
  4. **Đọc hiểu cả trang ([`ReadingExercise.tsx`](file:///d:/Project/openquiz/src/components/ReadingExercise.tsx), [`ReadingView.tsx`](file:///d:/Project/openquiz/src/views/ReadingView.tsx))**:
     - Dựng toàn bộ đoạn văn, ô trống tương tác `__[n]__`, ngân hàng từ (`word bank`) và câu hỏi MCQ trên cùng một trang khớp ảnh `source-reading.png`.
     - Nối `GET /exercise-attempts/:id/questions` (reading), `PUT /exercise-attempts/:id/drafts`, và `POST /exercise-attempts/:id/submit` chấm nguyên bài trong 1 transaction.
  5. **Ngữ pháp sắp xếp câu ([`PersistentExercise.tsx`](file:///d:/Project/openquiz/src/components/PersistentExercise.tsx), [`GrammarView.tsx`](file:///d:/Project/openquiz/src/views/GrammarView.tsx))**:
     - Dựng bố cục token chọn/bỏ, 3 cấp độ khó (dễ gom cụm, vừa, khó thêm 2 từ gây nhiễu), dạng bài sắp xếp/điền từ/dịch câu theo ảnh `source-grammar-order.png`, `source-grammar-settings.png` và `local-grammar-feedback.png`.
  6. **Hội thoại & Speaking ([`ConversationView.tsx`](file:///d:/Project/openquiz/src/views/ConversationView.tsx), [`SpeakingView.tsx`](file:///d:/Project/openquiz/src/views/SpeakingView.tsx))**:
     - Dựng màn setup hội thoại theo `user-conversation-setup.png`, tin nhắn AI mở đầu thật, nghe, dịch cache, xem gợi ý `hint`, giữ nội dung nhập khi gặp lỗi.
     - Dựng màn Speaking theo `user-speaking-question.png` và `local-speaking-feedback.png`, tạo câu hỏi theo từ vựng, phản hồi ngữ pháp/nội dung AI, luyện phát âm âm thanh thật.
  7. **Tìm kiếm Dashboard ([`DashboardView.tsx`](file:///d:/Project/openquiz/src/views/DashboardView.tsx))**:
     - Nối thanh tìm kiếm với `GET /search?q=` hiển thị danh sách bộ từ vựng và lộ trình học khớp kết quả thật.
  8. **Kiểm tra bàn phím & hệ thống**:
     - Giữ phím Ctrl đơn để nghe, Enter để kiểm tra/tiếp tục mà không chặn các tổ hợp phím Ctrl khác.
     - Chạy `npm run build` thành công 100% trong 5.19s, `npm run test:api` đạt 40/40 tests PASS, chạy kiểm thử tích hợp 10 luồng thật qua script `scripts/verify-fe-flows.mjs` đạt 10/10 PASS!
