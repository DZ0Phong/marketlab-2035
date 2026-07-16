# MarketLab 2035 — Thị trường và Định hướng

Web game realtime cho lớp học, mô phỏng mối quan hệ giữa **thị trường – Nhà nước – xã hội**. Đây là game giáo dục, không phải sàn chứng khoán hay lời khuyên đầu tư.

## Kiến trúc đã chọn

MVP dùng **một Render Web Service** chạy cả Next.js và Socket.IO:

```text
Điện thoại/laptop ── Socket.IO ──> Node + Next.js trên Render
                                      │
                                      └── Room state trong RAM
```

Lý do chọn:

- Chi phí thấp nhất: một service, không cần Supabase, Redis hoặc VPS.
- 16–20 người chơi và 40–50 kết nối trong một phòng là tải rất nhỏ với Socket.IO.
- Server-authoritative: client không tự sửa tiền, danh mục, giá, phase hoặc chính sách.
- Dễ debug và deploy hơn kiến trúc nhiều dịch vụ trong phạm vi một bài thuyết trình.

Đánh đổi:

- Render free có thể ngủ khi không sử dụng. Hãy mở game trước buổi chơi 5–10 phút.
- Room nằm trong RAM nên mất khi service restart/deploy. Không deploy trong lúc đang chơi.
- MVP phù hợp một buổi học, không phải hệ thống chạy 24/7 hay lưu lịch sử dài hạn.

Nếu sau này cần lưu phòng bền vững hoặc chạy nhiều server, có thể thêm Supabase/Redis mà không cần viết lại giao diện.

## Chức năng realtime

- Tạo phòng 4 ký tự, 8 đội: nhóm 1–6, 8–9; nhóm 7 là host.
- Tối đa hai thiết bị trong mỗi đội, dùng chung tiền và danh mục.
- Mua/bán market order; không margin, short sell hoặc limit order.
- Phí 0,15%, chống duplicate bằng idempotency key, server kiểm tra số dư.
- 8 doanh nghiệp: NOVA, EST8, GLOB, RETX, GRID, CARE, GREEN, COOP.
- Giá tick mỗi 5 giây từ noise, order flow, event và policy; có circuit breaker.
- Host start/pause/resume/next/end, thêm bot và emergency freeze.
- Chỉ số quốc gia: growth, employment, equality, environment, stability, budget.
- Responsive cho điện thoại; host dashboard ưu tiên laptop.

## Event–Policy Response Cycle

Mỗi major event đi qua state machine bắt buộc:

1. `ANNOUNCEMENT` — công bố biến cố, chưa nói chính xác giá tăng/giảm.
2. `MARKET_REACTION` — mở giao dịch, event tác động vào price engine.
3. `POLICY_DECISION` — khóa giao dịch, mỗi đội một phiếu.
4. `POLICY_REACTION` — mở lại thị trường, policy tác động giá và chỉ số.
5. `RESOLUTION` — tổng kết rồi sang event tiếp theo.

Chính sách gồm ổn định, kiềm chế, điều chỉnh cơ cấu và không can thiệp. Không có lựa chọn luôn tốt: một lợi ích ngắn hạn có thể đổi bằng ngân sách, môi trường hoặc ổn định dài hạn.

## Chạy local

Yêu cầu Node.js 22+.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Các điện thoại cùng Wi-Fi có thể mở địa chỉ Network của máy host nếu firewall cho phép.

Kiểm tra trước khi push:

```bash
npm run typecheck
npm test
npm run build
```

## Deploy Render miễn phí

1. Vào Render → **New** → **Blueprint**.
2. Kết nối repository `DZ0Phong/marketlab-2035`.
3. Render đọc `render.yaml` và tạo service `marketlab-2035`.
4. Chờ health check `/api/health` thành công.
5. Mở URL Render trước giờ chơi để đánh thức service.

Không cần khai báo database hoặc biến môi trường thủ công cho MVP.

## Cấu trúc

```text
app/page.tsx             UI landing, host và player
app/globals.css          Responsive dark financial terminal
lib/game-data.ts         8 doanh nghiệp, event và policy
server.ts                Next.js + Socket.IO gateway
server/game-engine.ts    Room, trade, tick giá, state machine, scoring state
tests/                   Unit tests của luật server
render.yaml              Blueprint deploy Render
```

## Luồng tổ chức trên lớp

1. Nhóm 7 tạo phòng và chiếu room code.
2. Mỗi nhóm vào bằng tối đa hai điện thoại.
3. Host thêm bot cho đội vắng, bấm Bắt đầu và hướng dẫn giao diện.
4. Chuyển qua Calm Market, sau đó chạy 3–4 event cycle.
5. Ở Policy Decision, các đội bỏ phiếu; host có thể chọn phương án phục vụ bài giảng.
6. Host Emergency Freeze/End, chốt tài sản và debrief.

## Quyết định phạm vi MVP

- Chưa lưu state qua restart để tránh chi phí database.
- Chưa có tài khoản; quyền host dùng token ngẫu nhiên trong session.
- Chart dùng SVG realtime nhẹ thay vì thư viện chart nặng, tối ưu điện thoại yếu.
- Chưa có order book; server đóng vai market maker giả lập.
- Public state không chứa cash/portfolio riêng; dữ liệu đội được gửi qua room Socket.IO riêng.

## Nâng cấp sau MVP

- QR join và projector route riêng.
- Reconnect token để thiết bị quay lại đúng đội sau reload.
- Snapshot/export kết quả JSON hoặc PDF.
- Candlestick/volume bằng Lightweight Charts.
- Portfolio snapshot và Balanced Score 70/10/10/10 đầy đủ.
- Supabase/Redis nếu cần state bền vững và scale nhiều instance.
