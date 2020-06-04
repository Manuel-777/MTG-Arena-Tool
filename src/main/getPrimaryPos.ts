import electron from "electron";

export default function getPrimaryPos(
  bounds: electron.Rectangle
): { x: number; y: number } {
  const primaryBounds = electron.screen.getPrimaryDisplay().bounds;
  const primaryPos = { x: 0, y: 0 };
  primaryPos.x = primaryBounds.x - bounds.x;
  primaryPos.y = primaryBounds.y - bounds.y;
  return primaryPos;
}
