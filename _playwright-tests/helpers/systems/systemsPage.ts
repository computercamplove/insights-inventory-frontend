import { expect, type Locator, type Page } from '@playwright/test';
import {
  filterSystemsWithConditionalFilter,
  searchByName,
  waitForTableKebabReady,
} from '../filterHelpers';
import {
  deleteSystemModal,
  moveToWorkspaceModal,
  renameSystemModal,
} from './systemsModals';

const SKELETON_TABLE = '[data-ouia-component-id="SkeletonTable"]';

export type SortDirection = 'ascending' | 'descending';

/**
 * The "BulkSelect" toolbar dropdown (checkbox + "Select page/all/none" menu).
 * Mirrors `src/components/BulkSelect/BulkSelect.tsx`.
 */
export type BulkSelect = {
  toggle: Locator;
  selectedCountText: Locator;
  selectNoneOption: Locator;
  selectPageOption: Locator;
  selectAllOption: Locator;
  /** Opens the dropdown without picking an option. */
  open: () => Promise<void>;
  /** Selects every row on the current page. */
  selectPage: () => Promise<void>;
  /** Selects every row across all pages (only available when the toolbar supports it). */
  selectAll: () => Promise<void>;
  /** Clears the current selection. */
  selectNone: () => Promise<void>;
};

/**
 * The toolbar "Export" dropdown (Export all systems to JSON/CSV).
 */
export type SystemsExport = {
  toggle: Locator;
  exportToJsonOption: Locator;
  exportToCsvOption: Locator;
  /** Opens the dropdown and selects "Export all systems to JSON". */
  toJson: () => Promise<void>;
  /** Opens the dropdown and selects "Export all systems to CSV". */
  toCsv: () => Promise<void>;
};

export type SystemsPage = {
  root: Locator;
  dialog: Locator;
  nameCell: Locator;
  bulkSelect: BulkSelect;
  bulkDeleteButton: Locator;
  export: SystemsExport;
  /** Applies a conditional filter, e.g. filterBy('Workspace', 'My Workspace'). */
  filterBy: (filterName: string, option: string) => Promise<void>;
  /** Filters the table via the "Filter by name" input (reloads the page first). */
  searchByName: (name: string) => Promise<void>;
  /** Clicks a sortable column header until it reaches the requested direction. */
  sortBy: (columnName: string, direction: SortDirection) => Promise<void>;
  /** Clears all active filters via the toolbar "Reset filters"/"Clear filters" button. */
  clearFilters: () => Promise<void>;
  /** Opens the per-row kebab menu for the row matching rowName and returns it. */
  openRowMenu: (rowName: string | RegExp) => Promise<Locator>;
  /** Renames a host via the row kebab -> Edit (display name) flow. */
  renameSystem: (
    rowName: string | RegExp,
    newDisplayName: string,
  ) => Promise<void>;
  /** Removes a system from inventory via the row kebab -> Delete flow. */
  deleteFromInventory: (rowName: string | RegExp) => Promise<void>;
  /**
   * Moves a system to another workspace via the row kebab.
   * Handles both the Kessel "Move system" federated selector and the legacy
   * "Add to workspace" combobox, whichever is rendered for the current feature flags.
   */
  moveToWorkspace: (
    rowName: string | RegExp,
    workspaceName: string,
  ) => Promise<void>;
  /** Deletes every currently selected system via the toolbar bulk-delete button. */
  bulkDelete: () => Promise<void>;
};

/**
 * Locators/actions for the "BulkSelect" toolbar dropdown.
 *
 * @example
 * const select = bulkSelect(page);
 * await select.selectPage();
 * await expect(select.selectedCountText).toContainText('5 selected');
 */
export function bulkSelect(page: Page): BulkSelect {
  const toggle = page
    .locator('[data-ouia-component-id="BulkSelect-toggle"]')
    .or(page.locator('[data-ouia-component-id="BulkSelect"]'));
  const selectedCountText = page
    .locator('[id="bulk-select-systems-toggle-checkbox"]')
    .or(page.locator('[data-ouia-component-id="BulkSelect-text"]'));
  const selectNoneOption = page.getByRole('menuitem', { name: 'Select none' });
  const selectPageOption = page.getByRole('menuitem', { name: 'Select page' });
  const selectAllOption = page.getByRole('menuitem', { name: 'Select all' });

  const chooseOption = async (option: Locator) => {
    await toggle.click();
    await expect(option).toBeVisible();
    await option.click();
  };

  return {
    toggle,
    selectedCountText,
    selectNoneOption,
    selectPageOption,
    selectAllOption,

    async open() {
      await toggle.click();
    },

    async selectPage() {
      await chooseOption(selectPageOption);
    },

    async selectAll() {
      await chooseOption(selectAllOption);
    },

    async selectNone() {
      await chooseOption(selectNoneOption);
    },
  };
}

/**
 * Locators/actions for the toolbar "Export" dropdown.
 *
 * @example
 * const exportMenu = systemsExport(page);
 * await exportMenu.toJson();
 */
export function systemsExport(page: Page): SystemsExport {
  const toggle = page.getByRole('button', { name: 'Export' });
  const exportToJsonOption = page.getByRole('menuitem', {
    name: 'Export all systems to JSON',
  });
  const exportToCsvOption = page.getByRole('menuitem', {
    name: 'Export all systems to CSV',
  });

  return {
    toggle,
    exportToJsonOption,
    exportToCsvOption,

    async toJson() {
      await toggle.click();
      await exportToJsonOption.click();
    },

    async toCsv() {
      await toggle.click();
      await exportToCsvOption.click();
    },
  };
}

/**
 * Locators/actions for the Systems view (filtering, sorting, per-row actions).
 *
 * @example
 * const systems = systemsPage(page);
 * await systems.filterBy('Workspace', 'My Workspace');
 * await systems.sortBy('Name', 'ascending');
 * await systems.renameSystem(/my-host/i, 'my-host-renamed');
 * await systems.moveToWorkspace(/my-host/i, 'Other Workspace');
 * await systems.deleteFromInventory(/my-host/i);
 * await systems.bulkSelect.selectPage();
 * await systems.bulkDelete();
 * await systems.export.toJson();
 */
export function systemsPage(page: Page): SystemsPage {
  const root = page.locator('[data-ouia-component-id="systems-view"]');
  const dialog = page.locator('[role="dialog"]');
  const nameCell = page
    .locator('[data-ouia-component-id="systems-view-table-td-0-0"]')
    .or(page.locator('td[data-label="Name"]'));
  const bulkDeleteButton = page.locator(
    '[data-ouia-component-id="bulk-delete-button"]',
  );

  const toRegExp = (value: string | RegExp): RegExp =>
    typeof value === 'string' ? new RegExp(value, 'i') : value;

  return {
    root,
    dialog,
    nameCell,
    bulkSelect: bulkSelect(page),
    bulkDeleteButton,
    export: systemsExport(page),

    async filterBy(filterName, option) {
      await filterSystemsWithConditionalFilter(page, filterName, option);
    },

    async searchByName(name) {
      await searchByName(page, name);
    },

    async clearFilters() {
      const resetFiltersButton = page
        .getByRole('button', { name: 'Reset filters' })
        .or(page.getByRole('button', { name: 'Clear filters' }));
      if (
        await resetFiltersButton.isVisible({ timeout: 100 }).catch(() => false)
      ) {
        await resetFiltersButton.click();
        await page
          .locator(SKELETON_TABLE)
          .waitFor({ state: 'hidden', timeout: 10000 })
          .catch(() => {});
      }
    },

    async sortBy(columnName, direction) {
      const columnHeader = page
        .locator('button.pf-v6-c-table__button')
        .filter({ hasText: new RegExp(`^${columnName}$`) })
        .or(page.locator(`th[data-label="${columnName}"] button`));
      await expect(columnHeader).toBeVisible();

      for (let attempt = 0; attempt < 3; attempt++) {
        const currentSort = await columnHeader
          .locator('..')
          .getAttribute('aria-sort');
        if (currentSort === direction) break;

        await columnHeader.click();
        await page
          .locator(SKELETON_TABLE)
          .waitFor({ state: 'hidden', timeout: 10000 })
          .catch(() => {});
      }

      await expect(async () => {
        const finalSort = await columnHeader
          .locator('..')
          .getAttribute('aria-sort');
        expect(finalSort).toBe(direction);
      }).toPass({ timeout: 5000 });
    },

    async openRowMenu(rowName) {
      const kebab = await waitForTableKebabReady(page, toRegExp(rowName));
      await kebab.click();
      await expect(kebab).toHaveAttribute('aria-expanded', 'true');
      return kebab;
    },

    async renameSystem(rowName, newDisplayName) {
      await this.openRowMenu(rowName);

      // "Edit" (Kessel) or "Edit display name" (legacy) - both start with "Edit".
      const editButton = page.getByRole('menuitem', { name: /^Edit/ }).first();
      await expect(editButton).toBeEnabled({ timeout: 50000 });
      await editButton.click();

      await renameSystemModal(page).rename(newDisplayName);
    },

    async deleteFromInventory(rowName) {
      await this.openRowMenu(rowName);

      // "Delete" (Kessel) or "Delete from inventory" (legacy) - both start with "Delete".
      const deleteButton = page
        .getByRole('menuitem', { name: /^Delete/ })
        .first();
      await expect(deleteButton).toBeEnabled({ timeout: 50000 });
      await deleteButton.click();

      await deleteSystemModal(page).confirm();
    },

    async moveToWorkspace(rowName, workspaceName) {
      await this.openRowMenu(rowName);

      // "Move system" (Kessel) or "Add to workspace" (legacy) menu item.
      const moveButton = page
        .getByRole('menuitem', { name: /Add to workspace|Move system/ })
        .first();
      await expect(moveButton).toBeEnabled({ timeout: 50000 });
      await moveButton.click();

      await moveToWorkspaceModal(page).moveTo(workspaceName);
    },

    async bulkDelete() {
      await bulkDeleteButton.click();
      await deleteSystemModal(page).confirm();
    },
  };
}
