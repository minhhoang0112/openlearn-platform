# MATERIAL-03 — Nhập/xuất phụ đề cho học liệu cá nhân

**Contract1.15.0 / schema14 / 148 route.** Codex làm BE/tests, Anti làm FE. Không đổi DB schema, AI/model/key, không tải URL hoặc video ngoài. Mục tiêu: có file SRT/VTT đi kèm audio thì nhập mốc có sẵn, không gõ lại từng câu. Tiếp nối MATERIAL-02, không mở thêm menu chính.

## Luồng FE-MATERIAL-03

Ở editor câu trong `/materials/:id`: “Nhập SRT/VTT” → chọn file UTF-8 hoặc dán nội dung → xem trước → sửa danh sách → xác nhận thay danh sách câu. **Preview chưa lưu**; hủy/đóng không đổi dữ liệu. Nếu editor có draft cũ, phải hỏi trước khi thay draft. Khi lưu có câu cũ, nói rõ đây là thay toàn bộ; lịch sử nghe chép cũ vẫn giữ snapshot. Không append rồi tự ghép ID/mốc hoặc tự lấy bản dịch bằng AI.

Có “Xuất SRT”/“Xuất VTT” cho **bản đã lưu**, tạo Blob tải file trên trình duyệt từ JSON. Không xuất nội dung draft chưa lưu, lịch sử đáp án, audio hoặc bản dịch. Có thông báo bản dịch không nằm trong file xuất.

## API

Tiền tố `/api/v1`; cookie phiên, POST có `X-Requested-With: OpenQuiz`. Envelope `{data,request_id}`. Chủ học liệu đọc/ghi, tài khoản khác404, chưa đăng nhập401. Cả hai route không thay đổi dữ liệu.

### POST /learning/materials/:id/cues/preview-import

```json
{"format":"srt","content":"1\n00:00:00,500 --> 00:00:02,000\nThe server is online.\n\n2\n00:00:02,500 --> 00:00:04,000\nPlease check the network."}
```

`format:'srt'|'vtt'` bắt buộc. `content` là text tối đa200000ký tự, không base64/filepath/URL. FE kiểm kích thước trước đọc và phát hiện lỗi UTF-8 bằng TextDecoder('utf-8',{fatal:true}); không đoán encoding ANSI. BOM/CRLF được chấp nhận. Ngoài format/content400. Trả200:

```json
{"material_id":"...","format":"srt","revision":0,"cues":[{"id":"UUID mới","start_ms":500,"end_ms":2000,"text":"The server is online.","translation":""}],"warnings":[],"saved":false,"alignment":"supplied_timestamps","translation_generated":false,"limits":{"max_cues":200,"max_cue_text_characters":2000,"max_total_text_characters":80000,"max_comparison_tokens":500,"min_cue_duration_ms":200,"alignment":"manual","ai_required":false,"max_subtitle_characters":200000}}
```

Cues đầy đủ, không chỉ ví dụ1 câu trên. Mỗi preview tạo UUID mới, **không giữ ID phụ đề bên ngoài**; ID không phải bằng chứng đã lưu. `revision` là bản cues BE lúc preview. Lưu bằng **PUT /learning/materials/:id/cues** đã có với `{revision:preview.revision,cues:draft}`; chặn double click, xử lý409 giữ draft và cho đối chiếu. Không lấy revision mới rồi tự ghi đè. Sửa danh sách sau preview dùng cùng validator MATERIAL-02. Không đổi metadata transcript toàn bài hoặc playback.

### GET /learning/materials/:id/cues/export?format=vtt

Format mặc định vtt, chỉ nhận srt/vtt. Data `{material_id,revision,format,content,mime_type,filename,cue_count,translation_included:false}`. Filename do BE tạo `material-UUID.srt/vtt`; content là chuỗi, không response file nhị phân. FE tạo Blob, click download, revoke ObjectURL đúng lúc. VTT MIME `text/vtt;charset=utf-8`; SRT `application/x-subrip;charset=utf-8`. Nút chỉ xuất câu đã lưu; rỗng thì FE nên disable (BE vẫn trả file rỗng/header với cue_count0).

Text một dòng hoặc xuống dòng đơn được xuất, ký tự &,<,> được escape. Text có dòng trống nội bộ, CR hoặc NUL nhận400 `UNSUPPORTED_SUBTITLE`: yêu cầu chỉnh câu trước, không âm thầm cắt đoạn. Bản dịch lưu trong app không mất nhưng không đưa vào subtitle export. Roundtrip giữ text/thời gian với tập hỗ trợ; UUID mới khi import lại.

## Tập định dạng hỗ trợ và giới hạn

- SRT: index số tùy chọn, `HH:MM:SS,mmm --> HH:MM:SS,mmm`, lời nhiều dòng. Chưa hỗ trợ tọa độ sau timestamp.
- VTT: header WEBVTT + dòng trống, cue ID tùy chọn, `MM:SS.mmm` hoặc `HH:MM:SS.mmm`. NOTE/STYLE/REGION được bỏ với warning; thiết lập hiển thị sau timestamp bỏ với warning. X-TIMESTAMP-MAP bị từ chối vì chưa chuyển mốc MPEGTS sang audio cá nhân.
- Chuyển markup thành text, giải mã entity một lần, không render HTML. FE **không dùng dangerouslySetInnerHTML** cho preview/câu/phản hồi. Giữ xuống dòng; không tự coi dòng2 là tiếng Việt. Nếu file song ngữ, người học sửa text/translation trong draft trước lưu.
- Warnings `{code,count}`: MARKUP_REMOVED, METADATA_BLOCK_IGNORED, HEADER_METADATA_IGNORED, CUE_SETTINGS_IGNORED. FE có nhãn tiếng Việt; không chỉ console.log. Có warning vẫn cho xem/sửa/lưu chủ động.
- Áp dụng chung validator cues:≤200 câu, mỗi text/bản dịch≤2000ký tự, tổng≤80000,≤500 từ so sánh/câu, mỗi câu≥200ms, trong duration của file, không chồng nhau và đúng thứ tự. VTT tổng quát có thể có cue chồng nhau; app luyện lần lượt **từ chối**, không tự cắt/chuyển mốc. Không hứa hỗ trợ mọi file SRT/VTT.
- Sai timestamp/cấu trúc/không có câu:400 INVALID_SUBTITLE; tính năng chưa hỗ trợ400 UNSUPPORTED_SUBTITLE; vi phạm giới hạn VALIDATION_ERROR/INVALID_CUE. Không trả200 với vài câu rồi bỏ lỗi. Preview lỗi không đổi cues/lịch sử.
- Mốc lấy từ file phụ đề, **chưa xác nhận khớp âm thanh**. Người học nghe thử và sửa trước lưu; không nhận diện giọng nói, dịch hoặc gọi AI.

Tham khảo cấu trúc WebVTT từ [W3C WebVTT](https://www.w3.org/TR/webvtt1/). Đây là parser con cho bài luyện, không tuyên bố là trình render tuân thủ đầy đủ WebVTT.

## Nghiệm thu FE

1. Giữ18 ca MATERIAL-02. Import SRT BOM/CRLF và VTT có ID/lời nhiều dòng; preview đúng mốc, dữ liệu BE chưa đổi trước confirm.
2. Hủy preview giữ danh sách/draft cũ. Confirm ghi một lần, reload vẫn còn, luyện nghe chép hoạt động trên câu vừa nhập.
3. File sai/quá lớn/chồng mốc/vượt duration không ghi gì; có warning thì thấy được. File ANSI không đoán bừa. Không gọi AI.
4. Hai tab: preview rồi tab khác sửa, confirm409 và giữ draft. Route đổi không nhận response cũ. Không render markup thành HTML.
5. Export bản lưu ra SRT/VTT, mở lại preview đúng text/mốc, không có bản dịch/lịch sử; Blob URL được dọn. Draft chưa lưu không lẫn trong file xuất.

Không sửa server/.env/DB hoặc BE-NEXT/BE-WORKLOG. Cập nhật phần FE trong STATUS từ bản mới trên đĩa; không Overwrite buffer cũ. Bản BE kiểm ở `server/tests/material-subtitles.test.mjs` cùng hồi quy cues.
