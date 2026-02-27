import { expect } from '@playwright/test';
import { navigateToInventorySystemsFunc } from './helpers/navHelpers';
import { test } from './helpers/fixtures';
import { searchByName } from './helpers/filterHelpers';
import { closePopupsIfExist } from './helpers/loginHelpers';

test.describe('System Details tests', () => {
  test.beforeEach(async ({ page }) => {
    await closePopupsIfExist(page);
    await navigateToInventorySystemsFunc(page);
  });

  test('User should be able to see package system information', async ({
    page,
    systems,
  }) => {
    /**
     * Metadata:
       - requirements:
       - inv-hosts-get-by-id
       - importance: critical
     */
    const packageSystem = systems.packageSystems[0].hostname;

    await test.step('Setup: navigate to prepared system details page', async () => {
      const nameColumnLocator = page.locator('td[data-label="Name"]');
      await searchByName(page, packageSystem);
      await expect(nameColumnLocator).toHaveCount(1);

      const systemLink = page.getByRole('link', { name: packageSystem });
      await expect(systemLink).toBeVisible({ timeout: 100000 });
      await systemLink.click();

      await expect(
        page.getByRole('heading', { name: packageSystem }),
      ).toBeVisible({
        timeout: 100000,
      });
    });

    await test.step('Verify system information in Overview tab', async () => {
      const systemTypeIcon = page.getByText(/Package-based/);
      await expect(systemTypeIcon).toBeVisible();

      const overviewTab = page.locator(
        'button[name="overview"][aria-selected="true"]',
      );
      await expect(overviewTab).toBeVisible();

      const status = page.locator(
        "[data-ouia-component-id='system-status-card']",
      );
      const properties = page.locator("[data-ouia-component-id='system-card']");
      const dataCollectors = page.locator(
        "[data-ouia-component-id='dataCollector-card']",
      );
      const subscriptions = page.locator(
        "[data-ouia-component-id='subscriptions-card']",
      );

      for (const card of [status, properties, dataCollectors, subscriptions]) {
        await expect(card).toBeVisible();
      }
    });

    await test.step('Verify system information in Details tab', async () => {
      await page.locator('button[name="details"]').click();
      const detailsTab = page.locator(
        'button[name="details"][aria-selected="true"]',
      );
      await expect(detailsTab).toBeVisible();

      const hardwareProperties = page.locator(
        "[data-ouia-component-id='hardware-properties-card']",
      );
      const networkInterfaces = page.locator(
        "[data-ouia-component-id='network-interfaces-card']",
      );
      const BIOS = page.locator("[data-ouia-component-id='bios-card']");
      const operatingSystem = page.locator(
        "[data-ouia-component-id='os-card']",
      );
      const configuration = page.locator(
        "[data-ouia-component-id='configuration-card']",
      );
      const bootc = page.locator("[data-ouia-component-id='bootmc-card']");
      // RHEL AI card should not be visible for systems without RHEL AI data
      const rhelAICard = page.locator(
        "[data-ouia-component-id='rhel-ai-card']",
      );
      await expect(rhelAICard).toBeHidden();

      // Verify the card title is also not present
      const cardTitle = page.getByText('RHEL AI');
      await expect(cardTitle).toBeHidden();

      for (const card of [
        hardwareProperties,
        networkInterfaces,
        BIOS,
        operatingSystem,
        configuration,
      ]) {
        await expect(card).toBeVisible();
      }

      // package system type is not displaying BOOTC card
      await expect(bootc).toBeHidden();
    });

    await test.step('Navigate to workspace details page via clicking workspace link', async () => {
      await page.locator('button[name="overview"]').click();
      const workspaceLink = page
        .locator('a')
        .filter({ hasText: 'Ungrouped Hosts' });
      await workspaceLink.click();

      await expect(
        page.getByRole('heading', { name: 'Ungrouped Hosts' }),
      ).toBeVisible();
    });
  });

  test('User should be able to see image-based system information', async ({
    page,
    systems,
  }) => {
    /**
     * Metadata:
       - requirements:
       - inv-hosts-get-by-id
       - importance: critical
     */
    const bootcSystem = systems.bootcSystems[0].hostname;

    await test.step('Setup: navigate to prepared system details page', async () => {
      const nameColumnLocator = page.locator('td[data-label="Name"]');
      await searchByName(page, bootcSystem);
      await expect(nameColumnLocator).toHaveCount(1);

      const systemLink = page.getByRole('link', { name: bootcSystem });
      await expect(systemLink).toBeVisible({ timeout: 100000 });
      await systemLink.click();

      await expect(
        page.getByRole('heading', { name: bootcSystem }),
      ).toBeVisible({
        timeout: 100000,
      });
    });

    await test.step('Verify system information', async () => {
      const systemTypeIcon = page.getByText(/Image-based/);
      await expect(systemTypeIcon).toBeVisible();

      await page.locator('button[name="details"]').click();
      const bootc = page.locator("[data-ouia-component-id='bootmc-card']");
      await expect(bootc).toBeVisible();

      // Complinace doesn't support image-based system
      const complianceTab = page.locator('button[name="compliance"]');
      await expect(complianceTab).toBeDisabled();
    });
  });
});
