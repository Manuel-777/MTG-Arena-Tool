/* eslint-disable @typescript-eslint/camelcase */
import electron from "electron";

export default function getNewBounds(): electron.Rectangle {
  const newBounds = { x: 0, y: 0, width: 0, height: 0 };
  const displays = electron.screen.getAllDisplays();
  newBounds.x = Math.min(...displays.map((display) => display.bounds.x));
  newBounds.y = Math.min(...displays.map((display) => display.bounds.y));
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
