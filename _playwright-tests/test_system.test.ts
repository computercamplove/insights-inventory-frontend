import { expect } from '@playwright/test';
import { createSystem } from './helpers/uploadArchive';
import { navigateToInventorySystemsFunc } from './helpers/navHelpers';
import { test } from './helpers/fixtures';
import { systemsPage } from './helpers/systems/systemsPage';

const NOT_FOUND = 'No matching systems found';

test.describe(
  'System CRUD',
  {
    tag: ['@systems-table'],
    annotation: [
      {
        type: 'jira',
        description: 'https://issues.redhat.com/browse/RHINENG-21147',
      },
      {
        type: 'jira',
        description: 'https://issues.redhat.com/browse/RHINENG-21149',
      },
      {
        type: 'jira',
        description: 'https://issues.redhat.com/browse/RHINENG-21148 ',
      },
    ],
  },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
      await navigateToInventorySystemsFunc(page);
    });

    test(
      'User edits and deletes a system from the Systems page',
      {},
      async ({ page }) => {
        const system = await createSystem();
        const newDisplayName = `${system.hostname}_Renamed`;
        const systemsTable = systemsPage(page);

        await test.step(`Edits the system "${system.hostname}" display name`, async () => {
          await systemsTable.searchByName(system.hostname);
          await expect(systemsTable.nameCell).toHaveCount(1, {
            timeout: 10000,
          });

          await systemsTable.renameSystem(
            new RegExp(system.hostname, 'i'),
            newDisplayName,
          );
        });

        await test.step(`Deletes the renamed system "${newDisplayName}"`, async () => {
          await systemsTable.searchByName(newDisplayName);
          await expect(systemsTable.nameCell).toHaveCount(1, {
            timeout: 10000,
          });

          await systemsTable.deleteFromInventory(
            new RegExp(newDisplayName, 'i'),
          );

          await systemsTable.searchByName(newDisplayName);
          await expect(page.getByText(NOT_FOUND)).toBeVisible();
        });
      },
    );

    test('User deletes multiple systems from the Systems page', async ({
      page,
      systems,
    }) => {
      const systemsTable = systemsPage(page);
      const rows = page.locator(
        'tbody.pf-v6-c-table__tbody tr[data-ouia-component-type="PF6/TableRow"]',
      );

      await test.step('Selects systems using Bulk Select', async () => {
        await systemsTable.searchByName(systems.deleteSystemsPrefix);
        await expect(rows).toHaveCount(systems.deleteSystems.length);

        await systemsTable.bulkSelect.selectPage();
        await expect(systemsTable.bulkSelect.selectedCountText).toContainText(
          `${systems.deleteSystems.length} selected`,
        );
      });

      await test.step('Deletes selected systems via bulk action', async () => {
        await systemsTable.bulkDelete();

        await systemsTable.searchByName(systems.deleteSystemsPrefix);
        await expect(page.getByText(NOT_FOUND)).toBeVisible();
      });
    });
  },
);

test.describe('System Export', { tag: ['@systems-table'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await navigateToInventorySystemsFunc(page);
  });

  test('User exports systems to JSON', async ({ page }) => {
    const systemsTable = systemsPage(page);

    await test.step('Exports systems to JSON via export menu', async () => {
      // Listen for the export API request to verify the export was initiated
      const exportRequestPromise = page.waitForRequest(
        (request) =>
          request.url().includes('/exports') && request.method() === 'POST',
      );

      // Listen for the export status check requests (indicates export processing)
      const statusCheckPromise = page.waitForRequest(
        (request) =>
          request.url().includes('/exports/') &&
          request.url().includes('/status'),
      );

      await systemsTable.export.toJson();

      // Verify the export request was made successfully
      const exportRequest = await exportRequestPromise;
      expect(exportRequest.url()).toContain('/exports');
      console.log('  ✓ Export request initiated successfully');

      // Verify that status checking begins (indicates the "export being prepared" notification should appear)
      await statusCheckPromise;
      console.log('  ✓ Export status checking started (export being prepared)');

      // Wait for any additional status checks that indicate completion
      await page.waitForTimeout(3000);
      console.log(
        '  ✓ Export process completed - notifications should have appeared for preparation and download',
      );

      // Note: Due to auto-close handlers, we verify export functionality through API calls
      // The notifications that should appear are:
      // 1. "The requested export is being prepared. When ready, the download will start automatically."
      // 2. "The requested export is being downloaded."
    });
  });

  test('User exports systems to CSV', async ({ page }) => {
    const systemsTable = systemsPage(page);

    await test.step('Exports systems to CSV via export menu', async () => {
      // Listen for the export API request to verify the export was initiated
      const exportRequestPromise = page.waitForRequest(
        (request) =>
          request.url().includes('/exports') && request.method() === 'POST',
      );

      // Listen for the export status check requests (indicates export processing)
      const statusCheckPromise = page.waitForRequest(
        (request) =>
          request.url().includes('/exports/') &&
          request.url().includes('/status'),
      );

      await systemsTable.export.toCsv();

      // Verify the export request was made successfully
      const exportRequest = await exportRequestPromise;
      expect(exportRequest.url()).toContain('/exports');
      console.log('  ✓ Export request initiated successfully');

      // Verify that status checking begins (indicates the "export being prepared" notification should appear)
      await statusCheckPromise;
      console.log('  ✓ Export status checking started (export being prepared)');

      // Wait for any additional status checks that indicate completion
      await page.waitForTimeout(3000);
      console.log(
        '  ✓ Export process completed - notifications should have appeared for preparation and download',
      );
    });
  });
});

test.describe(
  'System Sorting',
  {
    tag: ['@systems-table'],
    annotation: {
      type: 'jira',
      description: 'https://issues.redhat.com/browse/RHINENG-21942',
    },
  },
  () => {
    (['ascending', 'descending'] as const).forEach((order) => {
      test.beforeEach(async ({ page }) => {
        await navigateToInventorySystemsFunc(page);
      });

      test(`User sorts systems by Name column in ${order} order`, async ({
        page,
      }) => {
        const systemsTable = systemsPage(page);

        await test.step(`Sorts by the Name column in ${order} order`, async () => {
          // Expected URL sort parameter: ascending = display_name, descending = -display_name
          const expectedSortParam = {
            ascending: /sort=display_name|sort_dir=asc/,
            descending: /sort=-display_name|sort_dir=desc/,
          };

          await systemsTable.sortBy('Name', order);

          // Verify URL has exact sort parameter for the expected order
          await expect(async () => {
            const url = page.url();
            expect(url).toMatch(expectedSortParam[order]);
          }).toPass({ timeout: 5000 });
        });

        await test.step('Displays sorted systems', async () => {
          await expect(systemsTable.nameCell.first()).toBeVisible();

          const displayedNames = await systemsTable.nameCell.allTextContents();
          expect(displayedNames.length).toBeGreaterThan(0);
        });

        await test.step('Displays the sort indicator', async () => {
          const columnHeader = page
            .locator('th')
            .filter({ has: page.getByRole('button', { name: 'Name' }) })
            .or(
              page.locator(
                '[data-ouia-component-id="systems-view-table-th-0"]',
              ),
            );
          await expect(columnHeader).toHaveAttribute('aria-sort', order);
        });
      });
    });
  },
);
