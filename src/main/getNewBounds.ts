/* eslint-disable @typescript-eslint/camelcase */
import electron from "electron";

export default function getNewBounds(): electron.Rectangle {
  const newBounds = { x: 0, y: 0, width: 0, height: 0 };
  electron.screen.getAllDisplays().forEach((display) => {
    newBounds.x = Math.min(newBounds.x, display.bounds.x);
    newBounds.y = Math.min(newBounds.y, display.bounds.y);
  });
  electron.screen.getAllDisplays().forEach((display) => {
    newBounds.width = Math.max(
      newBounds.width,
      Math.abs(newBounds.x) + display.bounds.x + display.bounds.width
    );
    newBounds.height = Math.max(
      newBounds.height,
      Math.abs(newBounds.y) + display.bounds.y + display.bounds.height
    );
  });

  return newBounds;
}
