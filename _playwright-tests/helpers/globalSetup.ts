// _playwright-tests/helpers/globalSetup.ys
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { setupMultipleSystemsParallel } from './uploadArchive';
import { BOOTC_ARCHIVE, GLOBAL_DATA_PATH } from './constants';

async function globalSetup(config: FullConfig) {
  try {
    const packageSystems = await setupMultipleSystemsParallel();
    const bootcSystems = await setupMultipleSystemsParallel(
      Array(3).fill(BOOTC_ARCHIVE),
    );
    const workspaceSystems = await setupMultipleSystemsParallel();
    const deleteSystems = await setupMultipleSystemsParallel();

    const systems = {
      packageSystems,
      bootcSystems,
      workspaceSystems,
      deleteSystems,
    };

    fs.writeFileSync(GLOBAL_DATA_PATH, JSON.stringify(systems, null, 2));
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
