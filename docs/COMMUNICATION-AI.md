# Giao tiếp AI — trò chuyện và hướng dẫn song ngữ

Ngày 02/11/2026. Contract **1.24.0**, SQLite schema **15**, **175 HTTP routes** và một WebSocket.

## Sử dụng

Mở menu **Giao tiếp AI** tại `/communication`. Chọn mức hỗ trợ, cách luyện và tình huống rồi vào phòng. Người mới có mẫu câu và nghĩa tiếng Việt trước khi mở mic. Có năm tình huống: làm quen, sinh hoạt hằng ngày, nhờ giúp, tự do và IT/System tự chọn. Sáu mức hỗ trợ từ mới bắt đầu tới C1 là cấu hình cách trò chuyện, không phải kết quả kiểm tra CEFR.

Trong phòng, bấm **Bắt đầu gọi thoại** để cấp quyền mic. Có mic hai chiều, ngắt lời qua giọng nói, tắt/bật mic, dừng phát, chỉnh tốc độ nghe và nhập chữ trong cùng cuộc gọi. Ngoài cuộc gọi, gửi chữ dùng AI văn bản đã cấu hình. Mẫu mở đầu có sẵn không tốn lượt AI.

AI theo yêu cầu mới nhất của người học; mức độ, cách luyện và tình huống chỉ là gợi ý bắt đầu. Có thể hỏi tiếng Việt, đổi chủ đề, nhờ giải nghĩa, học ngữ pháp, soạn câu hỏi/hội thoại/truyện. Với người mới, AI được hướng dẫn giải thích bằng tiếng Việt trước, đưa ví dụ tiếng Anh kèm nghĩa và chờ người học hiểu. Khi đang luyện đối đáp, hỏi tối đa một câu mỗi lượt; yêu cầu soạn nhiều câu vẫn được đáp ứng. Không áp trần cứng 1–2 câu cho lời giải thích.

Ba nút **Tôi chưa hiểu / Giúp tôi trả lời / Nói dễ hơn** gửi yêu cầu hướng dẫn riêng (source `help`), không giả làm lời nói tiếng Anh của người học và không xóa câu đang soạn. **Giải thích câu này** chọn đúng lượt AI cần hỏi. Trong cuộc gọi, yêu cầu đi vào cùng kết nối Live; ngoài cuộc gọi dùng API văn bản. Các ví dụ trả lời không được xem là thông tin cá nhân thật. Policy ở `server/communication-policy.mjs`; chất lượng vẫn cần người học nghiệm thu.

Sửa tiếp 02/11: beginner/A1 được hướng dẫn tiếng Việt ở cả chế độ tự do và đóng vai; một câu thực hành tiếng Anh không được coi là yêu cầu chuyển hẳn sang tiếng Anh. Policy yêu cầu giữ lựa chọn ngôn ngữ rõ ràng gần nhất trong ngữ cảnh, vẫn cho người học chủ động yêu cầu luyện tiếng Anh. Đây là hướng dẫn cho model, không phải bảo đảm tuyệt đối về mọi câu trả lời. Khi cập nhật policy cần dừng và kết nối lại cuộc gọi.

Luồng Live chuyển gói âm thanh/bản chép tới trình duyệt trước khi lưu đầu vào; bỏ ghi DB và ACK trùng nếu lời người học/trạng thái không đổi. Kết thúc/ngắt lời vẫn lưu lượt đầy đủ. Nhãn bản chép tạm nghĩa là provider đang truyền lượt thoại, không có nghĩa SQLite đang chờ lưu. Ca hồi quy 100 gói audio xác nhận không phát sinh ghi DB/ACK lặp; 12 ca Giao tiếp AI và build đạt sau sửa. Không kết luận nguyên nhân trễ thực tế chỉ từ nhãn này; tốc độ model, mạng và hàng đợi phát âm thanh cũng có thể ảnh hưởng.

Phép thử Gemini Live thật hai lượt ở chế độ tự do: yêu cầu hướng dẫn tiếng Việt rồi nói “I like music.”, cả hai phản hồi vẫn có hướng dẫn tiếng Việt. Âm thanh đầu tiên khoảng 0,8 giây; provider báo hoàn tất sau khoảng 10–11 giây. Đây là một phép thử tổng hợp, không phải số đo độ trễ của cuộc gọi người dùng. Báo cáo: `communication-language-provider-check.json`.

Sửa tiếp mất tiếng 02/11: `suppressed` trước đây bị bật cả khi không có lượt AI đang phát sinh, khiến toàn bộ âm thanh của lượt kế tiếp bị bỏ đến khi nhận turnComplete. Đặc biệt gặp sau dừng phát, trợ giúp hoặc nghe lại trong lúc idle. Hook nay theo dõi riêng responding/complete/playing, chỉ chặn phần còn lại của lượt hiện tại; interruption/turnComplete giải phóng chặn, local replay vẫn tránh trộn âm thanh. Khi audio tạm hết mà provider chưa kết thúc thì hiện đang nghĩ thay vì luôn báo đang nghe. Kiểm tra Chrome bổ sung đếm gói PCM chuyển vào worklet và sự kiện playing thực, không chỉ kiểm tra chữ xuất hiện. 15 nhóm Chrome, 12 ca Giao tiếp AI và build đạt. Chưa xác nhận loa vật lý của người dùng.

Đối chiếu mã nguồn LabEx chỉ đọc: cả hai dùng `gemini-3.8-live`; LabEx đã chặn tiếng theo trạng thái responding, còn OpenLearn trước sửa chặn vô điều kiện. LabEx mặc định cắt khoảng lặng 500 ms, OpenLearn cho beginner/A1 1200 ms để chừa thời gian nghĩ câu. Khác biệt này và prompt/ngữ cảnh ảnh hưởng cảm giác đáp lời; không có phép đo đối chứng chứng minh bên nào thông minh hơn. Policy OpenLearn bổ sung chấp nhận câu vụn/lẫn Việt–Anh, nhận ý nếu rõ hoặc hỏi xác nhận khi mơ hồ, không lặp câu hỏi chỉ vì ngữ pháp sai.

Phòng dùng chiều cao màn hình, chỉ khung hội thoại cuộn; mic, ô nhập và trợ giúp luôn ở dưới. Mẫu câu, thiết bị, ghi nhớ và tổng kết mở riêng bằng hộp thoại. Thu gọn thanh tìm kiếm trong phòng, giữ Trang chủ/logo và các trang khác.

**Dịch** và **Nghe lại** dùng được cả trong cuộc gọi. Bản dịch được lưu theo lượt, yêu cầu trùng đang chờ dùng chung, không khóa phiên Live. Nghe lại ưu tiên âm thanh AI đã nhận còn trong RAM. Khi không có, BE tạo giọng đọc Gemini một lần rồi lưu tạm; có thể tốn lượt AI. Phát qua audio player riêng, không phụ thuộc giọng Web Speech của máy. Khi nghe lại, mic và âm thanh AI trực tiếp tạm dừng ở trình duyệt; trạng thái tắt mic do người học chọn được giữ khi phát xong.

## Lịch sử và ghi nhớ

- Phiên và lượt thoại lưu ở SQLite theo tài khoản. Tìm trong tiêu đề/nội dung, phân trang, xem các lượt cũ, mở tiếp phiên, xuất JSON và xóa có xác nhận.
- Text request có submission_id: gửi lại cùng nội dung không tạo hai lượt hoặc gọi AI lần nữa sau khi đã có phản hồi. Nếu AI lỗi, lời người học đã gửi vẫn lưu và có thể thử lại.
- Live lưu bản chép khi nhận được, có trạng thái final/partial/interrupted và xác nhận từ server. Dòng đang nhận chưa có xác nhận được ghi rõ. Lịch sử là nội dung AI đã tạo/nhận được, không đảm bảo người học đã nghe hết mọi âm thanh được phát.
- Bản chép có thể sai. Người học có thể nhập lại câu đúng để làm rõ, không đánh đồng lỗi nhận dạng với phát âm sai.
- AI tham khảo tối đa 24 lượt gần nhất trong phiên, tối đa 20 ghi nhớ người học tự lưu và ba tổng kết gần đây của các phiên bật ghi nhớ. Không gửi toàn bộ lịch sử mỗi lượt hoặc hứa nhớ nguyên văn mọi phiên.
- Ghi nhớ do người học thêm/sửa/xóa, tối đa 50 mục. Ghi nhớ tạo trong phòng có source_session_id; xóa phiên xóa cả ghi nhớ có nguồn đó và tổng kết. Không tự suy nghề nghiệp hay danh tính từ lời đóng vai.
- Tắt ghi nhớ khi tạo phiên sẽ bỏ ngữ cảnh các phiên trước/ghi nhớ và không cung cấp tổng kết của phiên đó cho phiên khác. Lịch sử phiên vẫn lưu.
- Dừng cuộc gọi và chờ yêu cầu đang xử lý xong trước khi sửa ghi nhớ hoặc xóa phiên, tránh giữ ngữ cảnh vừa xóa trong kết nối đang mở.

Kết thúc có hai lựa chọn: lưu kết thúc không AI, hoặc xin tổng kết AI. Tổng kết dựa trên tối đa 60 lượt gần nhất, có vài cụm và việc luyện tiếp, không phải điểm thi. Lưu kết thúc không phụ thuộc thành công của tổng kết; tổng kết lỗi có thể thử lại. Mở tiếp không tạo phiên mới; lượt mới làm tổng kết cũ hết hiệu lực.

## Cấu hình và giới hạn

`GEMINI_LIVE_MODEL=gemini-3.8-live`. `GEMINI_LIVE_API_KEY` tùy chọn; mặc định lấy key chính đầu tiên trong GEMINI_API_KEY. Model Live độc lập với model văn bản và override cá nhân trên màn hình Cài đặt AI. Không tự dùng key phụ khi Live hết quota. Key chỉ ở BE.

Mặc định một cuộc gọi/tài khoản, tối đa hai cuộc gọi toàn máy chủ, 20 phút/lần. Lỗi quota tạm nghỉ kết nối Live 60 giây; cấu hình chat thành công không chứng minh quota Live còn. Các giới hạn này phục vụ bản dùng cá nhân hiện tại, chưa phải cấu hình phục vụ tải lớn.

Sửa lỗi khởi tạo mic/loa 02/11: trên Chrome có setSinkId, AudioContext xử lý với sink none để đồng hồ thu mic không phụ thuộc loa mặc định Windows. Âm thanh AI vẫn được nối qua MediaStreamAudioDestination tới HTMLAudioElement phát ra loa/tai nghe thật; không bỏ tiếng trả lời. Có danh sách mic/loa, tải lại thiết bị và Bật lại loa. Lỗi phát loa không chặn thu mic. Mỗi giai đoạn (lấy mic, resume AudioContext, tải worklet, kết nối AI) có thời gian chờ và thông báo riêng. Dừng/thất bại xóa thông báo chờ cũ, thu hồi track kể cả stream trả về muộn. Trình duyệt không có setSinkId dùng AudioContext mặc định và cùng cơ chế kiểm tra/thời gian chờ.

Âm thanh đi qua BE tới Gemini Live; web không lưu file ghi âm microphone. Chỉ âm thanh AI/giọng đọc được giữ tạm trong RAM để nghe lại: TTL 10 phút, tối đa 16 đoạn/16 MiB toàn máy chủ, 4 MiB PCM/đoạn, xóa khi xóa phiên hoặc dừng server. Cache có khóa tài khoản/phiên/lượt/nội dung. Không có âm thanh cache thì tạo giọng đọc riêng, tối đa một yêu cầu tạo đồng thời, chờ tối đa 25 giây và nghỉ 60 giây khi quota. Browser thu hồi blob URL khi rời phòng. Browser dùng PCM16/16kHz gửi, PCM16/24kHz nhận, AudioWorklet và microphone echo cancellation. Tốc độ nghe Live dùng resampling nên có thể đổi cao độ; chưa phải thuật toán giữ nguyên cao độ. HTTPS hoặc localhost là điều kiện mở mic.

Chạy `npm run dev:all` sau khi dừng bản BE cũ. Vite đã bật WebSocket proxy cho /api. Khi đưa lên host cần reverse proxy chuyển cả HTTP lẫn Upgrade của `/api/v1/communication/live`, giữ cookie và Origin đúng FRONTEND_ORIGINS. Không dùng API key phía client.

## Hợp đồng BE

Các route dưới đây đều cần cookie đăng nhập, mutation cần X-Requested-With: OpenQuiz.

| Route dưới /api/v1 | Nội dung |
| --- | --- |
| GET /communication/catalog | Tình huống, mức hỗ trợ, cách luyện |
| GET /communication/capabilities | Text và Live tách riêng; configured không xác nhận quota |
| GET /communication/sessions?q=&limit=&offset= | Lịch sử và tổng số của tài khoản |
| POST /communication/sessions | submission_id, scenario, level, mode, use_memory |
| GET /communication/sessions/:id | Phiên và 50 lượt gần nhất, turn_count |
| GET /communication/sessions/:id/turns?before=&limit= | Các lượt cũ, trả theo thứ tự thời gian |
| GET /communication/sessions/:id/export | Toàn bộ lượt của phiên để xuất |
| POST /communication/sessions/:id/messages | submission_id, text; hoặc kind: help, action: explain/suggest/easier, turn_id tùy chọn; trả session và hint |
| POST /communication/sessions/:id/resume | Mở lại phiên đã kết thúc |
| POST /communication/sessions/:id/finish | review: true nếu chủ động xin tổng kết AI |
| POST /communication/sessions/:id/turns/:turn_id/translation | Dùng bản dịch đã có; nếu thiếu gọi AI và lưu |
| POST /communication/sessions/:id/turns/:turn_id/audio | WAV base64, mime_type và cached; ưu tiên RAM, nếu thiếu tạo giọng đọc |
| DELETE /communication/sessions/:id | Xóa phiên, lượt, tổng kết, ghi nhớ có nguồn |
| GET/POST /communication/memories | Đọc/thêm ghi nhớ của chính mình |
| PATCH/DELETE /communication/memories/:id | Sửa/xóa ghi nhớ của chính mình |

WebSocket `/api/v1/communication/live?session_id=...`: yêu cầu Origin cho phép, cookie còn hạn và phiên thuộc tài khoản/đang active. Browser gửi `{type:'audio',data:base64}`, `{type:'pause'}`, `{type:'text',id,text}`, `{type:'help',id,action,turn_id?}` hoặc `{type:'stop'}`. BE phát ready, content (audio + transcription + interrupted/turnComplete), saved (turn đã lưu), notice hoặc error. Browser không điều khiển upstream URL/model/system instruction. Có giới hạn payload, tốc độ message, buffer, timeout, thời lượng và kiểm tra lại đăng nhập trong phiên.

## Kiểm chứng và phạm vi

- 140 ca BE qua; 11 ca Giao tiếp AI gồm replay, lỗi giữ lời người học, cô lập tài khoản, memory opt-out/xóa nguồn, finish/retry/resume, auth/Origin/ownership socket, PCM/interruption/reconnect và migration/reopen. Bổ sung dịch đồng thời Live, cache/nghe lại giọng đọc, hướng dẫn có target và replay idempotent. Sau chỉnh yêu cầu read-aloud, 11 ca Giao tiếp AI được chạy lại đạt.
- Build TypeScript/Vite qua. Còn cảnh báo kích thước bundle hơn 500 KB.
- Chrome: 15 nhóm kiểm tra phòng/lịch sử, bố cục cố định trên bốn viewport, hướng dẫn giữ draft, dịch và nghe lại khi đang gọi, cache tránh gọi lại, tạm dừng/khôi phục mic khi phát, xác nhận phản hồi sau trợ giúp/dừng phát thực sự vào worklet, reload, tổng kết/resume, memory, AudioWorklet PCM, timeout xử lý mic và hủy stream muộn; Trang chủ giữ nguyên. Kết quả ở communication-browser-validation.json.
- Chrome dùng mic/server Gemini giả và mock xác nhận phát HTML audio; chưa nghiệm thu mic/loa vật lý hoặc chất lượng nghe thực tế. Không ép sink none trong fixture để che đầu ra mặc định: luồng chính giữ nguyên cấu hình AudioContext mà mã sản phẩm yêu cầu và kiểm tra đường loa HTMLAudioElement riêng.
- Gemini Live thật đã giải thích câu khó bằng tiếng Việt và đưa hai mẫu trả lời tiếng Anh kèm nghĩa: communication-tutor-provider-check.json. Giọng đọc WAV và dịch thật cũng đạt: communication-playback-provider-check.json. Chỉ gửi câu mẫu cố định. Phép thử đổi chủ đề qua AI văn bản từng gặp AI_PROVIDER_BUSY; chưa xác nhận chất lượng đổi chủ đề của model văn bản trong đợt này.
- Gemini Live thật đã nhận câu WAV giáo trình được người dùng cho phép gửi, trả input transcript, audio trả lời, output transcript và turnComplete. Xem communication-live-provider-check.json. Phép thử không gửi lịch sử cá nhân.

FE đã nối trực tiếp BE; Anti không cần triển khai lại. Nếu Anti chỉnh giao diện, giữ các API, key, logic replay/lưu, giải phóng mic và sidebar Trang chủ gốc. Chưa thay đổi cấu trúc giáo trình/lộ trình trong đợt này. Thiết kế rộng hơn nằm ở COMMUNICATION-AI-DESIGN.md; chưa triển khai chấm phát âm chi tiết, tự phân loại năng lực hay tìm ngữ cảnh ngữ nghĩa trên toàn bộ lịch sử.

Tham chiếu giao thức: [Gemini Live WebSocket](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket).
