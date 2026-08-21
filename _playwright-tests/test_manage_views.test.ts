/* eslint-disable playwright/expect-expect */
/* eslint-disable prettier/prettier */
import { expect } from '@playwright/test';
import { navigateToInventorySystemsFunc } from './helpers/navHelpers';
import { test } from './helpers/fixtures';
import { columnManagementModal } from './helpers/views/columnManagementModal';
import {
  totalDefaultColumns,
  allSystemsColumns,
  malwareColumns,
  vulnerabilityColumns,
  COLUMN_LOCATOR,
} from './helpers/views/columnHelpers';
import { randomUUID } from 'crypto';
import { filterSystemsWithConditionalFilter, ToolbarFilterHelper } from './helpers/filterHelpers';
import { ManageViewHelper } from './helpers/views/manageViewsHelper';

const DEFAULT_PREFIX = 'automated-test';
const DEFAULT_VIEW = 'All Systems';

test.describe(
  'Inventory Views: Manage views CRUD operations',
  { tag: ['@inventory-views'] },
  () => {
    test.beforeEach(async ({ page }) => {
      await navigateToInventorySystemsFunc(page);
    });

    const viewName = `${DEFAULT_PREFIX}-${randomUUID()}`;
    const renamedView = `${viewName}-renamed`;

    test('User can create a new view, rename it, and delete it', async ({
      page,
    }) => {
      const manageView = new ManageViewHelper(page);

      await test.step(`Create new view`, async () => {
        await manageView.saveAs(viewName);
        await manageView.verifyActiveView(viewName);
      });

      await test.step(`Rename the view`, async () => {
        await manageView.rename(renamedView);
        await manageView.verifyActiveView(renamedView);
      });

      await test.step(`Delete active view`, async () => {
        await manageView.delete(renamedView);
      });

      await test.step(`Verify active view now is default view after deletion`, async () => {
        await manageView.verifyActiveView(DEFAULT_VIEW);
      }); 
    },  
  );
});

test.describe(
  'Inventory Views: Custom view',
  { tag: ['@inventory-views'] },
  () => {
    test.beforeEach(async ({ page }) => {
      await navigateToInventorySystemsFunc(page);
    });

    const viewA = `${DEFAULT_PREFIX}-${randomUUID()}`;
    const viewB = `${DEFAULT_PREFIX}-${randomUUID()}`

    const configurationA = {
      columns: vulnerabilityColumns,
      columnsCount: vulnerabilityColumns.length + totalDefaultColumns -1, // -1 because "Tags" column can't be saved to view (backend issue)
      filters: [
        {
          filter: 'System type',
          value: 'Package-based system',
        },
      ],
    };
    const configurationB = {
      columns: [...vulnerabilityColumns, ...malwareColumns],
      columnsCount: vulnerabilityColumns.length + malwareColumns.length + totalDefaultColumns -1, // -1 because "Tags" column can't be saved to view (backend issue)
      filters: [],
    };

    test('User can create custom views with own configuration', async ({
      page,
    }) => {
      const manageView = new ManageViewHelper(page);
      const manageColumnsModal = columnManagementModal(page);

      await test.step(`Create view ${viewA} with custom configuration`, async () => {
        await manageView.verifyActiveView(DEFAULT_VIEW);

        // Open column management modal and apply Vulnerability columns
        await manageColumnsModal.open();
        for (const column of configurationA.columns) {
          await manageColumnsModal.enableColumn(column);
        }
        await manageColumnsModal.save();

        // Apply filter
        await filterSystemsWithConditionalFilter(
          page,
          configurationA.filters[0].filter,
          configurationA.filters[0].value,
        );

        await manageView.saveAs(viewA);
        await manageView.verifyActiveView(viewA);
      });

      await test.step(`Modify current view ${viewA} and save as ${viewB}`, async () => {
        await manageView.verifyActiveView(viewA);

        // Open column management modal and apply Malware columns
        await manageColumnsModal.open();
        for (const column of malwareColumns) {
          await manageColumnsModal.enableColumn(column);
        }
        await manageColumnsModal.save();

        const resetFiltersButton = page.getByRole('button', { name: 'Clear filters' });
        await expect(resetFiltersButton).toBeVisible();
        await resetFiltersButton.click();

        await manageView.saveAs(viewB);
        await manageView.verifyActiveView(viewB);
      });

      await test.step(`Verify Default view ${DEFAULT_VIEW} has no custom configuration`, async () => {
        await manageView.selectView(DEFAULT_VIEW);
        // All systems view should have no custom configutaion, 
        // so all default columns should be visible and no filters applied
        await manageView.verifyActiveView(DEFAULT_VIEW);

        for (const column of allSystemsColumns) {
            await expect(
              page.locator(COLUMN_LOCATOR).filter({ hasText: new RegExp(column) }),
            ).toBeVisible({ timeout: 10000 });
          }
        
        const visibleHeaders = page.locator(COLUMN_LOCATOR).filter({ hasText: /.+/ });
        await expect(visibleHeaders).toHaveCount(totalDefaultColumns - 1, { timeout: 10000 });
      });

      await test.step(`Navigate to view ${viewB} and verify its configuration persists`, async () => {
        await manageView.selectView(viewB);
        await manageView.verifyActiveView(viewB);

        // Verify expected columns are visible 
        for (const column of configurationB.columns) {
          await expect(
            page.locator(COLUMN_LOCATOR).filter({ hasText: new RegExp(column) }),
          ).toBeVisible({ timeout: 10000 });
        }

        const visibleHeaders = page.locator(COLUMN_LOCATOR).filter({ hasText: /.+/ });
        await expect(visibleHeaders).toHaveCount(configurationB.columnsCount, { timeout: 10000 });

        // Verify no filters are applied
        const resetFiltersButton = page.getByRole('button', { name: 'Clear filters' });
        await expect(resetFiltersButton).toBeHidden();
      });

      await test.step(`Navigate to view ${viewA} and verify its configuration persists`, async () => {
        await manageView.selectView(viewA);
        await manageView.verifyActiveView(viewA);
        const filterToolbar = new ToolbarFilterHelper(page);

        // Verify expected columns are visible 
        for (const column of configurationA.columns) {
          await expect(
            page.locator(COLUMN_LOCATOR).filter({ hasText: new RegExp(column) }),
          ).toBeVisible({ timeout: 10000 });
        }

        const visibleHeaders = page.locator(COLUMN_LOCATOR).filter({ hasText: /.+/ });
        await expect(visibleHeaders).toHaveCount(configurationA.columnsCount, { timeout: 10000 });

        await filterToolbar.verifyFiltersApplied({
          [configurationA.filters[0].filter]: configurationA.filters[0].value,
        });
      });

    });
  },
);
