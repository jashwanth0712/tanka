// Tiny evaluator for the Arkiv query subset produced by lib/data/query.ts (the SDK's grammar):
//   attr = str('x') | attr >= i32(5) | attr = key(0x…) | a AND b | a OR b | NOT a | (…)
// Lets mock mode run the exact query strings the UI shows (and the /verify playground).

export type Attrs = Record<string, string | number>;
type Pred = (a: Attrs) => boolean;

const TYPE_TAGS = new Set(["bool", "i32", "u64", "u256", "dec", "bytes32", "key", "addr", "str"]);

type Tok =
  | { t: "op"; v: "=" | "!=" | ">=" | "<=" | ">" | "<" }
  | { t: "and" | "or" | "not" | "lp" | "rp" }
  | { t: "ident"; v: string }
  | { t: "lit"; v: string | number };

function tokenize(q: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < q.length) {
    const c = q[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    const two = q.slice(i, i + 2);
    if (two === ">=" || two === "<=" || two === "!=") { out.push({ t: "op", v: two }); i += 2; continue; }
    if (c === "=" || c === ">" || c === "<") { out.push({ t: "op", v: c }); i++; continue; }
    const m = /^\$?[A-Za-z_][A-Za-z0-9_]*/.exec(q.slice(i));
    if (!m) throw new Error(`Unexpected "${c}" at ${i}`);
    const w = m[0];
    i += w.length;
    if (w === "AND") out.push({ t: "and" });
    else if (w === "OR") out.push({ t: "or" });
    else if (w === "NOT") out.push({ t: "not" });
    else if (w === "true" || w === "false") out.push({ t: "lit", v: w });
    else if (TYPE_TAGS.has(w) && q[i] === "(") {
      i++; // (
      let v = "";
      if (w === "str") {
        if (q[i] !== "'") throw new Error("Expected a quoted string");
        i++;
        for (;;) {
          if (i >= q.length) throw new Error("Unterminated string");
          if (q[i] === "'") {
            if (q[i + 1] === "'") { v += "'"; i += 2; continue; }
            i++;
            break;
          }
          v += q[i++];
        }
      } else {
        const end = q.indexOf(")", i);
        if (end < 0) throw new Error("Unterminated literal");
        v = q.slice(i, end).trim();
        i = end;
      }
      if (q[i] !== ")") throw new Error("Expected )");
      i++;
      const numeric = w === "i32" || w === "u64" || w === "u256" || w === "dec";
      out.push({ t: "lit", v: numeric ? Number(v) : w === "str" ? v : v.toLowerCase() });
    } else out.push({ t: "ident", v: w });
  }
  return out;
}

export function compileQuery(q: string): Pred {
  const toks = tokenize(q);
  let p = 0;
  const peek = () => toks[p];
  const eat = (t: Tok["t"]) => {
    const k = toks[p];
    if (!k || k.t !== t) throw new Error(`Expected ${t} at token ${p}`);
    p++;
    return k;
  };

  function or(): Pred {
    let left = and();
    while (peek()?.t === "or") {
      p++;
      const l = left, r = and();
      left = (a) => l(a) || r(a);
    }
    return left;
  }
  function and(): Pred {
    let left = atom();
    while (peek()?.t === "and") {
      p++;
      const l = left, r = atom();
      left = (a) => l(a) && r(a);
    }
    return left;
  }
  function atom(): Pred {
    if (peek()?.t === "not") {
      p++;
      const inner = atom();
      return (a) => !inner(a);
    }
    if (peek()?.t === "lp") {
      p++;
      const e = or();
      eat("rp");
      return e;
    }
    const id = eat("ident") as { t: "ident"; v: string };
    const op = (eat("op") as { t: "op"; v: string }).v;
    const lit = eat("lit") as { t: "lit"; v: string | number };
    const want = lit.v;
    return (a) => {
      const have = a[id.v];
      if (have === undefined) return false;
      if (typeof want === "string") {
        const h = String(have);
        if (op === "=") return h === want || (want.startsWith("0x") && h.toLowerCase() === want);
        if (op === "!=") return h !== want;
        return false;
      }
      const h = Number(have);
      switch (op) {
        case "=": return h === want;
        case "!=": return h !== want;
        case ">=": return h >= want;
        case "<=": return h <= want;
        case ">": return h > want;
        case "<": return h < want;
      }
      return false;
    };
  }

  const pred = or();
  if (p !== toks.length) throw new Error(`Unexpected token at ${p}`);
  return pred;
}
