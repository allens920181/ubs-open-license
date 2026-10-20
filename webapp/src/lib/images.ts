import type { BibleImage } from "./types";

const CDN = "https://d18g7qbkwqqlmo.cloudfront.net";

/** The CDN resizes on the fly: width x height, 0 means "keep the ratio". */
export const imageUrl = (img: Pick<BibleImage, "col" | "file">, width = 0) =>
  `${CDN}/${width}x0/${img.col}/${encodeURIComponent(img.file)}`;

export const imageTitle = (img: BibleImage) => img.zh || img.en || img.id;
export const imageDesc = (img: BibleImage) => img.dzh || img.den;

export const SUBJECTS: Record<string, string> = {
  "NATURAL WORLD": "自然界",
  "OBJECTS, TOOLS & TRADES": "器物、工具與行業",
  GEOGRAPHY: "地理",
  "FAITH & RELIGION": "信仰與宗教",
  CULTURE: "文化",
  PEOPLE: "人物",
};
export const subjectLabel = (s: string) =>
  s.split(";").map((x) => SUBJECTS[x.trim()] ?? x.trim()).filter(Boolean).join("、");

export const COLLECTIONS: Record<string, string> = {
  UBS: "聯合聖經公會",
  PRITZ: "Ray Pritz 攝影",
  BOOT: "Elbert Boot 攝影",
  WEB: "公有領域與開放授權",
  "OPEN-AI": "AI 生成圖",
  FAUNA: "動物圖",
};

/** "耶路撒冷" when we have a Chinese name, otherwise the English one without its disambiguating number. */
export const placeName = (p: { zh: string; n: string }) => p.zh || p.n.replace(/\s+\d+$/, "");
