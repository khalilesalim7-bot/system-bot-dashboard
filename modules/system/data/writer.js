const fs = require('fs');
const path = require('path');

const pendingWrites = new Map();
const writeTimers = new Map();

function debouncedWrite(filePath, data, delayMs = 3000) {
  if (writeTimers.has(filePath)) {
    clearTimeout(writeTimers.get(filePath));
  }
  pendingWrites.set(filePath, data);
  writeTimers.set(filePath, setTimeout(async () => {
    const finalData = pendingWrites.get(filePath);
    pendingWrites.delete(filePath);
    writeTimers.delete(filePath);
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(finalData, null, 2));
    } catch (err) {
      console.error(`Failed to write ${filePath}:`, err);
    }
  }, delayMs));
}

async function writeNow(filePath, data) {
  if (writeTimers.has(filePath)) {
    clearTimeout(writeTimers.get(filePath));
    writeTimers.delete(filePath);
  }
  pendingWrites.delete(filePath);
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
  }
}

async function flushAll() {
  for (const [filePath, data] of pendingWrites) {
    if (writeTimers.has(filePath)) {
      clearTimeout(writeTimers.get(filePath));
      writeTimers.delete(filePath);
    }
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Failed to write ${filePath}:`, err);
    }
  }
  pendingWrites.clear();
}

process.on('beforeExit', async () => {
  await flushAll();
});

process.on('SIGINT', async () => {
  await flushAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await flushAll();
  process.exit(0);
});

module.exports = { debouncedWrite, writeNow, flushAll };
