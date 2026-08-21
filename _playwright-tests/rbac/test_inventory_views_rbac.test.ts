import { expect } from '@playwright/test';
import { test } from '../helpers/fixtures';
import { navigateToInventorySystemsFunc } from '../helpers/navHelpers';
import { columnManagementModal } from '../helpers/views/columnManagementModal';
import { vulnerabilityColumns } from '../helpers/views/columnHelpers';

test.use({ storageState: '.auth/viewer_user.json' });

test.describe(
  'Inventory Views per-service RBAC',
  { tag: ['@inventory-views'] },
  () => {
    test.beforeEach(async ({ page }) => {
      await navigateToInventorySystemsFunc(page);
    });

    test('User without Vulnerability permissions sees lock icons in table vulnerability cells', async ({
      page,
    }) => {
      const modal = columnManagementModal(page);
      await modal.open();
      for (const col of vulnerabilityColumns) {
        await modal.enableColumn(col);
      }
      await modal.save();

      // Viewer account has no vulnerability access — expect lock icons
      const lockCells = page.locator(
        'td span[aria-label*="do not have the necessary Vulnerability permissions"]',
      );
      await expect(lockCells.first()).toBeVisible();
    });

    test('User without Vulnerability permissions sees lock icons for denied columns', async ({
      page,
    }) => {
      const modal = columnManagementModal(page);
      await modal.open();

      const vulnLock = modal.root.locator(
        'span[aria-label*="do not have the necessary Vulnerability permissions"]',
      );
      await expect(vulnLock.first()).toBeVisible();

      await modal.cancel();
    });

    test('User without Vulnerability permissions cannot sort Vulnerability columns', async ({
      page,
    }) => {
      const modal = columnManagementModal(page);
      await modal.open();
      await modal.enableColumn('Total CVEs');
      await modal.save();

      const totalCvesHeader = page.getByRole('columnheader', {
        name: 'Total CVEs',
      });
      await expect(totalCvesHeader).toBeVisible();
      await expect(totalCvesHeader).not.toHaveAttribute('aria-sort');

      await totalCvesHeader.click();
      await expect(totalCvesHeader).not.toHaveAttribute('aria-sort');
    });
  },
);
