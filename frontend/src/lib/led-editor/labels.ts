import { CableEx } from "../led-editor-svg/types";

export function computeLabels(cList: CableEx[]) {
    const labels = new Map<string, string>();

    // группируем по (card, link)
    const byKey = new Map<
      string,
      { edges: { a: string; b: string }[]; nodes: Set<string>; card: number; link: number }
    >();

    for (const c of cList) {
      const cardNo = (c.card ?? 1);
      const linkNo = c.link;
      const key = `${cardNo}:${linkNo}`;
      if (!byKey.has(key)) {
        byKey.set(key, { edges: [], nodes: new Set<string>(), card: cardNo, link: linkNo });
      }
      const g = byKey.get(key)!;
      g.edges.push({ a: c.a, b: c.b });
      g.nodes.add(c.a);
      g.nodes.add(c.b);
    }

    for (const [, g] of byKey) {
      const succ: Map<string, string[]> = new Map();
      const indeg: Map<string, number> = new Map();
      const outdeg: Map<string, number> = new Map();

      for (const n of g.nodes) {
        succ.set(n, []);
        indeg.set(n, 0);
        outdeg.set(n, 0);
      }
      for (const e of g.edges) {
        succ.get(e.a)!.push(e.b);
        indeg.set(e.b, (indeg.get(e.b) || 0) + 1);
        outdeg.set(e.a, (outdeg.get(e.a) || 0) + 1);
      }

      const visited = new Set<string>();
      const starts: string[] = [...g.nodes].filter(
        (n) => (indeg.get(n) || 0) === 0 && (outdeg.get(n) || 0) > 0
      );

      const walk = (start: string) => {
        let cur: string | undefined = start;
        let i = 1;
        while (cur && !visited.has(cur)) {
          labels.set(cur, `S${g.card}-${g.link + 1}-${i++}`);
          visited.add(cur);
          const successors: string[] = succ.get(cur)! ?? [];
          const nextId: string | undefined = successors.find((n) => !visited.has(n));
          cur = nextId;
        }
      };

      for (const s of starts) walk(s);
      for (const n of g.nodes) {
        if (!visited.has(n) && ((indeg.get(n) || 0) + (outdeg.get(n) || 0) > 0)) {
          walk(n);
        }
      }
    }

    return labels;
  }