import type { Rng } from "./rng";
import type { FloorMap, MapNode, NodeType } from "./types";

export const MAP_ROWS = 6; // rows of normal rooms before the boss

const ROOM_WEIGHTS: { type: NodeType; weight: number }[] = [
  { type: "fight", weight: 45 },
  { type: "elite", weight: 12 },
  { type: "merchant", weight: 11 },
  { type: "rest", weight: 10 },
  { type: "treasure", weight: 10 },
  { type: "shrine", weight: 12 },
];

function roomFor(rng: Rng, row: number): NodeType {
  if (row === 0) return "fight";
  if (row === MAP_ROWS - 1) return "rest"; // always a campfire before the boss
  const allowed = ROOM_WEIGHTS.filter(
    (r) => !(r.type === "elite" && row < 2) && !(r.type === "rest" && row === MAP_ROWS - 2),
  );
  return rng.weighted(allowed).type;
}

/**
 * Builds a layered map: MAP_ROWS rows of 2-4 rooms, then one boss room.
 * Each room links to 1-2 rooms in the next row, and every room is reachable.
 */
export function generateFloor(rng: Rng, floor: number): FloorMap {
  const rows: MapNode[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const count = r === 0 ? 3 : rng.int(2, 4);
    const row: MapNode[] = [];
    for (let c = 0; c < count; c++) {
      row.push({ id: `f${floor}-r${r}-c${c}`, row: r, col: c, type: roomFor(rng, r), next: [] });
    }
    rows.push(row);
  }
  rows.push([{ id: `f${floor}-boss`, row: MAP_ROWS, col: 0, type: "boss", next: [] }]);

  // Rooms link by on-screen position (x from 0 to 1), so paths stay short and mostly uncrossed.
  const x = (node: MapNode, count: number) => (node.col + 1) / (count + 1);
  for (let r = 0; r < rows.length - 1; r++) {
    const here = rows[r]!;
    const there = rows[r + 1]!;
    const byDistance = (from: number) =>
      [...there].sort((a, b) => Math.abs(x(a, there.length) - from) - Math.abs(x(b, there.length) - from));
    for (const node of here) {
      const [nearest, second] = byDistance(x(node, here.length));
      node.next.push(nearest!.id);
      if (second && rng.chance(0.55) && Math.abs(x(second, there.length) - x(node, here.length)) <= 0.34) {
        node.next.push(second.id);
      }
    }
    // Any room with no way in gets a link from the closest room above.
    for (const target of there) {
      if (here.some((n) => n.next.includes(target.id))) continue;
      const tx = x(target, there.length);
      const source = [...here].sort((a, b) => Math.abs(x(a, here.length) - tx) - Math.abs(x(b, here.length) - tx))[0]!;
      source.next.push(target.id);
    }
    for (const node of here) node.next.sort();
  }

  // Avoid two shops or two campfires right next to each other on a path.
  for (let r = 1; r < MAP_ROWS - 1; r++) {
    for (const node of rows[r]!) {
      const parents = rows[r - 1]!.filter((p) => p.next.includes(node.id));
      if ((node.type === "merchant" || node.type === "rest") && parents.some((p) => p.type === node.type)) {
        node.type = "fight";
      }
    }
  }

  return { rows };
}

export function findNode(map: FloorMap, id: string): MapNode | undefined {
  for (const row of map.rows) for (const node of row) if (node.id === id) return node;
  return undefined;
}

/** Rooms the hero may travel to next. */
export function reachableNodes(map: FloorMap, position: string | null): MapNode[] {
  if (position === null) return map.rows[0]!;
  const here = findNode(map, position);
  if (!here) return [];
  return here.next.map((id) => findNode(map, id)!).filter(Boolean);
}
