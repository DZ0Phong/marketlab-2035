export type Stock = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  color: string;
  social: number;
  environment: number;
  stability: number;
};

export type Effect = Record<string, number>;

export type GameCard = {
  id: string;
  title: string;
  description: string;
  lesson: string;
  effects: Effect;
  scoreEffects?: { social?: number; environment?: number; stability?: number };
  tone?: "positive" | "negative" | "mixed";
};

export const INITIAL_STOCKS: Stock[] = [
  { symbol: "VTC", name: "VietTech", sector: "Công nghệ tư nhân", price: 24, color: "#6d5efc", social: 1, environment: 0, stability: -1 },
  { symbol: "GRN", name: "GreenPower", sector: "Năng lượng xanh", price: 18, color: "#31c48d", social: 1, environment: 3, stability: 1 },
  { symbol: "FOS", name: "Fossil Energy", sector: "Năng lượng hóa thạch", price: 22, color: "#f97352", social: 1, environment: -3, stability: 1 },
  { symbol: "MED", name: "MediCare", sector: "Y tế", price: 20, color: "#e84c88", social: 3, environment: 0, stability: 2 },
  { symbol: "AGR", name: "AgriCoop", sector: "HTX nông nghiệp", price: 14, color: "#d4a72c", social: 2, environment: 1, stability: 2 },
  { symbol: "INF", name: "National Infra", sector: "Hạ tầng", price: 26, color: "#2589bd", social: 2, environment: -1, stability: 3 },
  { symbol: "BNK", name: "Unity Bank", sector: "Tài chính – ngân hàng", price: 21, color: "#4f70d9", social: 0, environment: 0, stability: 2 },
  { symbol: "CSM", name: "Nova Consumer", sector: "Tiêu dùng – bán lẻ", price: 16, color: "#e58b2b", social: 1, environment: -1, stability: 0 },
];

export const EVENTS: GameCard[] = [
  { id: "energy", tone: "negative", title: "Khủng hoảng năng lượng", description: "Giá nhiên liệu tăng, sản xuất chịu áp lực.", lesson: "Thị trường cần khả năng chống chịu và đa dạng nguồn cung.", effects: { FOS: 22, GRN: 10, INF: -8, VTC: -5, CSM: -9 }, scoreEffects: { stability: -6 } },
  { id: "pandemic", tone: "negative", title: "Dịch bệnh bùng phát", description: "Nhu cầu y tế tăng, chuỗi cung ứng gián đoạn.", lesson: "Y tế là hàng hóa thiết yếu; lợi ích xã hội không thể chỉ đo bằng lợi nhuận.", effects: { MED: 32, AGR: 8, INF: -10, VTC: 6, CSM: -14 }, scoreEffects: { social: -7, stability: -5 } },
  { id: "bubble", tone: "mixed", title: "Làn sóng đầu cơ công nghệ", description: "Dòng tiền đổ vào công nghệ, rủi ro bong bóng tăng.", lesson: "Thông tin và tâm lý đám đông có thể tạo bong bóng tài sản.", effects: { VTC: 26, BNK: 8, AGR: -7, MED: -5 }, scoreEffects: { stability: -8 } },
  { id: "pollution", tone: "negative", title: "Cảnh báo ô nhiễm", description: "Chi phí môi trường của tăng trưởng trở nên rõ rệt.", lesson: "Ngoại ứng tiêu cực là khuyết tật thị trường điển hình.", effects: { FOS: -24, GRN: 18, MED: 7, CSM: -5 }, scoreEffects: { environment: -8, social: -3 } },
  { id: "exports", tone: "positive", title: "Đơn hàng xuất khẩu tăng", description: "Nhu cầu quốc tế phục hồi mạnh.", lesson: "Hội nhập mở ra cơ hội nhưng cũng làm nền kinh tế nhạy với bên ngoài.", effects: { VTC: 14, AGR: 17, CSM: 12, INF: 6 }, scoreEffects: { social: 4, stability: 2 } },
  { id: "innovation", tone: "positive", title: "Đột phá công nghệ", description: "Năng suất và niềm tin đầu tư cùng cải thiện.", lesson: "Cạnh tranh và lợi nhuận tạo động lực đổi mới sáng tạo.", effects: { VTC: 24, GRN: 10, BNK: 6 }, scoreEffects: { stability: 3 } },
  { id: "harvest", tone: "positive", title: "Mùa vụ bội thu", description: "Nguồn cung thực phẩm dồi dào, tiêu dùng tăng.", lesson: "Khu vực hợp tác và nông nghiệp góp phần vào an sinh, ổn định.", effects: { AGR: 25, CSM: 10, MED: 3 }, scoreEffects: { social: 7, stability: 5 } },
  { id: "bankrun", tone: "negative", title: "Khủng hoảng niềm tin ngân hàng", description: "Tin đồn thanh khoản kích hoạt làn sóng rút vốn.", lesson: "Thị trường tài chính có tính lây lan và cần giám sát hệ thống.", effects: { BNK: -30, VTC: -12, INF: -10, CSM: -8 }, scoreEffects: { stability: -14 } },
  { id: "infrastructure", tone: "positive", title: "Hạ tầng kết nối hoàn thành", description: "Chi phí logistics giảm trên toàn nền kinh tế.", lesson: "Hàng hóa công có thể nâng năng suất của nhiều thành phần kinh tế.", effects: { INF: 22, AGR: 12, CSM: 10, VTC: 6 }, scoreEffects: { social: 5, stability: 7 } },
  { id: "drought", tone: "negative", title: "Hạn hán kéo dài", description: "Nông nghiệp và thủy điện cùng chịu áp lực.", lesson: "Biến đổi khí hậu tạo chi phí kinh tế và xã hội trên diện rộng.", effects: { AGR: -26, GRN: -8, CSM: 9, MED: 5 }, scoreEffects: { environment: -9, social: -6 } },
  { id: "confidence", tone: "positive", title: "Niềm tin tiêu dùng phục hồi", description: "Chi tiêu hộ gia đình và tín dụng cùng tăng.", lesson: "Kỳ vọng của các chủ thể ảnh hưởng trực tiếp tới chu kỳ kinh tế.", effects: { CSM: 24, BNK: 12, VTC: 5 }, scoreEffects: { social: 3, stability: 4 } },
  { id: "supply", tone: "negative", title: "Đứt gãy chuỗi cung ứng", description: "Nguyên liệu khan hiếm, chi phí sản xuất tăng.", lesson: "Hiệu quả ngắn hạn phải được cân bằng với năng lực tự chủ và chống chịu.", effects: { INF: -14, VTC: -12, CSM: -10, AGR: 6, FOS: 8 }, scoreEffects: { stability: -9 } },
];

export const POLICIES: GameCard[] = [
  { id: "carbon", title: "Thuế carbon & chuyển đổi xanh", description: "Đánh thuế phát thải, hỗ trợ năng lượng sạch.", lesson: "Nhà nước dùng công cụ kinh tế để định hướng hành vi thị trường.", effects: { FOS: -20, GRN: 30, INF: 5 }, scoreEffects: { environment: 14, stability: -2 } },
  { id: "welfare", title: "Quỹ y tế & an sinh", description: "Phân phối lại một phần nguồn lực cho dịch vụ thiết yếu.", lesson: "Thành quả tăng trưởng được gắn với tiến bộ và công bằng xã hội.", effects: { MED: 22, AGR: 8, VTC: -4 }, scoreEffects: { social: 15, stability: 4 } },
  { id: "public", title: "Đầu tư công chiến lược", description: "Nâng hạ tầng và năng lực chống chịu quốc gia.", lesson: "Nhà nước cung cấp hàng hóa công nhưng phải cân nhắc hiệu quả ngân sách.", effects: { INF: 28, AGR: 10, VTC: 6 }, scoreEffects: { social: 6, stability: 12, environment: -3 } },
  { id: "competition", title: "Luật chống độc quyền", description: "Hạn chế vị thế thống lĩnh, mở cơ hội cho chủ thể nhỏ.", lesson: "Điều tiết nhằm bảo vệ cạnh tranh, không phải xóa bỏ cạnh tranh.", effects: { VTC: -15, AGR: 16, MED: 7 }, scoreEffects: { social: 8, stability: 7 } },
];
