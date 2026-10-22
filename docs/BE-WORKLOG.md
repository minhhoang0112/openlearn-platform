# Nhật ký BE do Codex quản lý

File này ghi chi tiết công việc BE, tách khỏi STATUS để giảm xung đột với bản đang mở của Anti. STATUS và từng hợp đồng API vẫn là nơi bàn giao. Anti ghi nghiệm thu FE ở STATUS; không lưu đè file này từ bản cũ.

- 21/10/2026 — MATERIAL-01: nhận thư viện học liệu nghe cá nhân. Nhập audio và transcript do người học cung cấp, phát/lặp A–B, lưu vị trí/tốc độ riêng; không tải nội dung bên ngoài hoặc gọi AI. Dữ liệu người dùng tách khỏi27bài chính thức. Đang triển khai, chưa có API sẵn sàng.

- 21/10/2026 — MATERIAL-01 nghiệm thu BE: contract1.13.0/schema13/142route,8API riêng tư, upload tối đa8MiB (body12MiB chỉ route import), transcript/edit metadata và playback CAS tách biệt.85test toàn BE đạt;5kiểm native Chrome decode/Range/resume/delete đạt, không phải UI Materials. Không sửa src/**/model/key hoặc gọi AI. Backup pre-learning-materials-1792595301518.sqlite. Anti nhận FE-MATERIAL-01 qua BE-NEXT.md và UPGRADE-V2-MATERIALS.md.
- 21/10/2026 — kiểm lại FE-PHRASE-01/FE-AUDIO-02: build thành công,12ca verify-v2-phrases-fe.mjs trong Chrome đạt; không còn lỗi chọn bản cũ/chuyển session trong các ca đã kiểm. STATUS không sửa trong lượt này để tránh xung đột buffer với Anti.

## 2026-10-21 — MATERIAL-02: manual cues + personal dictation

- Kiểm bản Anti: build qua, verify-v2-materials-fe.mjs13 ca Chrome qua trên DB riêng; phát hiện thêm các ca autosave/A tạm/nhãn tiến độ qua đọc source, bàn giao FE sửa. Không sửa src/ hoặc STATUS.
- Thêm4 API cues và dictation-attempts, schema14; optimistic cue revision độc lập, bounds/order/atomic save, server exact-token comparison, bounded LCS diff, explicit assisted/give-up, immutable source snapshots, UUID retry và owner/delete cascade. Không gọi AI; không đổi Today/SRS/điểm kỹ năng.
- Backup trước migration: server/data/pre-material-cues-1792596878130.sqlite. Contract1.14.0 /146 route; tài liệu UPGRADE-V2-MATERIAL-CUES.md. FE-MATERIAL-02 chưa triển khai.
- Bộ đầy đủ90 test qua sau cập nhật schema fixtures; giới hạn500 token được kiểm thêm sau đó, xem learning-v2-validation.json cho kết quả cuối.

- Xác minh cuối: health200 schema14; capabilities contract1.14.0. Sau guard500 token,5 test cues chạy lại đạt;90 full BE trước guard đạt. Đã xuất146 route. Không sửa STATUS hoặc src/, không dùng live Gemini.

## 2026-10-21 — MATERIAL-03: subtitle preview/export

- Kiểm Anti MATERIAL-02: npm run build qua;18 ca Chrome thực tế qua,0 page/server error; báo cáo material-cues-ui-validation.json. Không gọi AI, không sửa src/STATUS.
- Thêm2 API private preview-import và export SRT/VTT, contract1.15.0/schema14/148 route; không đổi schema nên không migration/backup mới. Preview không ghi DB, xác nhận dùng PUT cues hiện có; shared validator đảm bảo bounds/order/limits như nhập tay. Cảnh báo markup/settings/metadata bị bỏ, timestamp-map/overlap bị từ chối, text HTML không render. Export chỉ text/mốc đã lưu, không bản dịch/đáp án/audio.
-13 test liên quan materials/cues/subtitles đạt, trong đó4 nhóm subtitle mới. Không chạy lại toàn suite sau thay đổi nhỏ này; báo cáo full90 ở lượt trước vẫn là lịch sử. FE-MATERIAL-03 bàn giao tại UPGRADE-V2-SUBTITLES.md và BE-NEXT.md.

## 2026-10-21 — Nghiệm thu và chốt tạm bản cá nhân

- Build qua;94 test BE toàn bộ sau sửa và7 suite Chrome qua. Cập nhật selectors của study-browser-qa và functional-browser-qa theo FE hiện tại; không bỏ phạm vi kiểm thử.
- Tái hiện và sửa lỗi thật: submit đọc hiểu không trả questions làm trắng trang; reload completed reading tự tạo attempt/gọi AI mới. Shared readingView cho GET/submit/replay; resume reading giữ phiên hoàn thành khi không yêu cầu bài mới. Có regression tests và UI submit/reload. Ngữ pháp giữ quy tắc resume cũ.
- Runtime3000/4000 trả200; backup server/data/release-1.15-1792601016537.sqlite. Không sửa src/ hoặc STATUS, không gọi live AI.
- Đóng hạng mục FE-MATERIAL-03, dừng tính năng mới theo yêu cầu tiết kiệm quota; đọc RELEASE-CLOSEOUT.md. AI thật, audio/micro vật lý và học dài ngày chưa được đảm bảo từ test tự động.
