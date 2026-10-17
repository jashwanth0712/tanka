// Tiny evaluator for the Arkiv query subset produced by lib/data/query.ts.
// Lets mock mode run the exact query strings the UI shows (and the /verify playground).

export type Attrs = Record<string, string | number>;
type Pred = (a: Attrs) => boolean;

type Tok =
  | { t: "op"; v: "=" | "!=" | ">=" | "<=" | ">" | "<" }
  | { t: "and" | "or" | "lp" | "rp" }
  | { t: "ident"; v: string }
  | { t: "str"; v: string }
  | { t: "num"; v: number };

function tokenize(q: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < q.length) {
    const c = q[i];
    if (/\s/.test(c)) { i++; continue; }
    if (q.startsWith("&&", i)) { out.push({ t: "and" }); i += 2; continue; }
    if (q.startsWith("||", i)) { out.push({ t: "or" }); i += 2; continue; }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    const two = q.slice(i, i + 2);
    if (two === ">=" || two === "<=" || two === "!=") { out.push({ t: "op", v: two }); i += 2; continue; }
    if (c === "=" || c === ">" || c === "<") { out.push({ t: "op", v: c }); i++; continue; }
    if (c === '"') {
      let s = "";
      i++;
      while (i < q.length && q[i] !== '"') {
        if (q[i] === "\\" && i + 1 < q.length) { s += q[i + 1]; i += 2; continue; }
        s += q[i++];
      }
      if (q[i] !== '"') throw new Error("Unterminated string");
      i++;
      out.push({ t: "str", v: s });
      continue;
    }
    const m = /^(0x[0-9a-fA-F]+|-?\d+(?:\.\d+)?|\$?[A-Za-z_][A-Za-z0-9_]*)/.exec(q.slice(i));
    if (!m) throw new Error(`Unexpected "${c}" at ${i}`);
    const w = m[0];
    if (w.startsWith("0x")) out.push({ t: "str", v: w.toLowerCase() });
    else if (/^-?\d/.test(w)) out.push({ t: "num", v: Number(w) });
    else out.push({ t: "ident", v: w });
    i += w.length;
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
    if (peek()?.t === "lp") {
      p++;
      const e = or();
      eat("rp");
      return e;
    }
    const id = eat("ident") as { t: "ident"; v: string };
    const op = (eat("op") as { t: "op"; v: string }).v;
    const lit = toks[p++];
    if (!lit || (lit.t !== "str" && lit.t !== "num")) throw new Error("Expected value");
    const want = lit.v;
    return (a) => {
      let have = a[id.v];
      if (have === undefined) return false;
      if (typeof have === "string" && typeof want === "string") {
        have = have.toLowerCase();
        const w = want.toLowerCase();
        if (op === "=") return have === w;
        if (op === "!=") return have !== w;
        return false;
      }
      const h = Number(have), w = Number(want);
      switch (op) {
        case "=": return h === w;
        case "!=": return h !== w;
        case ">=": return h >= w;
        case "<=": return h <= w;
        case ">": return h > w;
        case "<": return h < w;
      }
      return false;
    };
  }

  const pred = or();
  if (p !== toks.length) throw new Error(`Unexpected token at ${p}`);
  return pred;
}
