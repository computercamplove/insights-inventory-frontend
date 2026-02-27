import fs from 'fs';
import path from 'path';
import { MANIFEST_PATH, RUN_ID, GLOBAL_DATA_PATH } from './constants';

export function cleanupAllArchives() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log(`No manifest found for run ${RUN_ID}. Skipping...`);
    return;
  }

  try {
    const entries = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

    for (const entry of entries) {
      const archivePath = path.resolve('host_archives', entry.archiveName);
      const dirPath = path.resolve(entry.workingDir);

      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
        console.log(`Deleted archive: ${entry.archiveName}`);
      }

      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Deleted directory: ${entry.workingDir}`);
      }
    }

    // Delete the manifest itself after we're done
    fs.unlinkSync(MANIFEST_PATH);
  } catch (error) {
    console.error('Error during cleanupAllArchives:', error);
  }
}

export function cleanupGlobalTestData() {
  if (!fs.existsSync(GLOBAL_DATA_PATH)) {
    console.log('No global test data file found. Skipping...');
    return;
  }

  try {
    fs.unlinkSync(GLOBAL_DATA_PATH);
    console.log(`Deleted ${GLOBAL_DATA_PATH}`);
  } catch (error) {
    console.error('Error during cleanupGlobalTestData:', error);
  }
}
