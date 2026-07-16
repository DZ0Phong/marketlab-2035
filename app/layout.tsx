import type { Metadata } from "next";
import "./globals.css";
import "./light-theme.css";

export const metadata: Metadata = {
  title: "MarketLab 2035",
  description: "Mô phỏng thị trường, chính sách và phát triển cân bằng tại Việt Nam.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
