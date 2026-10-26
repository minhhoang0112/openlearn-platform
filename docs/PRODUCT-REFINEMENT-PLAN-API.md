# BE Mốc 1 — Kế hoạch theo thời gian, readiness và lõi không AI

Contract **1.20.0**, schema **14**. Đây là phần tiếp theo của `PRODUCT-REFINEMENT-ANTI.md`; giữ nguyên API hoạt động và SRS 1.19.0.

## 1. Kế hoạch hôm nay

`GET /api/v1/learning/today` giữ các trường cũ và bổ sung:

```ts
interface DailyPlanAdditions {
  plan_revision: number;
  planner_policy: 'step_chunk_v1' | 'legacy';
  estimated_remaining_minutes: number;
  deferred: { kind: string; lesson_id?: string; reason: 'time_budget' }[];
  adjustment_policy: 'explicit_remaining_budget';
}
interface DailyLessonItemAdditions {
  reason: 'resume_lesson' | 'next_lesson';
  completion_scope?: 'planned_steps';
  lesson_completed: boolean;
  estimated_remaining_minutes: number;
  completed_planned_steps: number;
  workload?: {
    policy: 'step_chunk_v1';
    start_cursor: number;
    target_cursor: number;
    planned_steps: number;
    total_steps: number;
    full_lesson_estimated_minutes: number;
  };
}
```

Kế hoạch mới chia bài theo thứ tự bước thật, không tạo bài giả hoặc nhảy qua câu chưa làm. Ví dụ bài 7 bước/20 phút, ngân sách 15 phút → mục tiêu 5 bước/15 phút. `estimated_minutes` là ước lượng cho phần được giao, không phải thời gian đã đo.

`item.status='completed'` có thể là **xong phần hôm nay**, trong khi `lesson_completed=false` và phiên vẫn active. Chỉ gọi bài học hoàn thành khi `session.status='completed'`. FE phải phân biệt hai trường hợp này.

Kế hoạch phân bổ tối đa 5 phút ôn từ, tối đa 5 phút ôn Sổ lỗi nếu có hạn ôn thật, rồi phần bài học vừa quỹ thời gian còn lại. Mục không đủ thời gian xuất hiện trong `deferred`, không bị ghi là đã hoàn thành. Nếu còn dở, ưu tiên phiên đó; bài mới chỉ chọn khi kiến thức cần trước đã hoàn tất. Ngày nghỉ không tự giao bài mới, vẫn có thể ôn/tiếp tục bài dở/học tự chọn.

Kế hoạch cũ được giữ nguyên cho tới khi người học chủ động điều chỉnh. Khi `planner_policy='legacy'`, `workload` có thể không có; không tự giả target_cursor từ FE.

### Bắt đầu đúng bài của kế hoạch

`POST /learning/today/items/:item_id/start`

```json
{"plan_id":"UUID của kế hoạch","revision":0}
```

Response `{data:{session,plan,daily_goal:{plan_id,item_id,target_cursor}},request_id}`. `session` dùng type LearningSession hiện có. API start/resume đúng phiên và content_version được giao, không chọn nhầm bản mới hoặc khởi tạo lại bản nháp. Nhấp lại trả cùng phiên. Không nhận resume=false từ FE ở endpoint này.

- 201: tạo phiên mới; 200: tiếp tục phiên.
- 409 `PLAN_CHANGED`: tải lại kế hoạch, giữ dữ liệu học đang nhập.
- 409 `DAILY_GOAL_COMPLETED`: phần hôm nay đã xong; cho người dùng chọn học thêm ngoài kế hoạch.
- 400 `LESSON_REQUIRED`: mục ôn từ/lỗi dùng `item.route`, không gọi start bài học.

`item_id` có thể chứa dấu `:` sau khi điều chỉnh; dùng `encodeURIComponent`.

**FE Today nên gọi endpoint này thay cho startLearningSession trực tiếp.** Mang `daily_goal` tới LessonRun bằng query `plan_id`, `item_id`, `target_cursor` và `from=/today`. Không tin query để tự chấm hoàn thành: đối chiếu lại GET today/session từ BE.

Tại LessonRun, khi cursor đạt target, hiện lựa chọn **Xong phần hôm nay** hoặc **Học tiếp bài này**. Giữ toàn bộ engine session/submit/advance hiện có. Không tự advance, tạo kết quả đúng, hoặc gọi kết thúc toàn bài khi mới xong một phần.

### Điều chỉnh phần thời gian còn lại

`POST /learning/today/adjust`

```json
{"plan_id":"UUID của kế hoạch","revision":0,"remaining_minutes":10}
```

- `remaining_minutes`: số nguyên 5–90. Là thời gian muốn dành cho phần **sắp học tiếp**, không phải số phút đã đo trong ngày.
- Trả TodayPlan mới với revision tăng 1, cùng plan_id. Dùng revision mới cho lần tiếp theo.
- Giữ các mục tiêu đã xong, bản nháp, phản hồi, câu trả lời và phiên của bài đang học. Cắt lại mục tiêu còn lại từ cursor thật. Lịch học trong tuần vẫn giữ snapshot của hôm nay.
- `budget_minutes` sau điều chỉnh là quỹ cho phần còn lại mới chọn. Không cộng phút ước lượng của mục đã hoàn tất rồi kết luận vượt quỹ mới. Tổng ước lượng phần chưa xong không vượt quỹ mới.
- Không sửa profile. Cài đặt hồ sơ vẫn có thể áp dụng từ ngày sau; nút **Điều chỉnh hôm nay** là thao tác riêng.
- Sai revision hoặc sang ngày mới → 409 `PLAN_CHANGED`; không ghi đè kế hoạch mới bằng màn cũ. API không âm thầm lặp lại thao tác thay đổi khi request cũ được gửi lại.

## 2. Sẵn sàng của bộ từ

`GET /api/v1/sets/:id/readiness` hoặc thêm `?word_ids=1,2,3` cho phạm vi đang chọn. Đăng nhập bắt buộc; không gọi AI. Chỉ lấy khi chọn bộ/phạm vi, không gọi N+1 trên hàng trăm card.

```ts
interface SetReadiness {
  set_id: number;
  total_words: number;
  examples_available: number;
  translations_available: number;
  missing_example_ids: number[];
  missing_translation_ids: number[];
  assessment_scope: 'content_and_provider_configuration';
  modes: {
    id: string;
    ready: boolean;
    requires_ai: boolean;
    max_words: number;
    requires_subset: boolean;
    missing_fields: ('example' | 'example_translation')[];
    blocked_reason: null | 'EMPTY_SET' | 'SELECTION_LIMIT' | 'MISSING_CONTENT' | 'AI_NOT_CONFIGURED';
  }[];
  limitations: string[];
}
```

- IDs mode: `flashcard`, `learn`, `write`, `quiz`, `dictation` (từ), `match`, `exam`, `comprehensive_core`, `sentence_dictation`, `grammar_order`, `grammar_translate`, `speaking`, `conversation`, `reading`.
- `grammar_order`: chỉ cần câu ví dụ. Muốn đi đường không AI, FE gửi loại order tương ứng tới engine, không tự thêm translate.
- `grammar_translate`: cần câu ví dụ và bản dịch. `sentence_dictation`: cần câu ví dụ. Không có đủ thì hướng dẫn dùng từ, tự thêm dữ liệu, hoặc chủ động nhờ AI nếu có; không gọi AI tự động.
- Đọc enrichment và ghi chú **của đúng tài khoản**. Không được dùng một kết quả readiness làm cache chung cho nhiều người.
- Nhiều từ vượt giới hạn cần người dùng chọn phạm vi. Riêng comprehensive_core tự chia 5 từ/bài nên vẫn ready khi bộ lớn.
- 400 nếu word_ids chứa mục không thuộc bộ. 404 nếu không có quyền với bộ. Không cho FE đoán nội dung bằng ID khác.
- ready không bảo đảm provider còn quota hoặc nội dung đã được thẩm định chất lượng. Với AI, đây là readiness cho **tạo mới**; bài đã lưu vẫn được mở theo history của engine hiện có.

## 3. Học kết hợp: lõi và mở rộng

GET `/sets/:id/lessons` và `/sets/:id/lessons/:lesson_index` bổ sung:

- `completed_core_steps`, `total_core_steps=3`, `core_completed`.
- `all_steps_completed`: đủ cả 5 bước, giữ thông tin lịch sử.
- `completion_scope='core'`; **`completed` nay bằng `core_completed`**, không đòi hai bước AI.
- `completed_steps` vẫn đếm tổng số bước thật đã làm (0–5). Không dùng nó với mẫu số 3; tiến độ lõi dùng completed_core_steps/total_core_steps.
- Bước 1–3: `required=true`, `optional=false`.
- Bước 4–5: `required=false`, `optional=true`, `available=false` và blocked_reason AI_NOT_CONFIGURED khi chưa có AI. Không tự đánh dấu hai bước này là hoàn tất.

Điều kiện hoàn thành từng bước vẫn cần evidence thật từ server. Hoàn thành lõi có nghĩa đã làm các hoạt động, không phải đã nhớ lâu hoặc được chấm đạt kỹ năng nói.

FE ghi **Hoàn thành phần cốt lõi** sau 3 bước và đặt hai mục AI trong **Luyện thêm**. Người dùng vẫn mở bước tùy chọn trực tiếp như cũ khi có AI.

## 4. Nghiệm thu FE tối thiểu

1. Hồ sơ 15 phút → bài 20 phút hiển thị phần hôm nay ≤15 phút.
2. Học tới target → xong mục tiêu ngày nhưng chưa giả hoàn thành cả bài; reload giữ cursor.
3. Đổi thời gian giữa bài → bản nháp và phiên còn nguyên; request màn cũ bị 409 được xử lý rõ.
4. Nộp xong phần ngày rồi mở học thêm → giữ phần đã xong và không nhảy sang phiên khác.
5. Bộ thiếu ví dụ/dịch → biết trước khi vào chế độ, không để một màn trống rồi yêu cầu AI.
6. Không có AI → hoàn tất lõi 3 bước; hai bước mở rộng vẫn chưa hoàn thành, không bị che lỗi bằng dữ liệu giả.

Trạng thái kiểm thử được cập nhật ở `docs/product-refinement-be-validation.json`. Codex sở hữu tài liệu này; Anti ghi riêng kết quả FE.
