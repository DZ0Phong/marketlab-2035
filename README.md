# MarketLab 2035

Web game mô phỏng sàn giao dịch dùng cho bài thuyết trình **Kinh tế thị trường định hướng XHCN ở Việt Nam**.

## MVP hiện tại

- 4 đội mặc định, có thể đổi tên và thêm tối đa 8 đội.
- Mỗi đội bắt đầu với 1.000 tỷ vốn ảo.
- 8 mã cổ phiếu giả lập: công nghệ, năng lượng xanh, năng lượng hóa thạch, y tế, hợp tác xã nông nghiệp, hạ tầng, ngân hàng và tiêu dùng.
- Lệnh mua/bán tác động nhẹ lên giá theo cung–cầu.
- Host mở biến cố hoặc áp dụng chính sách để thay đổi giá và ba chỉ số quốc gia.
- Cứ 2 phút tự rút ngẫu nhiên 1–3 sự kiện tốt/xấu; host cũng có thể kích hoạt thủ công.
- Biểu đồ mini lưu lịch sử giá qua các nhịp sự kiện, cùng bộ đếm vòng, nhật ký, xếp hạng và debrief.
- Toàn bộ trạng thái nằm trong trình duyệt của máy host: không cần tài khoản, server hay cơ sở dữ liệu.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Build bản production bằng:

```bash
npm run build
```

Deploy lên Vercel: import repository, giữ nguyên thiết lập Next.js mặc định và bấm Deploy.

## Cách tổ chức buổi chơi

1. Host mở tab **Host control**, đặt tên đội và bắt đầu vòng.
2. Mỗi đội lần lượt đưa lệnh; host chọn đội tương ứng tại tab **Sàn giao dịch** và nhập lệnh.
3. Mỗi vòng 75 giây. Host có thể mở một biến cố.
4. Sau khi lớp thảo luận/bỏ phiếu, host áp dụng một chính sách.
5. Mở **Kết quả**, rồi kết thúc bằng bốn câu ở tab **Debrief**.

> Quy tắc quan trọng: tài sản là thành tích riêng của từng đội; xã hội, môi trường và ổn định là kết quả chung của nền kinh tế. Điều này tạo ra tranh luận giữa lợi ích cá nhân và mục tiêu phát triển quốc gia.

## Cấu trúc dữ liệu

`lib/game-data.ts` chứa toàn bộ nội dung dễ sửa:

- `INITIAL_STOCKS`: mã, tên, ngành, giá khởi điểm và dấu chân xã hội/môi trường/ổn định.
- `EVENTS`: biến cố và phần trăm tác động lên từng mã.
- `POLICIES`: chính sách, tác động giá và tác động chỉ số quốc gia.

`app/page.tsx` chứa game state và luật giao dịch. `app/globals.css` chứa toàn bộ giao diện.

## Hướng nâng cấp realtime

MVP cố ý dùng một máy host để giảm rủi ro khi thuyết trình. Khi cần nhiều điện thoại tham gia bằng mã phòng, giữ nguyên `game-data.ts` và chuyển state sang Supabase Realtime hoặc Firebase:

```text
rooms/{roomCode}
  status, round, seconds, scores
  stocks/{symbol}: price
  teams/{teamId}: name, cash, holdings
  orders/{orderId}: teamId, symbol, side, quantity, createdAt
```

Host là người duy nhất được mở biến cố/chính sách; người chơi chỉ được gửi lệnh cho đội của mình.

## Phân chia code cho nhóm

- 1 người: nội dung cổ phiếu, biến cố, chính sách trong `lib/game-data.ts`.
- 1 người: giao diện và responsive trong `app/globals.css`.
- 1 người: luật chơi, tính giá, kết quả trong `app/page.tsx`.
- 1 người: test kịch bản thuyết trình, chỉnh số để game cân bằng.

## Lưu ý học thuật

Đây là mô hình giáo dục, không mô phỏng chính xác thị trường chứng khoán thật và không phải lời khuyên đầu tư. Phần debrief là nơi liên hệ trải nghiệm với cơ chế thị trường, khuyết tật thị trường, vai trò điều tiết của Nhà nước và mục tiêu phát triển xã hội.
