import { NextResponse } from "next/server";
import { getPlansForCountry, isGroupA } from "@/lib/server/plans";
import { getCountryCode } from "@/lib/server/geo";

export async function GET(req: Request) {
  const country = getCountryCode(req.headers) || "US";
  return NextResponse.json({
    country,
    group: isGroupA(country) ? "a" : "b",
    plans: getPlansForCountry(country),
  });
}
