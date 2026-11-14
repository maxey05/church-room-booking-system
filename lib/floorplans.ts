export type Range = readonly [number, number];

export type PlanShape = {
  kind: "block" | "stairs" | "elevator" | "space";
  x: Range;
  y: Range;
};

export type PlanRoom = {
  name: string;
  x: Range;
  y: Range;
};

export type Plan = {
  bounds: readonly [number, number, number, number];
  shapes: PlanShape[];
  rooms: PlanRoom[];
};

export const FLOOR_PLANS: Partial<Record<number, Plan>> = {
  1: {
    bounds: [124, 200, 1076, 1272],
    shapes: [
      { kind: "block", x: [132, 220], y: [208, 328] },
      { kind: "stairs", x: [236, 300], y: [240, 328] },
      { kind: "elevator", x: [324, 420], y: [224, 328] },
      { kind: "stairs", x: [444, 508], y: [240, 328] },
      { kind: "block", x: [524, 612], y: [208, 328] },
      { kind: "block", x: [132, 612], y: [344, 384] },
      { kind: "space", x: [204, 540], y: [400, 800] },
      { kind: "space", x: [556, 892], y: [672, 1072] },
    ],
    rooms: [
      { name: "G7", x: [556, 892], y: [400, 656] },
      { name: "G4", x: [204, 540], y: [816, 1072] },
      { name: "Singles Lounge", x: [908, 1068], y: [672, 864] },
      { name: "G5", x: [732, 892], y: [1088, 1264] },
    ],
  },
  2: {
    bounds: [96, 200, 1104, 1080],
    shapes: [
      { kind: "stairs", x: [456, 520], y: [224, 312] },
      { kind: "elevator", x: [552, 648], y: [208, 312] },
      { kind: "stairs", x: [680, 744], y: [224, 312] },
      { kind: "block", x: [360, 840], y: [328, 368] },
      { kind: "block", x: [576, 624], y: [384, 528] },
      { kind: "block", x: [576, 624], y: [928, 1072] },
      { kind: "space", x: [360, 840], y: [544, 912] },
    ],
    rooms: [
      { name: "Room 1", x: [360, 560], y: [384, 528] },
      { name: "Room 2", x: [104, 344], y: [384, 576] },
      { name: "Room 3", x: [168, 344], y: [592, 720] },
      { name: "Room 4", x: [168, 344], y: [736, 864] },
      { name: "Room 5", x: [104, 344], y: [880, 1072] },
      { name: "Room 6", x: [360, 560], y: [928, 1072] },
      { name: "Room 7", x: [640, 840], y: [928, 1072] },
      { name: "Room 8", x: [856, 1096], y: [880, 1072] },
      { name: "Room 9", x: [856, 1032], y: [736, 864] },
      { name: "Room 10", x: [856, 1032], y: [592, 720] },
      { name: "Room 11", x: [640, 840], y: [384, 528] },
    ],
  },
};
