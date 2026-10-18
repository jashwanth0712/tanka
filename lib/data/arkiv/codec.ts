// App attributes → typed Arkiv attribute values. Shared by the data source and the seed script.
// Strings are `str`, entity references are `key`, ms-epoch timestamps are `u64`, other numbers `i32`.

import { i32, key as keyValue, str, u64 } from "@arkiv-network/sdk/attr";
import type { Hex } from "viem";
import { KEY_ATTRS, U64_ATTRS, type Attributes } from "../schema";

export function toArkivAttrs(a: Attributes) {
  const out: Record<string, ReturnType<typeof str> | ReturnType<typeof i32> | ReturnType<typeof u64> | ReturnType<typeof keyValue>> = {};
  for (const [k, v] of Object.entries(a)) {
    if (typeof v === "number") out[k] = U64_ATTRS.has(k) ? u64(BigInt(v)) : i32(v);
    else out[k] = KEY_ATTRS.has(k) ? keyValue(v.toLowerCase() as Hex) : str(v);
  }
  return out;
}
