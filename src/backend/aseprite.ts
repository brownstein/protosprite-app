import path from "path";
import os from "os";
import fs from "fs";
import tmpDirPromise from "temp-dir";
import childProcess from "child_process";
import { Data } from "protosprite-core";
import { importAsepriteSheetExport } from "protosprite-core/importers/aseprite";
import { packSpriteSheet } from "protosprite-core/transform";

// TODO(rbrownstein): Make this work on windows.
export async function findAsperiteBinary() {
  const knownPaths: string[] = [];

  switch (os.platform()) {
    case "darwin": {
      knownPaths.push(
        path.join(
          "~",
          "Library",
          "Application Support",
          "Steam",
          "steamapps",
          "common",
          "Aseprite",
          "Aseprite.app",
          "Contents",
          "MacOS",
          "aseprite",
        ),
        "/Users/rbrownstein/Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app/Contents/MacOS/aseprite",
        "/Applications/Aseprite.app/Contents/MacOS/aseprite",
      );
      break;
    }
    case "win32": {
      knownPaths.push(
        "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe",
        "C:\\Program Files (x86)\\Aseprite\\Aseprite.exe",
        "C:\\Program Files\\Aseprite\\Aseprite.exe",
      );
      break;
    }
    case "linux": {
      knownPaths.push(
        "~/.steam/debian-installation/steamapps/common/Aseprite/aseprite",
        os.homedir() + "/.local/share/Steam/steamapps/common/Aseprite/aseprite",
      );
      break;
    }
  }

  const failedPaths: string[] = [];
  for (const knownPath of knownPaths) {
    const pathExists = fs.existsSync(knownPath);
    if (pathExists) {
      // Known bug in path resolution.
      if (os.platform() === "win32") return knownPath;
      return knownPath.replaceAll(" ", "\\ ");
    } else {
      failedPaths.push(knownPath);
    }
  }

  console.warn("Unable to locate Aseprite binary at paths:")
  for (const failedPath of failedPaths) {
    console.warn("-", failedPath);
  }

  return null;
}

export async function importAseprite(sourceFilePath: string) {
  const tmpDir = ((await tmpDirPromise) as unknown as { default: string })
    .default;
  const asepriteBinPath = await findAsperiteBinary();
  if (!asepriteBinPath) return null;
  const workingDirectory = path.join(tmpDir, "protosprite");
  // Clear out working directory.
  fs.rmSync(workingDirectory, {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(workingDirectory);
  const sourceFileParts = path.parse(sourceFilePath);
  const workFileName = path.join(workingDirectory, sourceFileParts.base);
  fs.copyFileSync(sourceFilePath, workFileName);
  const workExportSheetName = path.join(
    workingDirectory,
    `${sourceFileParts.name}.json`,
  );
  const workExportPngName = path.join(
    workingDirectory,
    `${sourceFileParts.name}.png`,
  );
  const asepriteArgs = [
    "-b",
    "--sheet",
    workExportPngName,
    "--data",
    workExportSheetName,
    "--format json-hash",
    "--split-layers",
    "--all-layers",
    "--list-layers",
    "--list-tags",
    "--ignore-empty",
    "--merge-duplicates",
    "--border-padding 1",
    "--shape-padding 1",
    "--trim",
    '--filename-format "({layer}) {frame}"',
    workFileName,
  ];
  if (os.platform() === "win32") {
    try {
      const exePathParts = path.parse(asepriteBinPath);
      childProcess.execFileSync(exePathParts.base, asepriteArgs, {
        cwd: exePathParts.dir,
        shell: true,
        timeout: 10000
      });
    } catch (err) {
      console.error("Failed to spawn Aseprite.exe", err);
      return null;
    }
  } else {
    childProcess.execSync(`${asepriteBinPath} ${asepriteArgs.join(" ")}`);
  }
  const sheetJsonData = JSON.parse(
    fs.readFileSync(workExportSheetName, { encoding: "utf8" }),
  );
  const rawSprite = importAsepriteSheetExport(sheetJsonData, {
    referenceType: "file",
    frameNameFormat: "({layer}) {frame}",
    assetPath: workingDirectory + path.sep,
    debug: false,
  });
  const sheetData = new Data.SpriteSheetData();
  sheetData.sprites.push(rawSprite);
  const packedSpriteSheet = await packSpriteSheet(sheetData);
  return packedSpriteSheet;
}
