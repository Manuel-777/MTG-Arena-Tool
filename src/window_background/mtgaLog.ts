import fs from "fs";
import { promisify } from "util";

const fsPromises = {
  access: promisify(fs.access),
  stat: promisify(fs.stat),
  open: promisify(fs.open),
  read: promisify(fs.read)
};

export function defaultLogUri(): string {
  if (process.platform !== "win32") {
    return (
      process.env.HOME +
      "/.wine/drive_c/user/" +
      process.env.USER +
      "/AppData/LocalLow/Wizards of the Coast/MTGA/output_log.txt"
    );
  }

  const windowsMtgaLogFolder =
    "LocalLow\\Wizards Of The Coast\\MTGA\\output_log.txt";
  return (
    process.env.APPDATA?.replace("Roaming", windowsMtgaLogFolder) ??
    "c:\\users\\" + process.env.USER + "\\AppData\\" + windowsMtgaLogFolder
  );
}

export async function exists(path: fs.PathLike): Promise<boolean> {
  try {
    await fsPromises.access(path, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

export async function stat(path: fs.PathLike): Promise<fs.Stats> {
  return await fsPromises.stat(path);
}

export async function readSegment(
  path: fs.PathLike,
  start: number | null,
  length: number
): Promise<string> {
  const fd = await fsPromises.open(path, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await fsPromises.read(fd, buffer, 0, length, start);
    return buffer.toString("utf-8", 0, bytesRead);
  } finally {
    fs.close(fd, () => {});
  }
}
