export type Stock={symbol:string;name:string;sector:string;ownership:string;price:number;color:string;social:number;environment:number;stability:number;volatility:number;liquidity:number;description:string};
export type Effect=Record<string,number>;
export type GameCard={id:string;title:string;description:string;lesson:string;effects:Effect;scoreEffects?:{social?:number;environment?:number;stability?:number};tone?:"positive"|"negative"|"mixed";category?:string;responsePolicyIds?:string[]};

export const INITIAL_STOCKS:Stock[]=[
 {symbol:"NOVA",name:"Nova Technology",sector:"Công nghệ",ownership:"Tư nhân",price:24,color:"#8b5cf6",social:1,environment:0,stability:-1,volatility:1.2,liquidity:900,description:"Tăng trưởng cao, nhạy với lãi suất và dữ liệu."},
 {symbol:"EST8",name:"Estate Eight",sector:"Bất động sản",ownership:"Tư nhân",price:28,color:"#f59e0b",social:0,environment:-1,stability:-2,volatility:1.15,liquidity:800,description:"Hưởng lợi từ tín dụng, rủi ro bong bóng."},
 {symbol:"GLOB",name:"Global Manufacturing",sector:"Sản xuất xuất khẩu",ownership:"FDI",price:22,color:"#0ea5e9",social:1,environment:-2,stability:0,volatility:.9,liquidity:1100,description:"Nhạy với xuất khẩu và chuỗi cung ứng."},
 {symbol:"RETX",name:"RetailX",sector:"Bán lẻ số",ownership:"Tư nhân",price:18,color:"#ec4899",social:0,environment:-1,stability:0,volatility:1,liquidity:1000,description:"Hưởng lợi từ tiêu dùng, có rủi ro độc quyền."},
 {symbol:"GRID",name:"National Grid",sector:"Hạ tầng điện",ownership:"Chiến lược",price:26,color:"#06b6d4",social:2,environment:-1,stability:3,volatility:.55,liquidity:1400,description:"Hạ tầng thiết yếu, ổn định và vốn lớn."},
 {symbol:"CARE",name:"Community Healthcare",sector:"Y tế",ownership:"Hỗn hợp",price:20,color:"#f43f5e",social:3,environment:0,stability:2,volatility:.65,liquidity:1200,description:"Dịch vụ thiết yếu với tác động xã hội cao."},
 {symbol:"GREEN",name:"Green Future Energy",sector:"Năng lượng xanh",ownership:"Hỗn hợp",price:17,color:"#22c55e",social:1,environment:3,stability:1,volatility:.9,liquidity:850,description:"Đầu tư dài hạn, hưởng lợi từ chuyển đổi xanh."},
 {symbol:"COOP",name:"Agri Cooperative",sector:"Nông nghiệp",ownership:"Hợp tác xã",price:14,color:"#84cc16",social:3,environment:1,stability:2,volatility:.5,liquidity:700,description:"Lợi nhuận vừa phải, hỗ trợ an ninh lương thực."},
];

export const POLICIES:GameCard[]=[
 {id:"subsidy",category:"Ổn định",title:"Trợ giá năng lượng",description:"Giảm áp lực chi phí tức thời nhưng tốn ngân sách.",lesson:"Ổn định ngắn hạn có thể làm chậm chuyển đổi xanh.",effects:{GLOB:14,GRID:10,GREEN:-7,RETX:5},scoreEffects:{social:6,stability:8,environment:-5}},
 {id:"green_support",category:"Cơ cấu",title:"Hỗ trợ chuyển đổi xanh",description:"Chuyển vốn sang năng lượng sạch, chi phí đầu tư ban đầu cao.",lesson:"Điều chỉnh cơ cấu tạo lợi ích dài hạn nhưng có người chịu chi phí.",effects:{GREEN:24,GRID:6,GLOB:-5},scoreEffects:{environment:14,stability:2}},
 {id:"tight_credit",category:"Kiềm chế",title:"Siết tín dụng đầu cơ",description:"Hạ nhiệt tài sản, giảm rủi ro hệ thống.",lesson:"Kiềm chế bong bóng có thể làm tăng trưởng ngắn hạn chậm lại.",effects:{EST8:-22,NOVA:-7,GRID:3},scoreEffects:{stability:13,social:5}},
 {id:"social_housing",category:"Cơ cấu",title:"Đầu tư nhà ở xã hội",description:"Hướng nguồn lực từ đầu cơ sang nhu cầu thực.",lesson:"Chính sách có thể phân bổ lại lợi ích trong cùng một ngành.",effects:{EST8:6,GRID:10,COOP:3},scoreEffects:{social:12,stability:4}},
 {id:"antitrust",category:"Kiềm chế",title:"Điều tra chống độc quyền",description:"Giảm quyền lực nền tảng, mở cơ hội cho chủ thể nhỏ.",lesson:"Bảo vệ cạnh tranh không đồng nghĩa xóa bỏ thị trường.",effects:{RETX:-18,COOP:15,NOVA:4},scoreEffects:{social:12,stability:5}},
 {id:"health",category:"Ổn định",title:"Quỹ y tế khẩn cấp",description:"Mở rộng năng lực chăm sóc và hỗ trợ người yếu thế.",lesson:"Dịch vụ công bảo vệ xã hội trước cú sốc.",effects:{CARE:20,GLOB:5,RETX:4},scoreEffects:{social:15,stability:8}},
 {id:"none",category:"Không can thiệp",title:"Để thị trường tự điều chỉnh",description:"Không tốn ngân sách, chấp nhận biến động và rủi ro xã hội.",lesson:"Không can thiệp cũng là một lựa chọn chính sách có hệ quả.",effects:{},scoreEffects:{stability:-5}},
];

export const EVENTS:GameCard[]=[
 {id:"energy",category:"Quốc tế",tone:"negative",title:"Khủng hoảng năng lượng toàn cầu",description:"Giá nhiên liệu và chi phí sản xuất tăng mạnh.",lesson:"Cú sốc đầu vào lan truyền qua nhiều ngành.",effects:{GRID:-6,GLOB:-18,GREEN:20,RETX:-8},scoreEffects:{stability:-9},responsePolicyIds:["subsidy","green_support","none"]},
 {id:"housing_bubble",category:"Vĩ mô",tone:"mixed",title:"Bong bóng bất động sản",description:"Tín dụng rẻ đẩy giá tài sản lên nhanh hơn thu nhập.",lesson:"Kỳ vọng và đầu cơ có thể làm thị trường rời xa giá trị nền tảng.",effects:{EST8:25,NOVA:8,COOP:-5},scoreEffects:{social:-8,stability:-12},responsePolicyIds:["tight_credit","social_housing","none"]},
 {id:"platform",category:"Cạnh tranh",tone:"mixed",title:"Nền tảng bán lẻ chiếm lĩnh thị trường",description:"RetailX tăng trưởng mạnh, doanh nghiệp nhỏ mất thị phần.",lesson:"Tích tụ tạo hiệu quả nhưng có thể dẫn tới độc quyền.",effects:{RETX:24,COOP:-14,NOVA:6},scoreEffects:{social:-10,stability:-3},responsePolicyIds:["antitrust","none"]},
 {id:"pandemic",category:"Xã hội",tone:"negative",title:"Dịch bệnh lan rộng",description:"Y tế quá tải và chuỗi cung ứng bị gián đoạn.",lesson:"Khủng hoảng cho thấy vai trò của hàng hóa thiết yếu.",effects:{CARE:26,RETX:8,GLOB:-18,EST8:-10},scoreEffects:{social:-14,stability:-10},responsePolicyIds:["health","none"]},
 {id:"exports",category:"Quốc tế",tone:"positive",title:"Đơn hàng xuất khẩu tăng",description:"Nhu cầu quốc tế phục hồi mạnh.",lesson:"Hội nhập tạo cơ hội đồng thời tăng phụ thuộc bên ngoài.",effects:{GLOB:22,GRID:7,NOVA:8,COOP:5},scoreEffects:{social:5,stability:3},responsePolicyIds:["green_support","none"]},
 {id:"drought",category:"Môi trường",tone:"negative",title:"Hạn hán kéo dài",description:"Nông nghiệp và nguồn điện cùng chịu áp lực.",lesson:"Khí hậu tạo chi phí kinh tế và xã hội diện rộng.",effects:{COOP:-25,GRID:-9,GREEN:7,CARE:4},scoreEffects:{social:-8,environment:-10,stability:-7},responsePolicyIds:["green_support","subsidy","none"]},
];
