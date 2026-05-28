export const mockProject = {
  name: "Webデザインコース 無料相談会",
  slug: "web-design",
  description:
    "未経験からWebデザイナーを目指す方向けの無料相談会です。学習内容や受講スケジュールについて担当者がオンラインでご案内します。",
  durationMinutes: 30,
  hosts: ["田中", "佐藤", "伊藤"],
  assignmentMode: "均等割り当て",
  availability: "平日 10:00 - 20:00 / 土曜 10:00 - 17:00",
  bookingsThisMonth: 38,
  upcomingBookings: 12,
  cancellationRate: "7.9%",
  status: "公開中",
  color: "#2257d6",
};

export const mockProjects = [
  mockProject,
  {
    name: "動画編集コース 個別相談",
    slug: "movie-editing",
    durationMinutes: 45,
    hosts: ["佐藤", "山本"],
    assignmentMode: "優先度指定",
    bookingsThisMonth: 21,
    upcomingBookings: 7,
    status: "公開中",
    color: "#0f766e",
  },
  {
    name: "副業スタート説明会",
    slug: "side-business",
    durationMinutes: 60,
    hosts: ["田中"],
    assignmentMode: "ランダム",
    bookingsThisMonth: 0,
    upcomingBookings: 0,
    status: "下書き",
    color: "#64748b",
  },
];

export const mockDates = [
  { date: "6/1", weekday: "月", disabled: false },
  { date: "6/2", weekday: "火", disabled: false },
  { date: "6/3", weekday: "水", disabled: false },
  { date: "6/4", weekday: "木", disabled: false },
  { date: "6/5", weekday: "金", disabled: false },
  { date: "6/6", weekday: "土", disabled: false },
  { date: "6/7", weekday: "日", disabled: true },
];

export const mockSlots: Record<string, string[]> = {
  "6/1": ["10:00", "11:30", "14:00", "16:30", "18:00"],
  "6/2": ["10:30", "13:00", "15:30", "19:00"],
  "6/3": ["11:00", "14:30", "17:00"],
  "6/4": ["10:00", "12:00", "15:00", "18:30"],
  "6/5": ["10:30", "13:30", "17:30"],
  "6/6": ["10:00", "11:00", "15:30"],
};
