// src/lib/server/plans.ts — 套餐数据（美元计费，按月付，按国家分组）
const GROUP_A_COUNTRIES = ["IN", "CN", "PH", "KP", "BR", "MX", "ID", "RU"];

const PLAN_DEFS = [
  {
    id: "basic",
    name: "Basic",
    groupA: { price: 3.99, originalPrice: 7.98, credits: 220 },
    groupB: { price: 9.99, originalPrice: 19.98, credits: 500 },
    features: ["t2v", "i2v", "ref", "no_hd", "no_video_ref"],
  },
  {
    id: "pro",
    name: "Pro",
    groupA: { price: 7.99, originalPrice: 15.98, credits: 500 },
    groupB: { price: 15.99, originalPrice: 31.98, credits: 1000 },
    features: ["t2v", "i2v", "ref", "unlock_hd", "unlock_video_ref"],
  },
  {
    id: "ultra",
    name: "Ultra",
    groupA: { price: 12.99, originalPrice: 25.98, credits: 1000 },
    groupB: { price: 24.99, originalPrice: 49.98, credits: 2000 },
    features: ["t2v", "i2v", "ref", "unlock_hd", "unlock_video_ref", "priority"],
  },
];

export function isGroupA(countryCode?: string | null) {
  return GROUP_A_COUNTRIES.includes(String(countryCode || "").toUpperCase());
}

export function getPlansForCountry(countryCode?: string | null) {
  const groupA = isGroupA(countryCode);
  return PLAN_DEFS.map((p) => ({
    id: p.id,
    name: p.name,
    price: groupA ? p.groupA.price : p.groupB.price,
    originalPrice: groupA ? p.groupA.originalPrice : p.groupB.originalPrice,
    credits: groupA ? p.groupA.credits : p.groupB.credits,
    features: p.features,
  }));
}

export { GROUP_A_COUNTRIES };
