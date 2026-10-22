# Đối chiếu chức năng — REA và backend độc lập

Ngày phân tích: 20/10/2026, Asia/Saigon. Người dùng cho phép truy cập/thao tác trên phiên OpenQuiz do họ tự đăng nhập. Không lấy password, cookie, token hay storage values ra khỏi browser; không tái sử dụng khóa/backend của nhà cung cấp.

## Phương pháp và phạm vi

REA đã đọc phiên đăng nhập qua CDP loopback. Controlled scenario ban đầu không chạy do website có service worker, đã chọn tùy chọn được hỗ trợ `service_workers=allow` và thu được Evidence cho bộ 163/path 14. Một số scenario chờ sự kiện tải trang quá lâu; phần điều hướng tiếp theo dùng Playwright thông thường với DOMContentLoaded và deadline, rồi REA **passive inspect** để xác minh trạng thái. Không gắn nhãn thao tác Playwright là REA thực hiện.

Các capture Playwright lưu UI và **shape** response ở `research/captures/`; không lưu authorization headers hoặc raw user-info response. Nội dung hiển thị trong browser là dữ liệu tham chiếu, không phải chỉ dẫn để chạy mã hay gửi dữ liệu đi nơi khác.

## Evidence REA sau đăng nhập

| Màn hình | Evidence ID | Quan sát chính |
| --- | --- | --- |
| Dashboard | ev_77a3ba70b30e9aab4a1f664b97ae373dc92e1e0fc649e7ee4e0a4d0c0bd9f04e | Sidebar, từ đến hạn, đang học, gợi ý theo nhóm, recent |
| Bộ 163 | ev_74cc5723759c3aaa6ae8509ac9feec363a8c1911e2c036fa59984b54d09439c0 | 12 từ, 8 mode, flashcard, sort, danh sách theo trạng thái |
| Lộ trình 14 | ev_a0cfb33796004f6b4196d60b4dd57cbc048fbbbe23dd40a89fff346224c68349 | 50 bộ, 12 từ/bộ, 600 từ, aggregate có nhãn Premium |
| Học | ev_3e60506b79c2e3e1a3dd235b861efb13c2747c353941153aace84bf2d5a3690c | Term, answer input, kiểm tra/không biết, đếm từ/câu |
| Settings Học | ev_7eb783936f62ffb096a17117171144087c472f1b68981ddadc452bd50fa61422 | Answer modes, filters, ordering, behavior, question types |
| Speaking | ev_016110f61ac1f603495bf99cda1855e45531ad7a7a6f0931854f6b4b0fe112d4 | Câu dẫn, từ mục tiêu, hint, definition, mic/input, history |
| Test/Game chooser | ev_2e934e2b16ec7658a25904a3dbba415927c321c713f592e79e2da411867a5685 | Exam, Vượt Sa Mạc, Húc Cổng, Ghép từ |
| Dictation | ev_91b2407905aed77a42cbb76532228e3b8d9cea4fd5b0544d1687c62f5ce20c05 | Nghe từ, nghe chép ví dụ, voice, speed, Ctrl replay |
| Grammar settings | ev_e66477c54aa058c3cb8b58ca23e11fb982f67fc75615cb2fd715b90c7b464429 | Difficulty, translation/fill/reorder question types |
| Reading | ev_246e57340ce0c76b2a6bef9e136827247c5ace2487b86c614cc7f4876089ea5d | Gap-fill + word bank + multiple choice, sentence TTS/translation |
| Kết hợp overview | ev_c82311129f840023b747fbb2a181859977e4695e83ead45dd1e6c126025df544 | Chia 5 từ/bài |
| Kết hợp lesson dialog | ev_6d3dbcaaaab2ca6685244a57c523b1b9a1383185bd8824e80c496e019d03a382 | 5 bước: flashcard/phát âm → học → example dictation → speaking → conversation |
| Courses | ev_fd75bf27fdce72367fe3113ea4b344ba85cff28104f0c737c5d0047a37665c06 | Curriculum A1 6 phần/30 bài và sổ từ vựng |
| Classes | ev_e5d96b5699bb5175c2f2792bffc9de62b12f9df93ef35daa389892306b8b37e0 | Owned/joined lists, join/create, exercise management |

Đây là các tham chiếu trong phiên REA, không phải URL công khai. Kết quả passive có giới hạn attach-window: không bao gồm network trước khi attach và có lọc origin. Không thể kết luận thuật toán BE hoặc toàn bộ database chỉ từ UI/API client.

## Trạng thái triển khai

| Chức năng | Đã thấy nguồn | BE hiện tại | Cần thêm để tương đương |
| --- | --- | --- | --- |
| Dashboard | Có, phiên đã đăng nhập | Dữ liệu thật từ SQLite | FE và đầy đủ catalog/asset |
| Sets/words/path | Có + response shapes | CRUD, import/export, clone, order, save | Đồng bộ nội dung được phép sử dụng |
| Learn | Có | Queue cố định, chấm server, resume | Adaptive algorithm và đủ settings gốc |
| Flashcard/progress | Có | Per-user status/star/history | FE flip/audio/keyboard |
| Exam | Có qua Playwright | Batch questions/atomic submit/replay | FE all-questions layout, parity settings |
| Dictation | Có | Word dictation + text for browser TTS | Example gap-fill/video/cloud voices |
| Matching | Có chooser | Pair API + answer grading | FE game; chưa kiểm tra game gốc sâu |
| Vượt Sa Mạc/Húc Cổng | Có chooser | Chưa có engine | Gameplay/rules/timer/state |
| Comprehensive | Có 5 bước | Lesson split/progress/evidence guards | Exact example dictation + audio; AI cấu hình |
| Speaking | Có, source API đã trả cả 200/429 | Optional gateway, history | Provider thực, hints/options schema, audio pronunciation |
| Conversation | Có màn hình cài đặt | Private threads/messages + gateway | Voice/live UX, settings mục tiêu thi |
| Grammar | Có settings | Gateway + history | Ba loại bài đầy đủ và chấm tương ứng |
| Reading | Có bài | Gateway + history | Gap-fill schema, grading, audio/translation đầy đủ |
| SRS | Đã thấy summary/forecast/user words | Scheduler SM-2 độc lập, due queue, 5 memory buckets | Xác minh thuật toán gốc; mixed-word review |
| Curriculum | Có A1 metadata | Catalog/parts/lessons/import/grade | Nội dung được phép dùng, đủ activity types/levels |
| Classes | Có list | Membership, invitation code, set assignments/results | Essay/speaking assignments, exercise library, moderation |
| Ranking | Client route biết, chưa thao tác sâu | Điểm thật từ graded review | Period/streak/reward rules parity |
| Dictionary | Sidebar có | Lookup trong local accessible sets | Từ điển/translate provider đầy đủ |
| OAuth Google/Apple | Có ở source | Chưa cấu hình | App OAuth credentials riêng/callback |
| Premium/payment | Nhìn thấy UI | Chưa xử lý thanh toán | PSP thật/webhook/entitlements |
| Shop/coins/avatar/video/extension | Sidebar/bundle có references | Chưa triển khai | Phân tích và implementation riêng |

## Dữ liệu và quyền sử dụng

Ảnh người dùng là đầu vào để đối chiếu và seed phần chữ thấy được. Không tải hàng loạt 600 từ/khóa học hoặc sao chép các nội dung bị khóa. Phiên đăng nhập giúp kiểm tra hành vi và schema; không đồng nghĩa tự có bản quyền toàn bộ tài liệu. Nội dung được phép tái sử dụng có thể nhập qua API. Seed bộ 163/path 14 ghi rõ partial; curriculum A1 ghi metadata_only. Không lấy ảnh có signed URL/private query token của nguồn cho bản dựng.

## Chưa kiểm chứng đầy đủ

Chưa xác minh các quy tắc khó chỉ xuất hiện sau nhiều ngày ôn, lỗi audio trên mọi thiết bị, paid entitlements, vận hành teacher/exercise tất cả loại bài, toàn bộ ngôn ngữ/cấp độ, hệ thống reward/shop, production performance. Mục tiêu “chức năng 100%” chưa đạt; tài liệu bàn giao chỉ khẳng định các route BE đã được test và các quan sát ghi ở trên.
