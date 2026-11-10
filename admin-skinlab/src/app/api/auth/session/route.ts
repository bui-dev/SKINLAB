import { NextResponse } from "next/server";

import { getSession } from "@/features/auth/api/get-session";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  return NextResponse.json({ session });
}
