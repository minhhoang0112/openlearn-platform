> Cập nhật 02/11/2026: Đã triển khai bản đầu theo COMMUNICATION-AI.md (FE + BE). Tài liệu dưới đây giữ lại thiết kế rộng hơn; một số mục như tự suy hồ sơ, tìm ngữ nghĩa trên toàn bộ lịch sử và sửa giáo trình chưa triển khai.

# Giao tiếp AI — thiết kế trải nghiệm và tích hợp

Ngày: 02/11/2026. Trạng thái: đề xuất thiết kế dựa trên yêu cầu người dùng và mã nguồn hiện tại; chưa triển khai chức năng hoặc chốt hợp đồng API.

## 1. Mục tiêu sản phẩm

Tạo nơi thực hành tiếng Anh thường ngày: một AI vừa trò chuyện vừa hướng dẫn, biết giảm độ khó và giúp người mới nói được. Tái sử dụng kiến trúc âm thanh hai chiều của Labby Voice trong LabEx. Trọng tâm ban đầu là người mất gốc và A1/A2; có cấu hình cho mức cao hơn, không tuyên bố đã đánh giá đạt CEFR hay dự đoán điểm IELTS.

Giữ nguyên Trang chủ tại `/`, logo và mục Trang chủ. Thêm một mục `Giao tiếp AI` riêng trong sidebar, dự kiến `/communication`. Học hôm nay, lộ trình, bộ từ và các phiên cũ vẫn có đường dẫn của mình.

## 2. Những gì đã xác minh trong code

- LabEx `server/services/liveVoiceGateway.js`, `client/src/hooks/useVoiceCall.js` và audio worklet đã có nền tảng WebSocket/audio hai chiều, phát từng đoạn, ngắt lời và thu hồi microphone. Đây là phần kỹ thuật có thể chuyển sang OpenLearn, không phải bộ nhớ học tập đầy đủ.
- OpenLearn `server/ai.mjs` có conversations/messages riêng theo tài khoản, nhưng tạo cuộc hội thoại yêu cầu bộ từ; danh sách hiện chỉ lấy tối đa 100 phiên, chưa phân trang toàn bộ lịch sử.
- `ConversationView.tsx` lọc lịch sử theo set_id, dùng nhận giọng nói thành chữ và đọc lại tin nhắn. Chưa phải phòng giao tiếp độc lập có âm thanh hai chiều.
- `server/content/learning-v2/curriculum.mjs`: bài giới thiệu bắt đầu bằng nghe và chọn đáp án trước bước học cụm; nhiều bài dùng cùng khung 7 bước. Nói/viết là nhiệm vụ tự luyện, không phải đối thoại nhiều lượt.
- BE `learning.mjs` trả `learning_support` và có endpoint mở gói hỗ trợ, nhưng `LessonRunView.tsx` hiện không import/render `LessonSupportPanel`. Phần hướng dẫn đã có chưa đến được màn hình học hiện tại.
- BE phân biệt tự luyện, câu hỏi có đáp án và phản hồi AI. Giữ sự phân biệt này khi mở rộng, không quy đổi nút hoàn tất thành năng lực đã thành thạo.

Đây là rà soát mã nguồn phục vụ thiết kế; chưa phải nghiệm thu mới trên trình duyệt hoặc thử nhà cung cấp AI trực tiếp.

## 3. Một cửa vào, một hành động chính

Trang `/communication` ưu tiên nút `Bắt đầu nói chuyện` hoặc `Tiếp tục cuộc trò chuyện`. Bên dưới có tình huống đề xuất và lịch sử; không bắt chọn bộ từ hay đi qua nhiều màn hình thiết lập.

Lần đầu chỉ cần biết: người học có thể nói được câu đơn chưa, mục tiêu chính và thời gian muốn luyện. Có thể chọn `Tôi mới bắt đầu` để vào ngay; trao đổi ngắn giúp điều chỉnh mức hỗ trợ, không gắn nhãn kiểm tra trình độ chính thức.

Ba cách dùng cùng một phòng:

1. **Học cùng tôi** — mặc định cho người mới: chuẩn bị vài mẫu câu, thực hành có gợi ý, rồi thử lại với ít trợ giúp hơn.
2. **Đóng vai tình huống** — mua đồ, làm quen, hỏi đường, gọi món, trao đổi việc học, công việc. AI giữ vai trò và mục tiêu cụ thể.
3. **Trò chuyện tự do** — trao đổi theo sở thích, vẫn có thể gọi trợ giúp bất kỳ lúc nào.

IT/System là nhóm tình huống tự chọn, không phải mặc định cho mọi tài khoản.

Phòng gọi có: trạng thái kết nối/mic rõ ràng, phụ đề, nhập chữ thay lời nói, nói chậm hơn, nhắc lại, dịch câu, `Tôi chưa biết trả lời`, tạm dừng và kết thúc. Trên điện thoại, transcript là vùng chính; giải thích mở trong panel gọn thay vì nhiều cột.

## 4. AI ứng xử như bạn nói chuyện và gia sư

- Dùng câu ngắn, từ quen thuộc, một ý hỏi mỗi lượt ở mức mới bắt đầu; tránh hỏi dồn hoặc tự nói quá lâu.
- Cho phép người học nghĩ, dùng tiếng Việt hoặc pha tiếng Việt khi bí. Gợi cách diễn đạt tiếng Anh rồi mời thử lại; không coi thiếu từ là thất bại.
- Khi người học chưa hiểu: nói lại đơn giản → gợi từ/cụm → mẫu câu khuyết → câu mẫu có nghĩa. Ghi mức trợ giúp để gợi luyện phù hợp.
- Trả lời nội dung người học muốn nói trước. Mặc định chỉ sửa một lỗi đáng chú ý vào lúc phù hợp, hoặc gom tối đa vài lỗi sau cuộc trò chuyện. Có tùy chọn sửa ngay khi người học chủ động luyện cấu trúc.
- Mức ngôn ngữ thay đổi theo khả năng dùng câu và mức trợ giúp thực tế, không tăng vì đủ số phút hay số tin nhắn. Người dùng luôn có thể yêu cầu dễ hơn/chậm hơn.
- Khi đổi chủ đề hoặc nói chen, dừng âm thanh cũ và theo ý mới. Không ghi phần AI chưa nói xong thành một lượt hoàn chỉnh đã được nghe.
- Bản chép lời chỉ là nhận dạng dự kiến. Có chỗ sửa transcript; không kết luận phát âm sai chỉ vì STT nghe sai.
- Nếu đánh giá âm thanh, ghi rõ đó là nhận xét AI định tính dựa trên đoạn âm thanh, không tự dựng điểm IPA/IELTS hay chứng nhận phát âm.

Ví dụ buổi đầu: mục tiêu là giới thiệu tên và nơi ở. Xem `My name is ...`, `I live in ...` với nghĩa; AI hỏi `What's your name?`; nếu bí thì có mẫu trả lời. Sau vài lượt, đổi cách hỏi và giảm gợi ý. Cuối buổi, người học thử tự giới thiệu lại; lưu câu cần ôn, không chỉ hiện thông báo hoàn thành.

## 5. Lịch sử lâu dài và trí nhớ có kiểm soát

Phân biệt hai việc:

- **Lịch sử:** lưu các lượt thoại chữ đã xác nhận của mọi phiên do người dùng giữ lại. Tìm kiếm/phân trang, tiếp tục phiên cũ, xuất và xóa. Không cắt lịch sử ở 100 phiên như endpoint hiện tại.
- **Ngữ cảnh cho AI:** chọn thông tin liên quan từ hồ sơ học, tóm tắt và một số đoạn hội thoại trước, cộng cuộc trao đổi gần nhất. Không gửi toàn bộ lịch sử mỗi lượt vì quá dài và tốn phí; không hứa AI nhớ nguyên văn mọi chi tiết.

Hồ sơ học lưu mục tiêu, mức hỗ trợ ưa thích, những mẫu câu đang luyện và lỗi lặp lại có bằng chứng. Mỗi ký ức có nguồn session/turn, loại thông tin, thời điểm và trạng thái. Phân biệt câu người học nói về bản thân với nhân vật đóng vai: `I am a doctor` trong vai khách hàng không được tự biến thành nghề thật của người học.

Giao diện có `AI đang nhớ gì về tôi`, chỉnh/xóa và chế độ phiên không ghi nhớ lâu dài. Thông tin mâu thuẫn cần xác nhận hoặc giữ là chưa chắc chắn. Tóm tắt AI chỉ là bản suy ra, vẫn giữ nguồn đối chiếu.

Khi xóa phiên, xóa luôn hoặc vô hiệu hóa tóm tắt/ký ức/chỉ mục tìm kiếm xuất phát từ phiên đó. Không để thông tin đã xóa được đưa vào cuộc gọi mới. Dữ liệu cách ly theo tài khoản ở mọi truy vấn và socket.

Mặc định không lưu âm thanh thô lâu dài; lưu transcript và kết quả học. Nếu có tính năng nghe lại giọng của mình, người học bật lưu ghi âm với thời hạn lưu rõ ràng. Việc cung cấp audio trực tiếp cho nhà cung cấp để gọi vẫn cần được hiển thị trước khi bắt đầu.

## 6. Hướng BE và giao thức đề xuất

Chuyển kiến trúc LabEx qua adapter riêng; không sao chép nguyên chính sách IT/tiếng Việt hay hard-code model đã ghi trong tài liệu cũ. Khi triển khai, xác minh API/model Live thực sự được cấu hình và trả capability đúng. Dùng trạng thái riêng cho text/voice; cấu hình chat không chứng minh voice có quyền truy cập.

Đề xuất các thực thể: communication_sessions, communication_turns, communication_summaries, learner_memories và conversation_learning_items. Schema và đường dẫn dưới đây chưa phải API đã có:

- `GET/POST /communication/sessions`; GET hỗ trợ q, cursor, limit, tổng kết phù hợp.
- `GET /communication/sessions/:id`, lịch sử lượt thoại phân trang; tiếp tục không tạo bản sao phiên.
- `POST /communication/sessions/:id/finish` để kết thúc, tổng kết có retry/idempotency.
- `DELETE /communication/sessions/:id` bao gồm dữ liệu suy ra thuộc phiên.
- `GET/PATCH/DELETE /communication/memories...` quản lý những điều AI nhớ.
- Một WebSocket được xác thực theo cookie/session hiện tại, kiểm Origin và quyền sở hữu conversation trước khi chuyển audio. Đường dẫn cuối sẽ chốt trong hợp đồng triển khai.

Các quy tắc quan trọng:

- Key chỉ ở BE; client không được thay system instruction/model bằng payload tùy ý.
- Server tạo chính sách học và chọn ký ức. Transcript/nội dung người dùng là dữ liệu, không được nâng thành chỉ dẫn hệ thống.
- Mỗi lượt có ID, số thứ tự và trạng thái partial/final/interrupted/failed; lưu final idempotent, xử lý reconnect không trùng lượt.
- Sự kiện provider và microphone phải xử lý phản hồi đến muộn, mute, hai tab, retry, đóng cửa sổ, quyền mic bị thu hồi, giới hạn phiên và buffer.
- Ghi phần chữ nhận được nhưng chưa lưu hoặc bị gián đoạn với trạng thái thật. Không giả là đã lưu bền vững khi DB chưa xác nhận.
- Lưu lịch sử không phụ thuộc thành công của tác vụ tóm tắt. Tóm tắt chỉ chạy khi đủ lượt/kết thúc, được cache và có thể thử lại.
- Lỗi quota/mất mạng giữ được transcript đã lưu. Cho phép người dùng chọn chuyển sang nhập chữ khi khả dụng; không tự âm thầm đổi nhà cung cấp hay xoay key né hạn mức.
- Hiển thị giới hạn sử dụng; đặt giới hạn thời gian phiên và kết nối đồng thời. Không quảng bá AI không giới hạn hoặc miễn phí vĩnh viễn.

## 7. Đổi cách dạy của lộ trình

Đề xuất một bài mẫu đi theo vòng:

**Mục tiêu thực tế → xem/nghe mẫu có nghĩa → học ít cụm cần dùng → luyện có gợi ý → đối thoại tình huống → thử lại với ít trợ giúp → ghi lại điều cần ôn.**

Không bắt mọi bài có cùng bảy bước. Không yêu cầu người mới nghe câu hỏi chưa được chuẩn bị rồi mới cho biết kiến thức. Kiến thức giải thích nằm đúng chỗ cần, có mẫu/dịch; nút trợ giúp bổ sung vẫn giữ cho người muốn xem thêm.

Tách rõ giai đoạn học với giai đoạn kiểm tra khả năng nhớ: xem nghĩa trong lúc học là bình thường; chỉ ghi phụ thuộc gợi ý khi đánh giá khả năng tự làm. Không làm người mới có cảm giác bị trừ điểm vì cần hướng dẫn.

Mỗi bài có một nhiệm vụ giao tiếp cụ thể; cuối bài thêm đoạn viết ngắn về cùng tình huống để nối đọc/viết với nghe/nói. Không tuyên bố chỉ cần trò chuyện là đủ bốn kỹ năng hoặc đủ thi chứng chỉ. Ôn từ/cụm gắn lại với tình huống và lịch SRS hiện có, không tự đánh dấu đã nhớ do xuất hiện trong chat.

Trước khi làm lại cả khóa, sửa một bài giới thiệu bản thân và học thử từ đầu đến cuối. Giữ lesson/version/session cũ; thay đổi thứ tự/câu hỏi phải phát hành nội dung mới đúng quy tắc phiên, không xáo bài đang học.

## 8. Phạm vi đợt đầu có thể nghiệm thu

Một mục sidebar, một phòng gọi + nhập chữ, lịch sử xuyên phiên, trí nhớ học tập cơ bản có nguồn và quyền chỉnh/xóa. Ba tình huống: giới thiệu bản thân, sinh hoạt hằng ngày, hỏi nhờ giúp đỡ. Mặc định hỗ trợ người mới; cấu hình mức khác được giới hạn rõ. Tổng kết ngắn và lưu cụm cần ôn. Thử kết nối với một bài nền tảng đã sửa cách dạy.

Chưa mở hàng chục chế độ, chưa xây cả khóa IELTS, chưa nhân rộng toàn bộ giáo trình trước khi người dùng học thử được bài mẫu.

## 9. Phân công và nghiệm thu

Codex: mô hình dữ liệu, auth/socket, provider adapter, lưu/khôi phục, chính sách ngữ cảnh/trí nhớ, quota và API contract có mẫu response thật. Anti: giao diện phòng gọi, sidebar, lịch sử và trải nghiệm bài mẫu theo contract. Có thể song song khi chốt contract; FE dùng fixture phải ghi rõ, không báo đã gọi AI thật.

Nghiệm thu bắt buộc: nói chen dừng audio; người mới bí được gợi ý đúng mức; quyền mic và quota có lối xử lý; reload còn lịch sử; reconnect không nhân đôi lượt; tài khoản khác không đọc được; xóa phiên không còn memory; lời nói đóng vai không biến thành hồ sơ thật; bản chép lời có thể sai được xử lý; không có điểm học giả; trang chủ/logo còn nguyên; desktop/mobile không vỡ.

Kiểm provider thật dùng nội dung thử cố định trước, không tự gửi dữ liệu riêng từ lịch sử cũ. Sau đó thử học thật với người dùng để đánh giá độ dễ hiểu, độ trễ và mức trợ giúp.

## 10. Nguồn tham khảo sư phạm

- British Council A1 Speaking: chuẩn bị, ngôn ngữ trong tình huống, nghe và luyện cụm hữu ích: https://learnenglish.britishcouncil.org/free-resources/speaking/a1
- Council of Europe, CEFR spoken language qualitative aspects: tương tác A1 phụ thuộc việc nhắc lại, diễn đạt lại và hỗ trợ: https://www.coe.int/en/web/common-european-framework-reference-languages/table-3-cefr-3.3-common-reference-levels-qualitative-aspects-of-spoken-language-use

Những con số như số cụm mỗi buổi hoặc số lỗi sửa là lựa chọn sản phẩm cần học thử, không phải đảm bảo tiến bộ trong hai tuần.
