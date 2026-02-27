import { test as base } from '@playwright/test';
import fs from 'fs';
import { closePopupsIfExist } from './loginHelpers';
import { GLOBAL_DATA_PATH } from './constants';

type SystemResult = {
  hostname: string;
  archiveName: string;
};

type SystemsTestData = {
  packageSystems: SystemResult[];
  bootcSystems: SystemResult[];
  workspaceSystems: SystemResult[];
  deleteSystems: SystemResult[];
};

export const test = base.extend<{
  systems: SystemsTestData;
}>({
  page: async ({ page }, use) => {
    await closePopupsIfExist(page);
    await use(page);
  },

  systems: async ({}, use) => {
    const data: SystemsTestData = JSON.parse(
      fs.readFileSync(GLOBAL_DATA_PATH, 'utf-8'),
    );

    await use(data);
  },
});
