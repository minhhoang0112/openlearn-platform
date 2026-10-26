# Phối hợp đợt chỉnh trải nghiệm — Mốc 1

> **BE mới nhất: contract 1.20.0 / schema14 /156 route.** Đọc thêm `PRODUCT-REFINEMENT-PLAN-API.md`: kế hoạch chia bước theo thời gian, điều chỉnh hôm nay bằng revision, start đúng phiên/content_version, readiness bộ từ và hoàn thành lõi 3 bước không AI đã triển khai. Phần 1.19 bên dưới vẫn giữ nguyên.

> **Việc FE tiếp theo: Mốc 1B**, đọc `REFINEMENT-M1B-ANTI.md`. FE đã nối1.19, nhưng chưa nối planner/readiness/core1.20 và còn lỗi tìm kiếm ngoài100 bộ. Không xếp các phần này sang Mốc2. Mốc2 chỉ thay cấu trúc điều hướng/trang đích sau khi tích hợp1B đạt.

Đọc `PRODUCT-EXPERIENCE-AUDIT-2026-10-25.md` để hiểu vấn đề. Chỉ triển khai mốc dưới đây trước, không làm toàn bộ ba mốc cùng lúc.

## Phân công và tránh đụng file

- Codex: `server/**`, test BE, `docs/BE-NEXT.md`, `docs/BE-WORKLOG.md`, tài liệu hợp đồng này. Đang sửa SRS và bổ sung API hoạt động thống nhất.
- Anti: `src/**`, test FE, ghi nhận FE trong `docs/FE-REFINEMENT-STATUS.md`. Không sửa server, DB, .env hoặc các tài liệu Codex đang giữ. Không dùng chung UPGRADE-V2-STATUS.md cho lần này.
- Không tự thay tên trường API, giả dữ liệu, gọi AI tự động hoặc xóa engine cũ để làm demo.

## FE làm ngay, không cần chờ API

1. Sửa LessonRun mobile: tiêu đề/audio xếp dọc ở màn nhỏ; 360/390/768px vẫn đọc được câu hỏi và thao tác. Nút Tra từ không che nội dung/CTA.
2. Giữ luồng `/practice → /practice/:modeId → bài luyện` và ngữ cảnh `from` đã làm. Mở bài từ Lộ trình rồi thoát phải trở về đúng Lộ trình và chương đang chọn; lưu lựa chọn trong URL.
3. Home: bỏ tìm kiếm trùng và banner quảng bá chen nhiệm vụ. Không có lộ trình đang học thì hiển thị phần gợi ý, không gắn nhãn đang học cho fallback 20269.
4. Chuẩn hóa chữ: không hiển thị V2/next_local_day/contract; “Ngân sách” đổi thành “Thời gian học”. Không ghi “Đã thuộc vĩnh viễn”; phân biệt đã luyện và ghi nhớ theo lịch ôn.
5. Danh sách bộ từ/nghe có tìm kiếm và tải thêm/phân trang, giữ filter trong URL. Sử dụng dữ liệu/pagination thật; không chỉ lọc 100 bản đầu rồi tuyên bố đã tìm toàn kho.
6. Nút icon có aria-label, card thao tác có link/button thật, keyboard focus. Giữ engine học từ đang chạy và cấu trúc dữ liệu hiện có.

Chưa đổi toàn bộ sidebar hoặc tự redirect logo/Hôm nay ở mốc này; chờ thống nhất điều phối ở mốc 2.

## API BE đang chuẩn bị cho FE

- SRS: giữ API hiện có; ngăn câu đúng trước hạn ôn liên tục tăng repetitions/interval. Kết quả bổ sung metadata, không xóa lịch sử/tiến độ cũ.
- Hoạt động: endpoint mới `GET /api/v1/learning/activity?days=30&limit=20&offset=0`, có ngày học và lịch sử xuyên engine. Chờ mục “Đã sẵn sàng” bên dưới trước khi nối.
- `/learning/progress` giữ nguyên ý nghĩa các chỉ số V2/đánh giá kỹ năng. FE không đổi số câu đúng toàn hệ thống thành điểm kỹ năng hoặc điểm phát âm.

## Nghiệm thu

- Build và kiểm tra browser với dữ liệu thật từ API thử nghiệm; không chỉ báo TypeScript qua.
- 360/390/768/1440px; bài dở/reload/back; thiếu AI, thiếu ví dụ, rỗng, lỗi mạng.
- Ghi rõ file sửa, test đã chạy, phần chưa xong vào `FE-REFINEMENT-STATUS.md` để Codex kiểm tra sau. Không mở thêm tính năng ngoài mốc 1.

## Đã sẵn sàng

**BE đã sẵn sàng để FE nối: contract 1.19.0, schema 14.** Không đổi schema hoặc reset dữ liệu cũ.

### 1. Lịch ôn

`GET /capabilities` bổ sung `srs.review_policy='due_v1'`. Các API study/rating giữ nguyên input.

- Đúng khi chưa đến `due_at`: vẫn lưu câu trả lời và tiến độ bài luyện, nhưng giữ repetitions/ease/interval/due_at.
- Sai: đưa về learning, lịch học lại 10 phút. Luyện lại trước hạn không nhân phạt ease hoặc liên tục đẩy hạn ra xa.
- Đúng khi đến hạn: tăng lịch theo scheduler hiện có.
- Kết quả review mới có `review_policy`, `retention_updated`, `review_reason`. Không dựa vào các trường này trên dữ liệu lịch sử vì không backfill giả.
- Nhãn `mastered` cũ vẫn giữ. Không nói rằng mọi từ mang nhãn cũ đã được xác nhận qua chính sách mới.

### 2. Hoạt động chung

`GET /api/v1/learning/activity?days=30&limit=20&offset=0`, đăng nhập bắt buộc, envelope `{data, request_id}`.

```ts
interface LearningActivity {
  scope: 'cross_engine_activity';
  timezone: string;
  generated_at: string;
  window: { days: number; from_local_date: string; to_local_date: string };
  summary: {
    active_days: number;
    total_activities: number;
    distinct_words_practised: number;
    by_kind: Record<string, number>;
  };
  daily_activity: { date: string; activity_count: number }[];
  items: {
    id: string;
    occurred_at: string;
    kind: string;
    title: string;
    route: string;
    word_id: number | null;
  }[];
  total: number;
  limit: number;
  offset: number;
  limitations: string[];
}
```

`days`: 1–90; pagination dùng quy tắc API hiện có. Tổng và biểu đồ tính trên toàn cửa sổ, không chỉ trang `items` đang mở. Thời điểm ISO trả về UTC; nhãn ngày dùng `timezone` từ BE.

Nguồn gồm `vocabulary`, `srs_rating`, `lesson`, `mistake`, `listening`, `material_dictation`, `conversation`, `exercise`, `course`, `ai_feedback`, `audio_feedback`, `speaking_feedback`. Một activity là một lần nộp/đánh giá được lưu, không phải một bài hoặc một từ đã thuộc. Nghe bị skip, AI chỉ tạo câu hỏi/gợi ý, chỉ mở trang hoặc lưu playback không được cộng. Course chỉ có completion từ course_learning_sessions, chưa có toàn lịch sử học dở. Không suy ra số phút từ thời điểm.

FE nối tại Tiến độ: dùng `summary.active_days` cho ngày có hoạt động toàn hệ thống; giữ số bài V2 và điểm kỹ năng từ `/learning/progress` với nhãn đúng phạm vi. Tab lịch sử chung dùng endpoint này; `route` là đường mở nội dung liên quan, không cam kết luôn resume đúng attempt cũ của mọi engine. Giữ tab bằng chứng V2 riêng nếu cần.

Lịch sử thẻ đánh giá trực tiếp cũ chưa có event sẽ không được dựng lại. DB vẫn giữ tiến độ cũ. API không trả lời nói/viết, đáp án hoặc bản thu riêng trong activity.

Kiểm BE cuối: toàn bộ 112 ca đạt, gồm 5 ca mới của product-refinement. Contract 1.19.0 / schema14 /153 route. Lệnh: node --test --test-isolation=none --test-reporter=dot server/tests/*.test.mjs. Không gọi AI thật.
