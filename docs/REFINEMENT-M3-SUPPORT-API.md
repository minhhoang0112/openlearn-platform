# Mốc3 đợt1 — Kiến thức hỗ trợ cho4 bài nền tảng

Đã triển khai BE và nối trực tiếp vào runner FE ngày26/10/2026. Contract **1.21.0 / schema14 /157route**. Không cần Anti dựng dữ liệu hoặc viết lại panel.

## Phạm vi đã có

- Giới thiệu bản thân (`foundation-introductions-01`).
- Giờ giấc và lịch học (`foundation-time-01`).
- Nhờ giúp đỡ và nói điều chưa làm được (`foundation-help-01`).
- Một ngày học tập (`foundation-routine-01`).

Tổng25 mục từ/cụm có nghĩa theo ngữ cảnh, từ loại, câu ví dụ và bản dịch;8 nhóm ghi chú ngữ pháp;9 lỗi thường gặp có cách sửa/lý do;8 mẫu nói/viết có dịch. Có hướng dẫn nghe và nhắc lại. Đây là nội dung soạn sẵn cho thử nghiệm người học, không phải khóa được chứng nhận hoặc audio đã được người thẩm định.

Chưa mở rộng toàn bộ18 bài nền tảng hoặc mọi bộ từ trong thư viện. Không đổi ví dụ/ghi chú cá nhân.

## API

Response LearningSession thêm trường:

```ts
learning_support?: {
  available: boolean;
  title: string | null;
  support_version: number | null;
  used_before_submission: boolean;
};
```

`POST /api/v1/learning/sessions/:id/support/open`

```json
{"step_id":"ID bước hiện tại"}
```

Trả `{data:{support,session,recorded_as_assistance},request_id}`. Type LearningSupport đầy đủ tại `src/api/client.ts`.

- Đăng nhập, quyền sở hữu session và bước hiện tại được kiểm tra trên BE. Không mở notes của bước tương lai qua request cũ/sai.
- Chỉ phục vụ notes khi lesson_id, content_version và fingerprint nội dung lưu trùng với bản được soạn hỗ trợ. Version mới hoặc bản nội dung đã được tùy biến không nhận nhầm notes cũ.
- Trước submit: lưu `state.support_used[step_id]=true` trong session. Không tăng revision, không sửa draft/cursor/điểm hoặc thay phiên. Đây là annotation độc lập; request lưu draft đang diễn ra không bị vô hiệu chỉ vì mở notes.
- Khi submit, BE tự hợp nhất `learning_support` vào feedback.assistance_used nếu đã mở hỗ trợ. Client gửi assistance_used rỗng không xóa được annotation. Gửi lại cùng submission_id vẫn idempotent.
- Đóng panel/reload không làm lượt đã được trợ giúp thành tự làm độc lập. Cờ theo bước, không tự áp cho mọi bước còn lại.
- Mở notes sau khi đã chấm không viết lại điểm hoặc bằng chứng của câu đã nộp.
- Không gọi AI, không tạo generated_content, không thêm hoạt động học chỉ vì mở panel. Chỉ khi nộp bài mới ghi hoạt động như cũ.
- 401 chưa login;404 không sở hữu session hoặc chưa có gói phù hợp;409 bước đã thay đổi;400 field không hỗ trợ.

## Bảo toàn dữ liệu

Không migration DB, không thêm version bài học mới, không sửa content/answer của các bản đã xuất bản. Notes là lớp tài liệu hỗ trợ riêng trong `server/content/learning-v2/foundation-support.mjs`; không ghi đè ví dụ của học viên hoặc reset progress. Chỉ metadata hỗ trợ có support_version riêng.

## FE đã nối

- Component `src/components/LessonSupportPanel.tsx`, đặt trước câu hỏi trong `LessonRunView.tsx`.
- Mặc định gọn; bấm **Kiến thức cho bài này** mới mở. Các nhóm từ, ngữ pháp, lỗi, nghe/nói và mẫu nói/viết gấp mở riêng. Nhóm phù hợp với bước hiện tại được mở sẵn.
- Giải thích rõ việc xem trước submit được ghi nhận có trợ giúp. Không hiển thị mã contract/schema hoặc nhắc mua AI.
- Giữ lựa chọn/bài viết đang nhập; response cũ sau đổi bước bị bỏ. Chỉ cập nhật session ở parent nếu ID/cursor khớp và revision không lùi.
- Đóng/mở lại trong cùng bước dùng pack đã tải. Bài chưa có gói tương ứng giữ runner cũ, không tự mượn dữ liệu bài khác.

Anti giữ các sửa hiện có. Nếu chỉnh kiểu dáng sau này, giữ trạng thái trợ giúp, điều kiện phiên bản, draft và chống response cũ. Ghi FE riêng trong FE-REFINEMENT-STATUS.md, không sửa server hoặc hợp đồng này.

## Kiểm chứng

- Toàn bộ **123 kiểm thử BE đạt**, gồm5 nhóm mới cho nội dung, annotation, draft, ownership/version và DB reopen. Sau sửa nội dung giải thích giới từ, browser kiểm lại trên BE mới.
- Build production qua.
- `scripts/verify-foundation-support-browser.mjs`:7 nhóm qua,0page errors,0POST tạo AI. Kiểm360/390/768/1440px, xem notes không mất lựa chọn, draft sau reload, annotation thật và bài ngoài phạm vi.
- Ảnh kiểm tra tại `docs/product-audit/m3-support-*.png`; JSON tại `docs/foundation-support-browser-validation.json`.
- Kiểm tự động chưa thay thế quan sát người học thật hoặc nghe duyệt chất lượng TTS. Bước tiếp theo là học thử4 bài để chỉnh độ dễ hiểu trước khi mở rộng giáo trình.
