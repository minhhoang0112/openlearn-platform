# MATERIAL-01 — thư viện nghe cá nhân

Contract **1.13.0**, schema **13**, **142 route**. BE đã triển khai. **FE-MATERIAL-01 chờ Anti**, chưa có màn nhập/phát học liệu riêng. Giáo trình27mục/158clip và dữ liệu cũ giữ nguyên.

Người học tự chọn file audio trên máy, nhập transcript/bản dịch nếu có và lưu học liệu riêng. Có lưu vị trí nghe, tốc độ và mốc A–B do chính người học chọn. Không gọi AI, không tải URL bên ngoài, không nhập PDF/OCR hoặc tự đoán timestamp từ chữ. Audio này được lưu trong SQLite của BE để mở lại; khác với endpoint nhận xét phát âm không lưu audio thô.

## API đã chạy

Prefix /api/v1. Tất cả cần cookie; mutation cần X-Requested-With: OpenQuiz. JSON envelope data/error giữ nguyên, riêng audio trả binary.

| Method | Route | data |
| --- | --- | --- |
| GET | `/learning/materials/capabilities` | Giới hạn và MIME hỗ trợ |
| GET | `/learning/materials?q=&limit=20&offset=0` | `{items,total,limit,offset}` chỉ của tài khoản hiện tại |
| POST | `/learning/materials` | Học liệu vừa nhập, thêm replayed;201 mới/200 retry |
| GET | `/learning/materials/:id` | Học liệu và playback đã lưu |
| GET | `/learning/materials/:id/audio` | Audio riêng tư, hỗ trợ một Range và206 |
| PATCH | `/learning/materials/:id` | Sửa metadata/text có revision |
| PUT | `/learning/materials/:id/playback` | Playback mới có revision |
| DELETE | `/learning/materials/:id` | `{deleted:true}`, xóa file/text/playback riêng này |

Cap: max_audio_bytes=8388608 (8MiB), max_json_bytes=12582912 (12MiB), max_duration_ms=3600000, max_transcript_characters=80000. MIME WAV/MP3/MPEG/WebM/Ogg/MP4/M4A. MIME chuẩn hóa mp3→mpeg, m4a→mp4. File không dưới44byte, base64 phải chuẩn và chữ ký container phải khớp. Không khẳng định codec phát được chỉ từ chữ ký file; FE phải thử decode trước nhập. Giới hạn mặc định các route JSON khác vẫn1MiB; chỉ route POST import được12MiB, kiểm đăng nhập trước đọc body.

POST:

```json
{
  "submission_id":"d53578af-464b-4cd4-a34e-e56d4424f08f",
  "title":"Bài nghe của tôi",
  "transcript":"First sentence.\nSecond sentence.",
  "translation":"Bản dịch tùy chọn",
  "source_note":"Ghi chú nguồn tùy chọn",
  "audio":{"mime_type":"audio/mpeg","data":"BASE64_KHONG_CO_TIEN_TO_DATA_URL"},
  "duration_ms":58000
}
```

Title tối đa200ký tự, transcript/translation mỗi trường80000, source_note2000. Transcript/dịch/ghi chú có thể bỏ trống, không tự sinh giả. WAV lấy duration từ header đã kiểm cấu trúc (`duration_source=wav_header`), không tin duration_ms do FE đưa để thay giá trị này. Định dạng nén bắt buộc duration_ms lấy từ browser metadata, từ200 đến3600000ms; trả `duration_source=browser_metadata`, BE không tự giải mã để xác minh thời lượng. FE phải lấy giá trị finite từ audio.duration, không suy từ dung lượng/độ dài transcript.

UUID giữ nguyên cho retry cùng import sau mất phản hồi; cùng UUID và nội dung khác trả409 IDEMPOTENCY_CONFLICT. Đổi file/nội dung cho một lần nhập mới tạo UUID mới. Cùng file với UUID mới có thể là học liệu riêng khác; không tự gộp transcript khác. Không tự retry import vô hạn, đặc biệt sau hành động xóa/chuyển màn.

Học liệu trả `id,title,transcript,translation,source_note,mime_type,audio_bytes,duration_ms,duration_source,revision,created_at,updated_at,audio_url,route,playback,assessment=not_assessed`. Không có base64/BLOB trong response. Danh sách chỉ có transcript_excerpt160ký tự thay transcript/dịch toàn bộ. route FE đề xuất `/materials/:id`, hub `/materials`; chưa hoạt động trước khi Anti nối.

## Sửa chữ và lưu vị trí

PATCH `{revision,title?,transcript?,translation?,source_note?}` cần ít nhất một text field. Metadata revision tăng độc lập; không đổi audio/duration/playback. Muốn thay file nhập học liệu mới. Giữ nội dung nhiều dòng. Revision cũ trả409 REVISION_CONFLICT, details.revision là hiện tại.

Playback mặc định:

```json
{
  "revision":0,
  "position_ms":0,
  "rate":1,
  "loop_start_ms":null,
  "loop_end_ms":null,
  "loop_enabled":false,
  "show_transcript":true,
  "updated_at":null
}
```

PUT gồm revision và ít nhất một field của state; hỗ trợ sửa một phần. Position/ms và mốc vòng phải nguyên, trong0…duration_ms. Rate số0.5…1.5. Boolean phải đúng kiểu. A/B cùng null hoặc cùng có giá trị, B sau A ít nhất200ms. Bật loop cần cả hai mốc; xóa vòng gửi cả hai null và loop_enabled=false. Ví dụ:

```json
{"revision":0,"position_ms":1700,"rate":0.9,"loop_start_ms":1000,"loop_end_ms":4200,"loop_enabled":true}
```

Response PUT là playback trực tiếp, tăng revision; không phải material. Metadata PATCH trả material. Hai cửa sổ ghi cùng playback revision chỉ một request thành công; request còn lại409. GET lại khi conflict, giữ input và không âm thầm dùng state cũ ghi đè state mới. Không coi metadata revision và playback revision là một.

Đây là vị trí/tùy chọn player, không phải điểm kỹ năng, số lượt shadowing hoặc chứng cứ đã hiểu. Nghe hết/seek đến cuối không tự đánh dấu mastered/hoàn thành bài V2, không cộng SRS hoặc Today. Tài khoản khác không đọc/sửa/xóa được id; dữ liệu không vào danh mục bài chính thức, dictionary hoặc tài khoản khác. DELETE chỉ tác động học liệu riêng và playback của nó; audio đã tải vào bộ nhớ browser vẫn cần FE dừng/dọn khi rời màn.

## Anti nhận FE-MATERIAL-01

1. Thêm **Học liệu của tôi** trong Thư viện hoặc Luyện tập, không cần một sidebar lớn mới. Hub /materials nối GET list/cap. Modal chọn file + tiêu đề + transcript/dịch/nguồn tùy chọn. Kiểm Blob.size, MIME và browser loadedmetadata/decoding error trước khi encode. MP3 thường phù hợp bài ngắn; file quá giới hạn báo rõ, không giả là đã nhập.
2. Dùng FileReader bỏ tiền tố data URL như luồng audio review. Chỉ POST khi bấm Nhập; giữ payload/UUID khi retry lỗi mạng. Không gửi đường dẫn ổ đĩa hoặc URL để BE tự tải. Không gửi file này tới AI khi nhập. Thể hiện ngắn “File được lưu riêng trên máy chạy BE”.
3. Detail /materials/:id có native/custom audio player từ audio_url, play/pause/tua, tốc độ, hiện/ẩn transcript/dịch. Áp dụng playback khi loadedmetadata; so sánh duration thực và metadata nếu khác, không tua vượt audio thực. Thử lỗi giải mã phải có retry hoặc hướng dẫn chọn lại file, không báo đã nghe.
4. A–B lấy từ currentTime thực của player khi bấm A/B; không tạo thời gian từ việc chia transcript. Khi bật lặp, tới B quay về A và tiếp tục. Đừng dùng audio.loop=true để thay A–B. Có clear loop, kiểm A/B trước lưu. Không cần tạo clip/cắt file trên BE.
5. Lưu vị trí sau pause/tua hoặc debounce, tránh mỗi timeupdate tạo request. Giữ một request đang chạy, dùng revision BE trả và chỉ lưu state mới nhất. GET/reload áp dụng đúng vị trí/rate/A–B. Khi đổi material/rời màn, dừng audio và chặn response cũ áp vào id mới. Không auto submit việc học.
6. Cho sửa transcript/dịch/tiêu đề có revision riêng; lỗi giữ input. Xóa học liệu cần người học chủ động chọn; sau xóa dọn audio, về hub. Không chạm bộ bài27mục, SRS, DB hoặc .env.
7. Không tự reset Today hoặc thêm thẻ bài như đã được chấm. Chưa có AI quiz, OCR, video import, căn transcript hoặc câu hỏi hiểu bài tự sinh trong tính năng này.

Kiểm FE: chọn file thực, file lớn/sai MIME, nhập/retry không trùng, riêng tư, reload và A–B đúng mốc, hai tab cùng lưu có409, sửa chữ không reset vị trí, lỗi media, rời màn, xóa. Thử WAV và một file MP3 thật trên browser; fixture ID3 trong test BE chỉ kiểm container, không chứng minh MP3 được giải mã. Không cần gọi Gemini.

## Nghiệm thu BE

**85 test toàn BE đạt**, gồm upload WAV trên1MiB, giới hạn8MiB và bodylimit từng route, privacy mọi thao tác, exact Range206, UUID, revision/race, metadata độc lập playback, A–B hợp lệ, định dạng nén ghi rõ nguồn duration, DB reopen và delete cascade. Đăng nhập được kiểm trước đọc upload; CSRF và test cũ giữ nguyên.

Native Chrome **5 kiểm tra media đạt** với WAV thực: nhập riêng, giải mã khớp duration header, byte Range đúng, áp vị trí/tốc độ đã lưu và xóa làm endpoint404. Báo cáo material-audio-validation.json có product_material_ui_tested=false: đây không phải nghiệm thu giao diện Materials chưa được tạo. Không gọi AI hoặc nghe duyệt bằng loa/micro thật.

Hai bảng learning_materials (có audio BLOB) và learning_material_playback. Backup trước schema13: server/data/pre-learning-materials-1792595301518.sqlite. ZIP tài liệu không chứa DB hoặc audio cá nhân.
