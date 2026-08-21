/* eslint-disable prettier/prettier */
import { Page, Locator, expect } from '@playwright/test';

export class ManageViewHelper {
  readonly page: Page;
  readonly manageViewToggle: Locator;
  readonly selectedView: Locator;
  readonly selectedViewMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.manageViewToggle = page.getByTestId('manage-view-toggle');
    this.selectedView = page.getByTestId('manage-view-select-view');
    this.selectedViewMenu = page.getByTestId('manage-view-select-view-dropdown');
  }

  /**
   * Opens the views dropdown and selects a view by its visible text name.
   */
  async selectView(view: string): Promise<void> {
    await expect(this.selectedView).toBeVisible();
    await this.selectedView.click();

    await expect(this.selectedViewMenu).toBeVisible();

    // Locates the specific option matching the target view name
    const optionToSelect = this.selectedViewMenu
      .getByRole('option')
      .filter({ hasText: view })
      .first();

    await expect(optionToSelect).toBeVisible();
    await optionToSelect.click();

    // Verify the dropdown closed and the view is selected
    await expect(this.selectedViewMenu).toBeHidden();
    await this.verifyActiveView(view);
  }

  /**
   * Saves the current view under a new name.
   */
  async saveAs(view: string): Promise<void> {
    await expect(this.manageViewToggle).toBeVisible();
    await this.manageViewToggle.click();
    await this.page.getByRole('menuitem', { name: 'Save as' }).click();

    const dialog = this.page.getByRole('dialog', { name: 'Save as' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('View name').fill(view);
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).toBeHidden();
  }

  /**
   * Renames the currently active view.
   */
  async rename(newName: string): Promise<void> {
    await this.manageViewToggle.click();
    await this.page.getByRole('menuitem', { name: 'Rename' }).click();

    const dialog = this.page.getByRole('dialog', { name: 'Rename view' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('View name').fill(newName);
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).toBeHidden();
  }

  /**
   * Deletes the active view.
   */
  async delete(view: string): Promise<void> {
    await this.verifyActiveView(view);
    await this.manageViewToggle.click();
    await this.page.getByRole('menuitem', { name: 'Delete' }).click();

    const dialog = this.page.getByRole('dialog', { name: 'Delete view' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(dialog).toBeHidden();

    // The UI falls back to another view after deletion; the title can take a
    // moment to update, so give this a longer timeout than the default.
    await expect(this.selectedView).not.toContainText(view, {
      timeout: 10000,
    });
  }

  /**
   * Asserts that the expected view name is currently selected in the UI.
   */
  async verifyActiveView(
    expectedViewName: string,
    { timeout = 5000 }: { timeout?: number } = {},
  ): Promise<void> {
    await expect(this.selectedView).toContainText(expectedViewName, {
      timeout,
    });
  }
}