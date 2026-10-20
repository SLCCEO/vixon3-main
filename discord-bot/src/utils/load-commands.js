import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findJavaScriptFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  }));

  return nested.flat().sort();
}

export async function loadCommands(directory) {
  const files = await findJavaScriptFiles(directory);
  const commands = await Promise.all(files.map(async (filePath) => {
    const imported = await import(pathToFileURL(filePath).href);
    const command = imported.default;

    if (!command?.data?.name || typeof command.execute !== 'function') {
      throw new TypeError(`Invalid command module: ${filePath}`);
    }

    return command;
  }));

  return commands;
}
