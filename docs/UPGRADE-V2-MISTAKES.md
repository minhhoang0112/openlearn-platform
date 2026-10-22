# Sổ lỗi — API đã sẵn sàng cho Anti (FE-03)

21/10/2026, contract1.5.0/schema 8, tổng116 route. Giữ nguyên các endpoint phiên/bài học. Bổ sung4route và một trường summary của Today. Không gọi Gemini. Chỉ ghi câu lựa chọn đã chấm sai trong **bài học V2**; chưa gom lỗi từ mọi màn /grammar, /reading hoặc lỗi tự khai của bài nói/viết.

## Luồng FE

Thêm màn `/mistakes` trong nhóm Ôn tập, có bộ lọc Đến hạn/Đang ôn/Đã ôn đạt/Tất cả. Today nhận trường mới `mistake_summary:{total,active_count,resolved_count,due_count,route:'/mistakes'}`. Có thể thêm thẻ nhỏ/nút ôn lỗi; không đổi cách parse items kế hoạch cũ, không giả đây là item lesson. Các số lấy BE.

Khi submit câu nghe/ngữ pháp V2 sai, `feedback.mistake_id` mới trả có thể dùng làm liên kết 'Xem trong sổ lỗi'. Trường này không có trên mọi feedback/lịch sử cũ. Lỗi được ghi tự động trên BE trong cùng transaction nộp câu, FE không POST thêm để ghi lỗi lần nữa. Giữ nguyên phản hồi của bài hiện tại cho đến người học chọn Tiếp tục.

## Endpoint (base /api/v1)

| Method/path | Đầu vào | data |
| --- | --- | --- |
| GET /learning/mistakes | status=active/resolved/all, due_only=true/false, limit1..100, offset≥0 | items,total,limit,offset,summary |
| GET /learning/mistakes/:id | — | chi tiết một lỗi và question an toàn |
| GET /learning/mistakes/:id/reviews | limit/offset | items[{submission_id,response,feedback,created_at}],total,limit,offset |
| POST /learning/mistakes/:id/reviews | JSON bên dưới | feedback,mistake,summary,replayed |

Mặc định statusactive,due_onlyfalse,limit20. total là số dòng theo bộ lọc; summary là tổng thực toàn tài khoản, không chỉ trang hiện tại. Mọi API yêu cầu cookie; mutation cần X-Requested-With: OpenQuiz. Lỗi của tài khoản khác trả404.

List items gồm id,lesson_id,content_version,step_id,lesson_title,type,prompt,wrong_count,review_count,correct_streak,required_correct:2,statusactive/resolved,due,due_at,last_wrong_at,last_reviewed_at,resolved_at. wrong_count là tổng lượt sai nguồn và sai khi ôn; review_count chỉ là lượt ôn riêng, không phải tổng lượt học cả bài.

Detail thêm:

- `question`: id/type/title/prompt/response_schema/options; không có answer/explanation trước khi ôn. Options có thể đổi thứ tự nhưng **ID giữ nguyên**; không chọn đáp án theo vị trí.
- `hint`: hướng dẫn cấu trúc nếu có; mặc định gập, xem thì ghi hỗ trợmodel.
- `media.url`: WAV đã có, audio cùng cookie, không đọc qua JSON client.
- `transcript`, `translation`: mặc định gập; mở thì ghi hỗ trợ tương ứng.

Lịch sử reviews chứa kết quả đã chấm và đáp án/giải thích của những lượt trước. Cho người học xem lại được; nếu đang làm lượt nhớ lại mà mở lịch sử thì ghi `assistance_used:['model']`. Không dùng lịch sử làm nguồn tự chấm trên FE. Bản đầu chưa có ghi chú thủ công/xóa lỗi/thêm lỗi từ AI.

## Nộp một lượt ôn

```json
{
  "submission_id":"b6f63482-e03e-4de5-b884-902c3ad72402",
  "response":{"option_id":"a"},
  "assistance_used":[]
}
```

submission_id dùng crypto.randomUUID(). Giữ cùng ID và payload khi retry sau lỗi mạng. assistance_used chỉ nhận transcript/translation/model, không trùng, tối đa3. Phải ghi những hỗ trợ người học đã mở trong lượt hiện tại; đừng reset cờ ngay trước khi nộp. Không cần revision ở API này; BE serialize/check trạng thái đến hạn trong transaction.

Feedback gồm assessment_statusgraded, correct, independent, expected_option_id, explanation, assistance_used, counts_toward_resolution, correct_streak, required_correct2, resolved,message. Dùng mistake/summary trả về cập nhật danh sách; không tự cộng bộ đếm FE. Giữ kết quả để người học đọc; mở câu tiếp theo là thao tác chủ động của FE.

## Lịch ôn và ý nghĩa tiến độ

- Câu sai lần đầu: đến hạn ngay, gom một mục theo tài khoản+bài+phiên bản+bước; các lần sai thực tiếp theo tăng wrong_count, không tạo dòng trùng.
- Sai khi ôn: chuỗi đúng về0, lượt tiếp sau10phút.
- Đúng không hỗ trợ: chuỗi tăng1, lượt tiếp sau24giờ. Hai lượt đúng liên tiếp trên lịch đến hạn thì statusresolved,due_atnull.
- Đúng có hỗ trợ: correcttrue nhưng không tăng tiêu chí tự nhớ, chuỗi về0, ôn sau24giờ. Hiện rõ 'đúng với hỗ trợ'.
- Không cho bấm liên tục để hoàn thành. Dùng due/due_at từ BE để bật/tắt nút nộp; xem lại câu/lịch sử vẫn được.
- Resolved chỉ có nghĩa đã đạt tiêu chí ôn của câu này, không phải thành thạo tiếng Anh/đạt trình độ/chứng chỉ. Không tăng mastery từ/SRS hoặc XP bằng FE.
- Sai lại trong một lượt học mới của bài gốc: cùng mục lỗi được mở lại, lịch sử review giữ nguyên. Phiên bản bài mới có mục riêng để không chấm bằng đáp án khác.

Lịch này là tiêu chí của ứng dụng, chưa phải thuật toán thích nghi tối ưu đã được đánh giá trên người học. Đồng hồ và thời điểm đến hạn lấy BE; FE hiển thị theo timezone profile.

## Lỗi và replay

- 409 REVIEW_NOT_DUE, details.due_at: cập nhật thời gian/nút ôn, không lặp request tự động.
- 409 MISTAKE_RESOLVED: tải lại mục và chuyển nhóm đã ôn đạt; không giả lỗi mạng.
- 409 IDEMPOTENCY_CONFLICT: cùng submission_id nhưng nội dung khác; không âm thầm tạo ID mới để nộp lại.
- 400 INVALID_RESPONSE/VALIDATION_ERROR: giữ lựa chọn và hiện lỗi.
- Cùng ID/nội dung đã xử lý trả replayedtrue, không tăng wrong_count/review_count lần nữa. Kết quả feedback là kết quả lần nộp đó; mistake/summary là trạng thái hiện tại.

Không có reset/xóa tự động. Không xóa database để thử. Migration8 tự nhập các câu V2 đã chấm sai từ lịch sử hiện có đúng một lần, bỏ qua self-review; giữ nguyên tài khoản, bài, phiên và SRS.

## Bằng chứng kiểm tra

Đã chạy toàn BE51 test đạt sau migration; sau bổ sung liên kết mistake_id/lịch sử đã chạy lại10 test sổ lỗi+luồng V2 đều đạt. Bao gồm quyền tài khoản, replay, ngày đến hạn, hỗ trợ không tính tự nhớ, mở lại lỗi, version bài bất biến và migration lịch sử. Chưa có xác nhận FE-03 tích hợp. Anti kiểm tra một luồng sai câu → thấy lỗi → ôn → reload → xem lịch sử bằng dữ liệu tạm; không thay đồng hồ máy/DB thật để giả qua24giờ.
