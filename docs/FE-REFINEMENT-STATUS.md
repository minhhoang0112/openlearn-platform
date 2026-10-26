# Báo cáo Tiến độ Frontend — Mốc 1 Chỉnh Trải nghiệm OpenLearn

Ngày cập nhật: 25/10/2026  
Tài liệu tham chiếu: `docs/PRODUCT-REFINEMENT-ANTI.md`, `docs/PRODUCT-EXPERIENCE-AUDIT-2026-10-25.md`  
Backend Contract: `1.19.0`, Schema `14`  
Bộ kiểm thử tự động: `scripts/verify-refinement-m1.mjs`, `scripts/verify-practice-navigation-browser.mjs`

---

## 1. Tóm tắt kết quả Mốc 1

Đã hoàn thành toàn bộ 7 nhiệm vụ Frontend được giao trong Mốc 1, bảo đảm:
- Không can thiệp vào `server/**`, database SQLite, file môi trường `.env`, hoặc tài liệu do Codex giữ (`BE-NEXT.md`, `BE-WORKLOG.md`).
- Giữ nguyên toàn bộ engine học từ vựng (flashcard, learn, write, SRS, audio, options).
- Build production `npm run build` thành công, sạch lỗi TypeScript (0 error, bundle ~1,072 KB minified, ~241 KB gzip).
- Đã chạy kiểm thử browser Chrome headless thực tế trên cả 4 kích thước màn hình: **360px** (mobile nhỏ), **390px** (iPhone chuẩn), **768px** (tablet), và **1440px** (desktop). Kết quả: **100% checks đạt, 0 page errors**.

---

## 2. Chi tiết các hạng mục FE đã hoàn thành

### 2.1. Sửa giao diện Mobile LessonRun & Nút Tra từ nổi (`UX-07`)
- **File**: `src/views/LessonRunView.tsx`, `src/components/layout/AppLayout.tsx`
- **Thay đổi**:
  - Tại `LessonRunView.tsx`: Cụm thanh tiêu đề bước học (`[data-testid="lesson-step-header"]`) chuyển từ dạng hàng ngang co cụm sang `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`. Tiêu đề bước học không còn bị ngắt dòng 2-3 từ khi hiển thị trên màn 360px/390px.
  - Widget audio nghe nhanh trên mobile xếp dọc gọn gàng bên dưới tiêu đề, rộng 100%, có nhãn và thời lượng rõ ràng.
  - Tại `AppLayout.tsx`: Nút Tra từ nổi (`floating-dictionary-button`) được bổ sung `aria-label="Mở từ điển tra từ nhanh"`. Riêng trong các phòng học và runner bài học (`/lesson-run/`, `/study/`, `/comprehensive/`, `/reading/`, `/grammar/`, `/exam/`, `/dictation/`, `/listening/practice/`), vị trí nút được dịch chuyển thành `bottom-24 md:bottom-6 right-4 md:right-6` với padding gọn hơn (`p-2.5 sm:px-4 sm:py-2.5`), loại bỏ hoàn toàn nguy cơ che đè thanh thao tác nộp bài / các nút đáp án dưới đáy màn hình.

### 2.2. Điều hướng, Back & Giữ ngữ cảnh `from` (`UX-09`)
- **File**: `src/views/LessonRunView.tsx`, `src/views/MyProgramView.tsx`, `src/components/LearningBreadcrumb.tsx`
- **Thay đổi**:
  - `MyProgramView.tsx`: Lưu trữ và duy trì mã chương trình đang chọn qua URL query param `?program=...` (ví dụ: `/my-program?program=english-it-system`). Khi chuyển tab, reload hoặc quay lại từ bài học, chương trình đang xem không bị reset về mặc định.
  - Các card chọn chương trình chuyển đổi từ thẻ `div` thành `<button type="button">` với focus ring rõ ràng.
  - Nút "Thoát bài học" tại `LessonRunView.tsx`: Đọc tham số `from` từ URL để quay về đúng nơi xuất phát (trở về đúng `/my-program?program=...` thay vì luôn ép về `/today`).
  - `LearningBreadcrumb.tsx`: Giữ nguyên luồng trang con `/practice/:modeId` độc lập, đồng thời phân định nhãn nút trở về an toàn:
    - Khi vào bài từ trang chọn bộ độc lập (`/practice/:modeId`): Nút back hiển thị "Trở về chọn bộ từ".
    - Khi vào bài từ danh mục gốc `/practice`: Nút back hiển thị "Về Luyện tập".

### 2.3. Dọn dẹp Trang chủ & Trả lại tính trung thực cho lộ trình gợi ý (`UX-05`)
- **File**: `src/views/DashboardView.tsx`
- **Thay đổi**:
  - Gỡ bỏ ô tìm kiếm trùng lặp ở thân trang Home (header đã có tìm kiếm toàn cục có phím tắt `Ctrl+K`).
  - Gỡ bỏ banner quảng bá `📢 AI Study Beta` gây chia cắt tầm nhìn trước nhiệm vụ học chính.
  - Mục Lộ trình (Section 3): Kiểm tra trạng thái thực tế `activePath`. Khi người học chưa đăng ký lộ trình nào:
    - Tiêu đề mục hiển thị chính xác là **"Gợi ý lộ trình bắt đầu"** (thay vì ghi "Lộ trình đang học").
    - Thẻ lộ trình mang badge **"Gợi ý cho bạn"**, tuyệt đối không gắn nhãn "Đang học" sai sự thật cho lộ trình fallback ID 20269.
    - Card lộ trình chuyển thành button semantic có focus-visible ring khi duyệt bàn phím.

### 2.4. Chuẩn hóa chữ & Nhãn thuật ngữ (`UX-01`, `UX-03`, `UX-10`)
- **File**: `src/views/TodayView.tsx`, `src/views/LearningSettingsView.tsx`, `src/views/MaterialsHubView.tsx`, `src/views/MistakesView.tsx`, `src/views/ProgressView.tsx`, `src/components/InteractiveFeaturesSection.tsx`, `src/views/AuthView.tsx`
- **Thay đổi**:
  - Loại bỏ hoàn toàn các thuật ngữ kỹ thuật rò rỉ trên giao diện người dùng: "V2", "next_local_day", "contract", "Pilot".
  - Đổi thuật ngữ kỹ thuật **"Ngân sách" / "Ngân sách thời gian"** thành **"Thời gian học" / "Thời lượng học mỗi ngày"**.
  - Xóa bỏ khẩu hiệu phi khoa học "Đã thuộc vĩnh viễn"; thay bằng cơ chế chính xác **"Ghi nhớ bền vững theo chu kỳ ngắt quãng (SRS)"**.
  - Phân định rõ giữa: số từ "đã luyện tập" (bằng chứng thao tác) và số từ "ghi nhớ theo chu kỳ ngắt quãng" (trí nhớ dài hạn).

### 2.5. Tìm kiếm & Phân trang cho danh sách lớn (`UX-08`)
- **File**: `src/views/ListeningLibraryView.tsx`, `src/views/PracticeView.tsx`
- **Thay đổi**:
  - `ListeningLibraryView.tsx`:
    - Thêm thanh tìm kiếm bài nghe theo tiêu đề, lời thoại và mã bài (`search`).
    - Thêm bộ lọc chương trình học: Tất cả, Nền tảng, IT / System, Ôn chặng (`program`).
    - Phân trang gọn (`PAGE_SIZE = 8`) kèm nút "Tải thêm bài học tiếp theo", khắc phục tình trạng danh sách cuộn liên tục 7.836px trên mobile.
    - Duy trì các bộ lọc trong URL query (`?tab=...&search=...&program=...&page=...`), giữ nguyên trạng thái khi reload.
  - `PracticeView.tsx`:
    - Bổ sung ô tìm kiếm bộ từ vựng (`q`) trong trang chọn bộ độc lập.
    - Phân trang 12 bộ từ mỗi trang (`SETS_PAGE_SIZE = 12`) kèm nút "Tải thêm bộ từ".
    - Đồng bộ `q` và `page` lên URL search parameters.

### 2.6. Trợ năng & Phím tắt bàn phím (`UX-10`)
- **File**: `src/views/StudySetView.tsx`, `src/views/LearningSettingsView.tsx`, `src/views/PracticeView.tsx`
- **Thay đổi**:
  - `StudySetView.tsx`:
    - Toàn bộ các nút icon đều có `aria-label` và `title`: Bookmark ("Lưu bộ thẻ" / "Bỏ lưu bộ thẻ"), Chia sẻ ("Chia sẻ bộ thẻ"), Tùy chọn khác ("Tùy chọn khác"), Xáo trộn ("Xáo trộn thứ tự thẻ"), Luyện nói AI ("Luyện nói AI"), Lật thẻ ("Lật thẻ"), Nghe phát âm ("Nghe phát âm [từ]"), Đánh dấu sao ("Đánh dấu sao cho từ [từ]" / "Bỏ đánh dấu sao cho từ [từ]").
    - Khung Flashcard trung tâm (`[data-testid="flashcard-player"]`) được khai báo `role="button"`, `tabIndex={0}`, có `aria-label` hướng dẫn và hỗ trợ phím tắt bàn phím (Space / Enter / phím C để lật thẻ, mũi tên trái / phải để chuyển thẻ).
    - Thêm viền focus (`focus-visible:ring-2 focus-visible:ring-indigo-500`) trên các nút chế độ học và thẻ từ.
  - `LearningSettingsView.tsx`: Các ô chọn mốc thời gian học (15m, 30m, 45m) chuyển thành `role="button"` có `tabIndex={0}` và xử lý bàn phím.

### 2.7. Nối API Hoạt động Xuyên Engine Contract 1.19.0 (`UX-02`, BE Contract 1.19.0)
- **File**: `src/api/client.ts`, `src/views/ProgressView.tsx`
- **Thay đổi**:
  - `src/api/client.ts`: Khai báo các interface `LearningActivity`, `LearningActivitySummary`, `LearningActivityDaily`, `LearningActivityItem`, `GetLearningActivityParams`. Bổ sung method `api.getLearningActivity(params)`.
  - `src/views/ProgressView.tsx`:
    - Kết nối đồng thời `api.getLearningProgress(days)` và `api.getLearningActivity({ days, limit: 50, offset: 0 })`.
    - Thẻ thống kê **"Ngày học thực tế"** sử dụng chỉ số `summary.active_days` từ API hoạt động xuyên engine (thay vì chỉ lấy `progress.active_days` vốn bị thu hẹp trong phạm vi V2). Người học học từ vựng hoặc luyện tập bất kỳ đều được ghi nhận ngày học chuẩn xác.
    - Bổ sung số liệu **"Tổng hoạt động ghi nhận"** (`summary.total_activities`) và **"Từ vựng đã luyện"** (`summary.distinct_words_practised`).
    - Bổ sung tab mới **"Hoạt động gần đây"** (`activeTab === 'activity'`): Liệt kê danh sách hoạt động học đa nguồn (`vocabulary`, `srs_rating`, `lesson`, `mistake`, `listening`, `material_dictation`, `conversation`, `exercise`, `ai_feedback`...), hiển thị nhãn, icon đặc thù, thời gian chuẩn theo timezone của học viên và nút **"Mở bài"** dẫn trực tiếp đến nội dung liên quan.
    - Giữ nguyên tab **"Bài nộp & Bằng chứng"** (`activeTab === 'history'`) cùng modal xem chi tiết bài làm đã nộp (evidence viewer) cho các bài học.

---

## 3. Bằng chứng Kiểm thử Thực tế

### 3.1. Build Production
```bash
cmd.exe /c "npm run build"
```
- Kết quả: `✓ built in 8.98s`, 0 error, 2001 modules transformed.

### 3.2. Script E2E Browser Mốc 1 (`scripts/verify-refinement-m1.mjs`)
Script chạy trên server backend thật và Chrome headless:
```bash
node scripts/verify-refinement-m1.mjs
```
Kết quả ghi nhận tại `docs/fe-refinement-validation.json`:
- **Viewports đã thử nghiệm**:
  - `360px mobile small` (360x740)
  - `390px iPhone` (390x844)
  - `768px tablet` (768x1024)
  - `1440px desktop` (1440x900)
- **Checks xác nhận**:
  1. `LessonRun mobile header stacks vertically and floating dictionary offsets away from bottom CTAs across 360/390/768/1440px` — **PASSED**
  2. `MyProgram maintains program in URL query and Exit lesson returns to exact program` — **PASSED**
  3. `Homepage cleaned: duplicate search removed, promo banner removed, fallback path truthfully labeled as suggestion` — **PASSED**
  4. `Labels standardized: "Ngân sách" -> "Thời gian học", removed technical "V2" from Today, Settings, and Materials` — **PASSED**
  5. `Listening Library & Practice Set Selector support search & pagination persisting in URL` — **PASSED**
  6. `StudySetView accessibility: aria-label on icon buttons, semantic buttons and keyboard-focusable flashcard` — **PASSED**
  7. `ProgressView connects GET /learning/activity (Contract 1.19.0), displays cross-engine active days, and renders Activity History tab` — **PASSED**
- **Trạng thái**: `passed: true`, `page_errors: []`.

### 3.3. Regression Check Luồng Luyện tập (`scripts/verify-practice-navigation-browser.mjs`)
```bash
node scripts/verify-practice-navigation-browser.mjs
```
- Kết quả: `passed: true`, 10/10 checks đạt, 0 page errors.

---

## 4. Các phần chưa làm / Dành cho Mốc 2 theo phân công

Theo kế hoạch tại `docs/PRODUCT-REFINEMENT-ANTI.md` và `docs/REFINEMENT-M1B-ANTI.md`, các hạng mục sau **không nằm trong Mốc 1/1B** và sẽ được thực hiện tại Mốc 2 sau khi Codex hoàn thiện điều phối:
1. **Thống nhất Sidebar & Điều hướng chính**: Rút gọn sidebar về 5 mục chuẩn (Hôm nay, Lộ trình, Thư viện, Luyện tập, Tiến độ); logo và chuyển hướng sau đăng nhập về thẳng **Học hôm nay**.
2. **Thống nhất màn hình khám phá bộ từ**: Chuyển Dashboard bộ từ hiện tại thành trang Khám phá trong Thư viện, tránh hai trang chủ cạnh tranh.
3. **Chuẩn hóa khóa học nền tảng (`BE-D` / Mốc 3)**: Mở rộng/biên tập câu ví dụ, dịch nghĩa, ngữ cảnh nhất quán và readiness cho toàn bộ kho dữ liệu từ vựng.

---

## 5. Báo cáo Tiến độ Frontend — Mốc 1B Hoàn tất Tích hợp BE 1.20.0

Ngày cập nhật: 25/10/2026  
Tài liệu tham chiếu: `docs/REFINEMENT-M1B-ANTI.md`, `docs/PRODUCT-REFINEMENT-PLAN-API.md`, `docs/PRODUCT-REFINEMENT-ANTI.md`  
Backend Contract: `1.20.0`, Schema `14`, 156 routes  
Bộ kiểm thử tự động Mốc 1B: `scripts/verify-refinement-m1b.mjs`, `scripts/audit-refinement-integration-gaps.mjs`

### 5.1. Tóm tắt kết quả Mốc 1B
Đã hoàn tất toàn bộ 4 nhóm tích hợp kỹ thuật và giải quyết triệt để 2 thiếu sót tái hiện thực tế:
- **Xóa bỏ hoàn toàn khoảng trống tìm kiếm**: Tìm kiếm bộ từ truy vấn trực tiếp BE `GET /sets?q=...&limit=...&offset=...`, tìm thấy chính xác các bộ từ ngoài trang đầu (ví dụ: `[B1 Level] School and Education` ID 13609 giữa 180 bộ). `visible_in_selector: 1`, tổng số bộ hiển thị chuẩn `total: 180`.
- **Nối hoàn chỉnh mục tiêu ngày BE 1.20**: 
  - Khởi tạo bài học theo kế hoạch bằng `POST /learning/today/items/:item_id/start` truyền `plan_id` và `revision`.
  - LessonRun nhận biết chính xác `target_cursor`. Khi người học đạt số bước mục tiêu trong ngày (ví dụ 5/7 bước theo quỹ 15 phút), giao diện hiển thị rõ ràng nút và banner **"Xong phần hôm nay"** (`[data-testid="finish-today-goal-button"]`) kèm lựa chọn **"Học tiếp bài này"** (không ép buộc học hết, không giả lập hoàn thành bài và không tự ý advance).
  - Thêm tính năng **"Điều chỉnh hôm nay"** (`POST /learning/today/adjust`) với modal cập nhật `remaining_minutes`, bảo toàn các bài nộp dở và xử lý an toàn 409 `PLAN_CHANGED`.
  - Trên Today View: Khi mục tiêu ngày đã đạt nhưng bài học vẫn còn các bước dở, Today phân biệt rõ **"Đã xong mục tiêu hôm nay"** và nút **"Tiếp tục phần còn lại (tùy chọn)"**, không còn banner dở dang phủ nhận kết quả học trong ngày.
- **Nối Readiness & Lõi 3 bước**:
  - Tích hợp kiểm tra tiền trạm `GET /sets/:id/readiness` trước khi mở chế độ luyện tập. Khi thiếu dữ liệu (`MISSING_CONTENT`, `SELECTION_LIMIT`, `EMPTY_SET`, `AI_NOT_CONFIGURED`), hiển thị modal giải pháp cụ thể, không đưa vào màn hình trắng và không tự ý gọi AI ngầm.
  - `ComprehensiveLessonView.tsx`: Thể hiện tiến độ cốt lõi bằng `completed_core_steps / total_core_steps` (3 bước). Hoàn thành 3 bước là đạt chuẩn cốt lõi; 2 bước AI được tách riêng thành "Luyện thêm (Tùy chọn AI)" không phong tỏa bài học.
- **Xử lý lỗi trung thực & Phân trang Lịch sử hoạt động**:
  - `ProgressView.tsx`: Xóa bỏ cơ chế giấu lỗi `.catch(() => null)` và fallback sai số liệu V2. Khi API hoạt động gặp lỗi (503/timeout), hiển thị thông báo trung thực **"Chưa tải được hoạt động toàn hệ thống"** kèm nút **"Thử lại"**.
  - Phân trang hoạt động theo `total/limit/offset` và quản lý chuỗi truy vấn sequence ID để hủy response cũ khi đổi bộ lọc ngày.

### 5.2. Bằng chứng nghiệm thu Mốc 1B
1. **Kiểm thử tích hợp tái hiện thiếu sót (`scripts/audit-refinement-integration-gaps.mjs`)**:
   - Ghi nhận tại `docs/refinement-integration-gaps.json`:
     - `catalog_search`: `visible_in_selector: 1`, `api_matches: 1`, `total_accessible_sets: 180`.
     - `daily_goal`: `planned_steps: 5`, `total_steps: 7`, `cursor: 5`, `plan_status: "completed"`, `daily_finish_button: 2`.
     - `page_errors: []`, `completed: true`.
2. **Kiểm thử tự động toàn diện Mốc 1B (`scripts/verify-refinement-m1b.mjs`)**:
   - Ghi nhận tại `docs/fe-refinement-m1b-validation.json`:
     - Check 1: `catalog_search_beyond_100` — **PASS** (`visible_in_selector: 1`, `total_sets: 180`)
     - Check 2: `daily_goal_completion_and_exit` — **PASS** (`cursor: 5`, `target_cursor: 5`, `daily_finish_button_count: 2`, `returned_to_today: true`)
     - Check 3: `adjust_today_plan_modal` — **PASS**
     - Check 4: `readiness_check_actionable_choices` — **PASS** (modal cảnh báo thiếu nội dung hiển thị chính xác)
     - Check 5: `comprehensive_core_steps_ui` — **PASS** (hiển thị 3 bước cốt lõi, không ép buộc AI)
     - Check 6: `activity_error_state_and_retry` — **PASS** (hiển thị trung thực khi API hoạt động lỗi)
     - Multi-viewport (360px, 390px, 768px, 1440px) — **PASS** trên mọi kích thước.
     - `page_errors: []`, `total_checks_passed: 6`, `completed: true`.
3. **Kiểm thử hồi quy Mốc 1A & Navigation**:
   - `scripts/verify-refinement-m1.mjs`: 7/7 checks **PASS**, `page_errors: []`.
   - `scripts/verify-practice-navigation-browser.mjs`: 10/10 checks **PASS**, `page_errors: []`.
4. **Build Production**:
   - `npm run build`: `built in 7.67s`, 0 error, 2001 modules transformed.

---

## 6. Báo cáo Tiến độ Frontend — Mốc 2 Một nơi bắt đầu, điều hướng 5 mục

Ngày cập nhật: 26/10/2026  
Tài liệu tham chiếu: `docs/REFINEMENT-M2-ANTI.md`  
Backend Contract: `1.20.0`, Schema `14`, 156 routes (không đổi BE, DB, `.env`)  
Bộ kiểm thử tự động Mốc 2: `scripts/verify-refinement-m2.mjs`, `scripts/verify-daily-goal-guards-browser.mjs`, `scripts/verify-refinement-m1b.mjs`

### 6.1. Tóm tắt kết quả Mốc 2

Đã hoàn thành toàn bộ các yêu cầu của Mốc 2 theo hợp đồng kỹ thuật và tài liệu chỉ đạo:
1. **Bảo toàn 2 sửa đổi logic phòng thủ của Codex**:
   - `LessonRunView.tsx`: Xác nhận mục tiêu ngày từ server (`GET /learning/today`) đối soát chính xác theo `plan_id`, `item_id`, `session_id`, `content_version`. Tuyệt đối không dùng `target_cursor` trên URL để tự kết luận hoàn thành mục tiêu ngày. Khi kế hoạch thay đổi hoặc không khớp item, hiển thị banner cảnh báo và nút khôi phục trở về Hôm nay thay vì false completion.
   - `TodayView.tsx`: Khi khởi tạo bài học theo kế hoạch (`api.startTodayItem`) thất bại, hiển thị thông báo lỗi rõ ràng từ server; không tự ý fallback ngầm sang tạo session bài học tự do khác.
   - Đã kiểm tra thực tế bằng `scripts/verify-daily-goal-guards-browser.mjs`: **4/4 checks PASS**, 0 error.
2. **5 mục điều hướng chính chuẩn hóa**:
   - Rút gọn menu chính của cả Desktop Sidebar và Mobile Drawer về đúng 5 mục:
     | Mục | Route chính | Vai trò |
     |---|---|---|
     | **Học hôm nay** | `/today` | Kế hoạch ngày, tiếp tục bài học, ôn từ SRS và câu sai |
     | **Lộ trình** | `/my-program` | Khóa nền tảng/chuyên ngành và vị trí học hiện tại |
     | **Thư viện** | `/my-created` | Bộ thẻ cá nhân, học liệu đã lưu, lối vào Khám phá |
     | **Luyện tập** | `/practice` | Luyện tự do theo kỹ năng (Flashcard, Nghe, Viết, Đọc, Nói, Trắc nghiệm, Ghép từ) |
     | **Tiến độ** | `/progress` | Hoạt động toàn hệ thống, ngày học thực tế và bằng chứng |
   - Ôn đến hạn (`/repetition-study`) và Sổ lỗi (`/mistakes`) nằm trong nhóm shortcut **Ôn tập**, hiển thị badge số liệu thật, không cạnh tranh thành mục chính mới.
   - Các tính năng phụ (Cài đặt học, Cài đặt AI, Lớp học, Tra từ, Tạo bộ thẻ, Tạo lộ trình) được bảo toàn nguyên vẹn trong nhóm Công cụ / Mở rộng / Cài đặt.
   - Toàn bộ menu item được chuyển thành thẻ ngữ nghĩa `<a>` với `href`, hỗ trợ mở tab mới, aria accessibility và keyboard navigation hoàn chỉnh.
3. **Một cửa vào thống nhất (Single Entry Point)**:
   - Route `/` là alias tự động chuyển hướng an toàn (`replace: true`) tới `/today` cho người dùng đã đăng nhập; logo trên header và sidebar dẫn về `/today`. Không phát sinh redirect loop khi bấm nút Back của trình duyệt.
   - Bảo toàn Deep link: Nếu người dùng truy cập link bài học/bộ từ khi chưa đăng nhập (ví dụ `/study-set/13609`), sau khi đăng nhập hệ thống chuyển hướng bằng `replace` về đúng nội dung đã yêu cầu (không ép buộc về Today).
   - Trang 404 chuyên biệt (`src/views/NotFoundView.tsx`): Khi truy cập route không tồn tại, hiển thị màn hình "404 - Không tìm thấy trang" với nút "Về Học hôm nay" và "Về Thư viện", không âm thầm fallback về Dashboard.
4. **Khám phá chuyển về Thư viện**:
   - Chuyển Dashboard khám phá sang route `/explore` với nhãn **Khám phá bộ từ & lộ trình**, mở từ nút nổi bật trong Thư viện (`/my-created`).
   - Tích hợp ô tìm kiếm riêng cho Explore, đồng bộ trạng thái tìm kiếm với URL (`/explore?q=...`).
   - Mọi link mở từ `/explore` ghi nhận chuẩn `source: 'library'` và `from` là URL explore thực tế kèm bộ lọc.
   - Khi xem category, lộ trình hoặc bộ từ mở từ Explore, thanh bên nhận diện và highlight đúng tab **Thư viện** (`/my-created`). Quay lại / Back trình duyệt trả về đúng bộ lọc ban đầu.
5. **Không gọi AI ngầm & Dữ liệu thật**:
   - Toàn bộ việc chuyển trang, tìm kiếm và điều hướng không phát sinh bất kỳ request AI ngầm nào.
   - Giữ nguyên toàn bộ cơ sở dữ liệu và contract API hiện có.

### 6.2. Bằng chứng nghiệm thu Mốc 2

1. **Kiểm thử tự động Mốc 2 (`scripts/verify-refinement-m2.mjs`)**:
   - Ghi nhận tại `docs/refinement-m2-validation.json`:
     - Check 1: `single_entry_root_redirect_and_logo` — **PASS** (truy cập `/` redirect về `/today`, logo dẫn `/today`, back trình duyệt an toàn không loop).
     - Check 2: `deep_link_preservation_after_login` — **PASS** (truy cập `/study-set/13609` trước login, sau login đưa thẳng về `/study-set/13609`).
     - Check 3: `five_main_nav_items_desktop` — **PASS** (chính xác 5 mục: Học hôm nay, Lộ trình, Thư viện, Luyện tập, Tiến độ; shortcut Ôn tập có badge thật).
     - Check 4: `dedicated_404_not_found_view` — **PASS** (hiển thị trang 404 khi vào đường dẫn lạ, nút quay về Hôm nay hoạt động chính xác).
     - Check 5: `explore_relocated_under_library` — **PASS** (route `/explore`, tìm kiếm đồng bộ URL `?q=`, highlight Thư viện, quay về giữ nguyên filter).
     - Check 6: `no_unsolicited_ai_calls_on_nav` — **PASS** (0 AI call khi điều hướng).
     - Viewports kiểm thử:
       - `mobile_small_360` (360x740): **PASS** (scrollWidth: 360, clientWidth: 360, menu drawer mở 5 mục mượt mà)
       - `mobile_standard_390` (390x844): **PASS** (scrollWidth: 390, clientWidth: 390)
       - `tablet_768` (768x1024): **PASS** (scrollWidth: 768, clientWidth: 768)
       - `desktop_1440` (1440x900): **PASS** (scrollWidth: 1440, clientWidth: 1440)
     - `page_errors: []`, `completed: true`.
2. **Kiểm thử hồi quy Daily Goal Guards (`scripts/verify-daily-goal-guards-browser.mjs`)**:
   - `4/4 checks PASS`:
     - Failed daily start shows error without silently starting generic lesson: **PASS**
     - Forged target_cursor=0 cannot claim daily completion: **PASS**
     - Mismatched plan item offers recovery: **PASS**
     - Real completed daily goal confirmed using server target: **PASS**
   - `page_errors: []`, `passed: true`.
3. **Kiểm thử hồi quy Mốc 1B (`scripts/verify-refinement-m1b.mjs`)**:
   - `6/6 checks PASS`, 4 viewports PASS, `page_errors: []`, `completed: true`.
4. **Build Production**:
   - `cmd.exe /c npm run build`: `✓ built in 9.80s`, 0 error, 2002 modules transformed.



