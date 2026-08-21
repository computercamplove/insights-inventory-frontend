/* eslint-disable playwright/no-wait-for-selector */
import { expect } from '@playwright/test';
import { test } from './helpers/fixtures';
import { navigateToInventorySystemsFunc } from './helpers/navHelpers';
import { assertAllContain, parseLastSeenToDays } from './helpers/filterHelpers';
import { closePopupsIfExist } from './helpers/loginHelpers';
import {
  BASE_ARCHIVE_TAG_COUNT,
  TAG,
  isInventoryViewsEnabled,
  isLegacyInventoryTableEnabled,
} from './helpers/constants';
import { scrollColumnIntoView } from './helpers/views/columnHelpers';
import { systemsPage } from './helpers/systems/systemsPage';
import { tagsModal } from './helpers/systems/systemsModals';

test.describe('Filtering Systems Tests', { tag: ['@systems-table'] }, () => {
  const operatingSystemTestCases = [
    { OS: 'RHEL 9.4' },
    { OS: 'CentOS Linux 7.6' },
  ];

  test.beforeEach(async ({ page }) => {
    await closePopupsIfExist(page);
    await navigateToInventorySystemsFunc(page);
    await systemsPage(page).clearFilters();
  });

  test('User filters systems by System type', async ({ page }) => {
    const systemsTable = systemsPage(page);
    const imageIconAriaLabel = 'Image mode icon';
    const packageIconAriaLabel = 'Package mode icon';
    const imageIcons = page.locator(`[aria-label="${imageIconAriaLabel}"]`);
    const packageIcons = page.locator(`[aria-label="${packageIconAriaLabel}"]`);

    await test.step('Filters by Package-based system option', async () => {
      await systemsTable.filterBy('System type', 'Package-based system');
      await expect(imageIcons).toHaveCount(0);
      const packageCount = await packageIcons.count();
      expect(packageCount).toBeGreaterThan(0);
    });

    await test.step('Filters by Image-based system option', async () => {
      await systemsTable.clearFilters();

      await systemsTable.filterBy('System type', 'Image-based system');
      await expect(packageIcons).toHaveCount(0);
      const imageCount = await imageIcons.count();
      expect(imageCount).toBeGreaterThan(0);

      await expect(
        page.getByRole('button', { name: 'View by systems' }),
      ).toBeVisible();
    });
  });

  test('User filters systems by workspace', async ({
    page,
    workspaceWithSystem,
  }) => {
    await systemsPage(page).filterBy('Workspace', workspaceWithSystem.name);

    const workspaceCell = page
      .locator('td[data-label="Workspace"]', {
        hasText: workspaceWithSystem.name,
      })
      .or(
        page.locator(
          'td[data-ouia-component-id^="systems-view-table-td-"][data-ouia-component-id$="-1"]',
          {
            hasText: workspaceWithSystem.name,
          },
        ),
      );
    await expect(workspaceCell.first()).toBeVisible();
    const count = await workspaceCell.count();
    await expect(workspaceCell).toHaveText(
      Array(count).fill(workspaceWithSystem.name),
    );
  });

  test('User filters systems by OS major version option', async ({ page }) => {
    const OS = 'RHEL 9';
    await systemsPage(page).filterBy('Operating system', OS);

    // Verify all filter chips contain Major version OS RHEL 9
    const filterChipGroup = page.locator('span.pf-v6-c-label__text');
    const pattern = /RHEL 9\./;
    await assertAllContain(filterChipGroup, pattern);

    // Multiple RHEL 9 versions should be applied when filtering by major OS version
    expect(await filterChipGroup.count()).toBeGreaterThanOrEqual(1);

    // OS version should contain expected major version of OS
    const columnVersionOS = page
      .locator('td[data-label="OS"]')
      .or(
        page.locator(
          'td[data-ouia-component-id^="systems-view-table-td-"][data-ouia-component-id$="-3"]',
        ),
      );
    await assertAllContain(columnVersionOS, pattern);
  });

  operatingSystemTestCases.forEach((testData) => {
    test(`User filters systems by OS version: ${testData.OS}`, async ({
      page,
    }) => {
      await test.step('Applies Operating system filter', async () => {
        await systemsPage(page).filterBy('Operating system', testData.OS);
      });

      await test.step('Shows filtered results with correct OS', async () => {
        const columnVersionOS = page
          .locator('td[data-label="OS"]', { hasText: testData.OS })
          .or(
            page.locator(
              'td[data-ouia-component-id^="systems-view-table-td-"][data-ouia-component-id$="-3"]',
              { hasText: testData.OS },
            ),
          );
        await expect(columnVersionOS.first()).toBeVisible();
        const count = await columnVersionOS.count();
        await expect(columnVersionOS).toHaveText(
          Array(count).fill(testData.OS),
        );
      });
    });
  });

  test('User filters systems by Tags', async ({ page }) => {
    const systemsTable = systemsPage(page);
    const tagOption = `${TAG.name}=${TAG.value}`;

    await test.step('Filters systems by tag', async () => {
      await systemsTable.filterBy('Tags', tagOption);

      const tagsRows = page.locator(
        '[data-ouia-component-id="TagCount-text"]',
        {
          hasText: `${BASE_ARCHIVE_TAG_COUNT}`,
        },
      );
      await expect(tagsRows.first()).toBeVisible();
      const count = await tagsRows.count();
      await expect(tagsRows).toHaveText(
        Array(count).fill(String(BASE_ARCHIVE_TAG_COUNT)),
      );
    });

    await test.step('Sees expected tag in Tags modal', async () => {
      // TODO: Remove when RHINENG-22581 is fixed
      const inputLocator = isLegacyInventoryTableEnabled
        ? page.getByPlaceholder('Filter by tags').nth(1)
        : page.getByPlaceholder('Filter by tags');
      await inputLocator.fill('');

      // get name of system we check the tags to verify tags modal title
      const nameCell = systemsTable.nameCell.first();
      await nameCell.waitFor({ state: 'visible' });
      const expectedSystemName = await nameCell.innerText();

      // open Tags modal
      const tagButton = page.locator('[data-ouia-component-id="TagCount"]');

      // When INVENTORY_VIEWS is enabled, scroll the Tags column into view
      if (isInventoryViewsEnabled) {
        await scrollColumnIntoView(tagButton.first());
      }

      await tagButton.first().click();
      const modal = tagsModal(page);
      // Title of the modal should be the name + tags count of clicked system
      const tagModalTitle = `${expectedSystemName} (${BASE_ARCHIVE_TAG_COUNT})`;
      await expect(modal.heading(tagModalTitle)).toBeVisible({
        timeout: 10000,
      });

      // search for expected tag
      await modal.filterByTag(TAG.value);
      await expect(modal.nameCell).toHaveText(TAG.name);
      await expect(modal.valueCell).toHaveText(TAG.value);
      await expect(modal.tagSourceCell).toHaveText(TAG.tagSource);
    });
  });

  test(
    'User filters systems by Last seen: Within the last 24 hours',
    {
      annotation: [
        {
          type: 'jira',
          description: 'https://issues.redhat.com/browse/RHINENG-20810',
        },
        {
          type: 'note',
          description:
            'Only testing "Within the last 24 hours" filter as active test systems ' +
            'reliably check in within this window. Other staleness filters (>1d, >7d, etc.) ' +
            'require systems with controlled last-seen timestamps which the test environment ' +
            'cannot guarantee.',
        },
      ],
    },
    async ({ page }) => {
      await test.step('Applies Last seen filter', async () => {
        await systemsPage(page).filterBy(
          'Last seen',
          'Within the last 24 hours',
        );
      });

      await test.step('Table displays filter chip', async () => {
        const filterChip = page.locator('span.pf-v6-c-label__text', {
          hasText: 'Within the last 24 hours',
        });
        await expect(filterChip).toBeVisible({ timeout: 10000 });
      });

      await test.step('Table displays filtered results', async () => {
        await page.waitForSelector('.loading-spinner', {
          state: 'hidden',
          timeout: 10000,
        });

        const tableRows = page.locator('table tbody tr');
        await expect(async () => {
          const rowCount = await tableRows.count();
          expect(
            rowCount,
            'Expected systems within last 24 hours - active test systems should exist',
          ).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });
      });

      await test.step('Table shows Last seen values within 24 hours', async () => {
        const lastSeenCells = page.locator(
          'table tbody tr td[data-label="Last seen"]',
        );
        const cellCount = await lastSeenCells.count();

        for (let i = 0; i < cellCount; i++) {
          const cellText = await lastSeenCells.nth(i).textContent();
          expect(
            cellText,
            `Row ${i + 1} should have Last seen text`,
          ).toBeTruthy();

          const days = parseLastSeenToDays(cellText!);
          // "Within the last 24 hours" means 0 days (hours/minutes/seconds ago)
          expect(
            days,
            `Row ${i + 1}: "${cellText}" should be within 24 hours (0 days), got ${days} days`,
          ).toBe(0);
        }
      });
    },
  );
});
