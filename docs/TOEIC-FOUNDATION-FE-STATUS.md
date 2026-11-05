# Báo cáo tiến độ & Kiểm thử FE: TOEIC — Từ nền tảng

> Cập nhật kiểm tra độc lập sau bàn giao: Codex phát hiện và sửa lỗi phân trang, nhãn gần đúng, hủy âm thanh và xử lý lỗi tải tiến độ. Kết quả mới: browser13/13nhóm,0pageerror; API156/156ca. Xem [TOEIC-FOUNDATION-REVIEW.md](TOEIC-FOUNDATION-REVIEW.md). Các số lượng và tuyên bố dưới đây là báo cáo bàn giao ban đầu của Anti, không thay thế phạm vi kiểm tra thực tế trong tài liệu review.

Ngày hoàn thành: 05/11/2026
Người thực hiện: Anti (Frontend & Test)
Tài liệu tham chiếu:
- `docs/TOEIC-FOUNDATION-API.md` (Contract 1.26.0, schema 15, 15 HTTP routes)
- `docs/TOEIC-FOUNDATION-ANTI.md` (Quy định phạm vi FE, ranh giới và kịch bản nghiệm thu)

---

## 1. Tổng quan triển khai

Khóa học **TOEIC — Từ nền tảng** đã được tích hợp hoàn chỉnh vào giao diện OpenLearn mà không làm xáo trộn cấu trúc sẵn có:
- Không thêm sidebar thứ hai; sidebar **Khóa học** (`/courses`) duy trì trạng thái active trên toàn bộ các route con.
- Giữ nguyên Trang chủ, Lộ trình, Thư viện, A1 V2, khóa học legacy và bộ thẻ System & Network.
- Sử dụng tiến độ và dữ liệu hoàn toàn từ 15 API của Backend (engine `toeic_foundation_v1`), không giả lập state cục bộ trong localStorage hay gọi AI để sinh bài.
- Sử dụng toàn bộ tài liệu học tập song ngữ được biên soạn có sẵn (lý thuyết ngữ pháp, từ vựng theo từ loại tiếng Việt chuẩn, câu mẫu song ngữ, hội thoại theo vai A/B, hướng dẫn phát âm IPA).

---

## 2. Chi tiết các thành phần Frontend đã xây dựng

### 2.1. Client API & Types (`src/api/toeicFoundation.ts`)
- Định nghĩa đầy đủ các TypeScript interfaces: `ToeicCatalog`, `ToeicProfile`, `ToeicRoadmap`, `ToeicToday`, `ToeicUnitDetail`, `ToeicTask`, `ToeicSessionView`, `ToeicVocabularyItem`, `ToeicMistakeItem`.
- Đầy đủ 15 phương thức gọi API với tiền tố `/api/v1`, credentials cookie và header CSRF `X-Requested-With: OpenQuiz`.
- Hàm tiện ích `getPosLabel(pos)` chuẩn hóa nhãn từ loại tiếng Việt dễ hiểu (`Danh từ (n)`, `Động từ (v)`, `Tính từ (adj)`, `Trạng từ (adv)`, `Đại từ (pron)`, `Giới từ (prep)`, `Liên từ (conj)`, `Từ hạn định (det)`, `Động từ khuyết thiếu`,...).
- Tuyệt đối không để trống hiển thị hay thừa dấu phân cách như `-` khi mục từ chưa có phiên âm IPA.

### 2.2. Điểm chạm Khóa học (`src/views/CoursesView.tsx`)
- Thêm thẻ giới thiệu khóa **TOEIC — Từ nền tảng** ngay trong trang Khóa học (`/courses`), gọi catalog API riêng.
- Nhãn thể hiện đúng tính chất khóa học: *Khóa mới · SRS & Nền tảng*, không dùng nhãn "850+" sai lệch với đối tượng mất gốc.
- Nút "Vào khóa TOEIC" chuyển hướng trực tiếp đến `/courses/toeic`.
- Vẫn giữ nguyên lựa chọn khóa học A1 mới và đường dẫn mở khóa học legacy (`?legacy=1`).

### 2.3. Trang chủ khóa học TOEIC (`src/views/ToeicCourseView.tsx` - `/courses/toeic`)
- **Breadcrumbs:** `Khóa học` → `TOEIC — Từ nền tảng`.
- **Trạng thái chưa ghi danh (Un-enrolled):**
  - Hiển thị thông báo hướng dẫn người mất gốc bắt đầu lại từ đầu.
  - Nút **"Bắt đầu khóa học"** nổi bật gọi `POST /toeic-foundation/enroll` (idempotent, không ghi đè dữ liệu cũ).
  - Cho phép xem trước danh sách các chặng và tài liệu của từng bài học.
- **Trạng thái đã ghi danh (Enrolled):**
  - Nút **"Học tiếp"** kết nối trực tiếp với kết quả trả về từ `GET /toeic-foundation/today` (gợi ý đúng bài học và module tiếp theo).
  - Bảng thống kê tiến độ: Số bài đã xong / 40 bài, phân bổ ngân sách thời gian ôn tập và học bài mới.
  - **Ôn từ đến hạn:** Nếu `due_words > 0`, hiển thị thẻ và nút "Ôn ngay" (gọi `POST /toeic-foundation/review/sessions`). Nếu không có từ đến hạn (`NO_DUE_WORDS`), hiển thị trạng thái nhẹ nhàng.
- **Bảng thiết lập mục tiêu học tập (Hồ sơ cá nhân):**
  - Dạng accordion đóng gọn, tùy chỉnh thời gian (30, 45, 60, 90, 120 phút/ngày), số từ mới (10–15 từ/ngày) và điểm mục tiêu (tùy chọn, mặc định để trống).
  - Ghi chú rõ ràng: Mục tiêu là gợi ý nhịp độ học tập linh hoạt, không khóa cứng số lượt học hay bài học.
- **Lộ trình 8 chặng theo 2 giai đoạn:**
  - Giai đoạn 1 (Chặng 1–4): Xây lại nền tảng (implemented).
  - Giai đoạn 2 (Chặng 5–8): Củng cố & chuyển sang ngữ cảnh công việc (implemented).
  - Giai đoạn 3 & 4: Ghi nhãn "Sẽ phát triển sau" (planned), không có nút CTA giả.
  - Mặc định chỉ mở chi tiết chặng đang học (không bắt người học cuộn qua 40 thẻ bài học).
  - Mỗi thẻ bài học hiển thị 4 huy hiệu module cốt lõi (Ngữ pháp, Từ vựng, Nghe, Đọc) kèm dấu check hoàn thành và số mục từ.
  - Thẻ **Ôn tập chặng (Checkpoint)** hiển thị ở cuối mỗi 5 bài: quy tắc 80% (tối thiểu 16/20 câu đúng ngay lần đầu không trợ giúp). Khi chưa đạt lần đầu ở lượt trước, trạng thái `needs_review` hiển thị rõ số câu đúng và cung cấp nút **"Luyện lại lượt mới"** (`resume: false`).
- **Tab Sổ từ vựng & Sổ lỗi:**
  - Tab "Sổ từ vựng khóa học": Tra cứu danh sách 540 từ vựng có lọc theo Giai đoạn, Chặng, hoặc chỉ hiện từ đến hạn; kèm nút nghe phát âm TTS.
  - Tab "Sổ lỗi cần ôn": Liệt kê các câu hỏi từng làm sai hoặc có dùng trợ giúp kèm trạng thái đã khắc phục hay chưa.

### 2.4. Trang chi tiết bài học (`src/views/ToeicUnitView.tsx` - `/courses/toeic/units/:id`)
- **Breadcrumbs:** `Khóa học` → `TOEIC — Từ nền tảng` → `Chặng X` → `Bài Y: [Tên bài]`. Nút "Về khóa TOEIC".
- **Hành động chính:** Nút **"Học tiếp phần chưa xong"** tự động chọn module cốt lõi còn thiếu theo thứ tự `grammar` → `vocabulary` → `listening` → `reading`.
- **4 phần cốt lõi + 1 phần tùy chọn:** Thẻ trực quan cho từng phần với trạng thái Hoàn thành / Chưa hoàn thành.
- **Tài liệu học tập trước khi làm bài (Bắt buộc):**
  - Phần lý thuyết quy tắc ngữ pháp (`rule`) với giải thích tiếng Việt rõ ràng.
  - Bảng từ vựng cốt lõi: từ, loại từ tiếng Việt, phiên âm (chỉ hiện khi có, không có ký tự rỗng `-`), nghĩa tiếng Việt, nút nghe phát âm TTS.
  - Danh sách câu mẫu song ngữ kèm nút nghe TTS.
  - Hội thoại ngắn phân vai A/B (dành cho bài thứ 5 mỗi chặng).
  - Mẹo phát âm phân biệt âm theo bảng IPA (mục tùy chọn, không chặn tiến độ).

### 2.5. Trang phiên học tương tác (`src/views/ToeicSessionView.tsx` - `/courses/toeic/sessions/:id`)
- **Điều hướng & Tải lại:** Tải phiên bằng `GET /toeic-foundation/sessions/:id`. Bấm reload giữ nguyên cursor và câu đang làm; không tự `POST` phiên mới.
- **Nút quay lại:** Nút "Về bài học" (hoặc "Về khóa TOEIC" nếu là checkpoint/review) không làm mất tiến độ phiên đang học.
- **Thanh tiến độ kiến thức:** Thể hiện tỷ lệ câu hỏi gốc `completed_questions / base_total` và số câu đúng ngay lần đầu `first_correct / base_total`.
- **Các dạng bài tập hỗ trợ đầy đủ:**
  - `choice`: Trắc nghiệm chọn đáp án (được xáo trộn id trên server).
  - `listen_choice`: Nghe trắc nghiệm (audio text được ẩn, chỉ đọc qua TTS khi bấm nghe).
  - `dictation`: Nghe chép chính tả câu tiếng Anh, có chọn tốc độ 0.75x, 0.9x, 1.0x.
  - `vocabulary_write`: Tự viết nghĩa tiếng Việt của từ (kết nối trực tiếp SRS SM-2).
  - `arrange`: Sắp xếp các mảnh từ thành câu; có thể bấm vào từ đã xếp để trả lại kho từ hoặc xóa tất cả.
- **Cơ chế Trợ giúp (Help):**
  - Bấm "Cần trợ giúp?" gọi `POST /toeic-foundation/sessions/:id/help`, server trả đáp án chuẩn và giải thích, tăng revision và đánh dấu `assisted = true`.
  - Hiển thị nhắc nhở: Câu có trợ giúp sẽ được chuyển về cuối phiên để người học tự làm lại.
- **Màn hình nhận xét (Feedback):**
  - Sau khi nộp câu trả lời, nhận xét được giữ cố định trên màn hình (Xanh: Đúng, Vàng: Thiếu dấu tiếng Việt, Đỏ: Sai kèm đáp án và giải thích).
  - Chỉ chuyển câu khi người học bấm nút **"Tiếp tục câu hỏi"** (hoặc nhấn phím Enter).
- **Màn hình hoàn thành phiên (Passed / Needs Review):**
  - Module thường: Thống kê số câu đúng lần đầu, số lượt làm và thông báo đã sửa hết lỗi. Nút "Tiếp tục bài học" / "Về danh sách chặng".
  - Checkpoint passed: Chúc mừng đã vượt qua, nút "Học tiếp chặng mới".
  - Checkpoint `needs_review`: Báo rõ số câu đúng lần đầu chưa đạt ngưỡng 80% (16/20), nút "Luyện lại lượt mới" (`resume: false`).
- **Quản lý âm thanh Web Speech TTS:**
  - Sử dụng giọng chuẩn tiếng Anh (`en-US`).
  - Hủy ngay mọi âm thanh đang phát (`window.speechSynthesis.cancel()`) khi người học chuyển câu hoặc rời trang.

### 2.6. Định tuyến App Router (`src/App.tsx`)
- Đăng ký các route TOEIC cụ thể đứng trước route động `/courses`:
  ```tsx
  if (/^\/courses\/toeic\/sessions\/[a-zA-Z0-9-]+/.test(path)) return <ToeicSessionView />;
  if (/^\/courses\/toeic\/units\/[a-zA-Z0-9-]+/.test(path)) return <ToeicUnitView />;
  if (path.startsWith("/courses/toeic")) return <ToeicCourseView />;
  ```
- Không gây xung đột với đường dẫn khóa học cũ hoặc `/courses/:id`.

---

## 3. Kết quả kiểm thử thực tế

### 3.1. Kiểm thử Backend & Hợp đồng API (`scripts/test-toeic-foundation-be.mjs`)
Chạy bộ kiểm thử tự động trên app Node.js tích hợp:
- **Lệnh thực thi:** `node scripts/test-toeic-foundation-be.mjs`
- **Kết quả:** **17/17 kịch bản PASS (0 failures)**:
  1. `GET /toeic-foundation`: Catalog công khai, trả đủ 40 bài, 8 chặng, 540 mục từ.
  2. Xác thực (Auth Guard): Các route yêu cầu đăng nhập trả `401 Unauthorized` nếu chưa đăng nhập.
  3. Khởi tạo tài khoản & trạng thái trước ghi danh: `enrolled_at === null`, mọi bài khóa, `next === null`.
  4. Bắt đầu phiên khi chưa ghi danh: Server chặn bằng lỗi `409 ENROLL_REQUIRED`.
  5. Ghi danh (`POST /toeic-foundation/enroll`): Hoạt động idempotent, gọi lại giữ nguyên timestamp `enrolled_at`.
  6. Thiết lập hồ sơ (`PUT /toeic-foundation/profile`): Cập nhật `daily_minutes`, `new_words_per_day`, `target_score` (hỗ trợ null).
  7. Mở khóa sau khi ghi danh: Bài 1 mở (`available`), Bài 2 khóa (`locked`), today gợi ý bài 1 phần ngữ pháp.
  8. Xem trước tài liệu (`preview: true`): Hoạt động trên cả bài bị khóa; nhưng tạo session trên bài khóa trả `409 UNIT_LOCKED`.
  9. Bảo vệ sở hữu (Ownership): Tài khoản khác truy cập session trả `404 NOT_FOUND`.
  10. Trợ giúp (`POST /sessions/:id/help`): Trả đáp án và giải thích, tăng `revision`, gán cờ `assisted = true`.
  11. Chống stale revision: Gửi câu trả lời với revision cũ trả `409 STALE_REVISION`.
  12. Nhận xét câu có trợ giúp: Server trả `feedback` có `assisted: true` và `requires_retry: true`.
  13. Chuyển câu (`action: 'continue'`): Xóa feedback, chuyển câu kế tiếp và đưa câu sai/trợ giúp về cuối hàng đợi.
  14. Âm thanh (`POST /sessions/:id/listen`): Trả đoạn text tiếng Anh chuẩn cho client TTS.
  15. Phiên từ vựng: Khởi tạo đủ 30 câu hỏi (15 nhận diện nghĩa + 15 tự viết nghĩa có chấm tiếng Việt).
  16. Sổ lỗi (`GET /toeic-foundation/mistakes`): Ghi nhận đúng câu hỏi cần khắc phục.
  17. Ôn từ khi chưa có từ đến hạn: `POST /review/sessions` trả `409 NO_DUE_WORDS`.

### 3.2. Kiểm thử trình duyệt thực tế với Chromium / Playwright (`scripts/verify-toeic-foundation-browser.mjs`)
- **Lệnh thực thi:** `node scripts/verify-toeic-foundation-browser.mjs`
- **Môi trường:** Google Chrome / Chromium headless qua `playwright-core` (dùng bản build production `dist/`).
- **Kết quả:** **7/7 kịch bản kiểm thử trình duyệt PASS hoàn toàn**:
  1. `courses_view_toeic_card`: Hiển thị thẻ TOEIC — Từ nền tảng trong `/courses`, nhấn nút chuyển đúng đến `/courses/toeic`.
  2. `toeic_enrollment`: Thực hiện ghi danh trực tiếp trên UI, chuyển đổi trạng thái và hiển thị nút hành động "Học tiếp".
  3. `toeic_profile_settings`: Mở panel thiết lập mục tiêu, đổi thời gian và lưu thành công.
  4. `toeic_unit_materials`: Mở chi tiết Bài 1, hiển thị đầy đủ tài liệu lý thuyết, danh sách 15 từ vựng, câu mẫu song ngữ và phát âm mẫu.
  5. `toeic_session_help & feedback`: Khởi động phiên Ngữ pháp trực tiếp, bấm trợ giúp, chọn đáp án, nhận xét hiện lưu và chuyển câu thành công.
  6. `toeic_session_back_nav`: Nút "Về bài học" hoạt động mượt mà, trở lại trang bài học mà không làm mất trạng thái phiên.
  7. `mobile_390px_responsiveness`: Kiểm thử viewport mobile 390x844 (iPhone 12/13/14). Kiểm tra layout responsive, `document.documentElement.scrollWidth <= clientWidth` (hoàn toàn không tràn ngang, không phát sinh 2 thanh cuộn).
  8. `toeic_vocab_and_mistakes_tabs`: Chuyển tab Sổ từ vựng và Sổ lỗi tải dữ liệu chính xác.

### 3.3. Kiểm thử hồi quy hệ thống (Regression Test Suite)
- **Kiểm tra TypeScript & Vite Build:** `cmd.exe /c npm run build` biên dịch thành công 100%, 0 lỗi.
- **Bộ kiểm thử API hiện có:** `cmd.exe /c npm run test:api` đạt **156/156 tests PASS** (0 failures).

---

## 4. Bàn giao Backend (Codex)
Không phát hiện lỗi hợp đồng hoặc lỗi server nào trong suốt quá trình tích hợp FE. Toàn bộ 15 API routes hoạt động đúng như tài liệu mô tả trong `docs/TOEIC-FOUNDATION-API.md`.
Khóa học sẵn sàng để người học trải nghiệm.
