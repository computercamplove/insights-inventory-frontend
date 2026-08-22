import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Confirmation modal shown for both single and bulk removal.
 * Mirrors `src/Utilities/DeleteModal.tsx` - title reads
 * "Delete system from inventory?" (single) or "Delete systems from inventory?" (bulk).
 */
export type DeleteSystemModal = {
  root: Locator;
  title: Locator;
  deleteButton: Locator;
  cancelButton: Locator;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
};

/**
 * Edit display name modal. Mirrors
 * `src/components/GeneralInfo/TextInputModal/TextInputModal.js` -
 * opened from the row kebab via "Edit" (Kessel) or "Edit display name" (legacy).
 */
export type RenameSystemModal = {
  root: Locator;
  nameInput: Locator;
  saveButton: Locator;
  cancelButton: Locator;
  rename: (newDisplayName: string) => Promise<void>;
  cancel: () => Promise<void>;
};

/**
 * The per-system Tags modal opened via the "TagCount" button in the table.
 * Title reads "<system name> (<tag count>)"; body has a "Filter tags" input
 * and a Name/Value/Tag source table.
 */
export type TagsModal = {
  root: Locator;
  filterInput: Locator;
  nameCell: Locator;
  valueCell: Locator;
  tagSourceCell: Locator;
  /** Locator for the modal heading, scoped to the given title (system name + tag count). */
  heading: (title: string) => Locator;
  /** Filters the tag table by tag name/value. */
  filterByTag: (value: string) => Promise<void>;
};

/**
 * Move-to-workspace modal. Covers both variants surfaced from the row kebab:
 * - Kessel: `src/components/InventoryTable/MoveSystemsToWorkspaceModal.tsx`,
 *   title "Move system"/"Move systems", uses the federated `WorkspaceSelectorField`
 *   ("Select workspaces" toggle -> `workspace-selector-menu` popover), submit button "Move".
 * - Legacy: `src/components/InventoryGroups/Modals/AddSelectedHostsToGroupModal.js`,
 *   title "Add to workspace", uses a data-driven-forms "Select workspace" combobox,
 *   submit button "Add".
 */
export type MoveToWorkspaceModal = {
  root: Locator;
  title: Locator;
  /** Kessel-only: opens the federated workspace selector popover. */
  workspaceSelectorToggle: Locator;
  /** Kessel-only: the federated selector popover (queried from `page`, not `root`). */
  workspaceSelectorMenu: Locator;
  /** Kessel-only: search input inside `workspaceSelectorMenu`. */
  workspaceSearchInput: Locator;
  /** Kessel-only: confirms the picked workspace inside `workspaceSelectorMenu`. */
  workspaceSelectorConfirmButton: Locator;
  /** Legacy-only: opens the data-driven-forms workspace combobox. */
  legacyWorkspaceCombobox: Locator;
  submitButton: Locator;
  cancelButton: Locator;
  moveTo: (workspaceName: string) => Promise<void>;
  cancel: () => Promise<void>;
};

/**
 * Locators/actions for the "Delete system(s) from inventory?" confirmation modal.
 *
 * @example
 * const modal = deleteSystemModal(page);
 * await expect(modal.root).toBeVisible();
 * await modal.confirm();
 */
export function deleteSystemModal(page: Page): DeleteSystemModal {
  const root = page.locator('[role="dialog"]');
  const deleteButton = root.getByRole('button', { name: 'Delete' });
  const cancelButton = root.getByRole('button', { name: 'Cancel' });

  return {
    root,
    title: root.getByText(/^Delete systems? from inventory\?$/),
    deleteButton,
    cancelButton,

    async confirm() {
      await expect(root).toBeVisible();
      await deleteButton.click();
      await expect(root).toBeHidden();
    },

    async cancel() {
      await expect(root).toBeVisible();
      await cancelButton.click();
      await expect(root).toBeHidden();
    },
  };
}

/**
 * Locators/actions for the "Edit"/"Edit display name" rename modal.
 *
 * @example
 * const modal = renameSystemModal(page);
 * await modal.rename('new-host-name');
 */
export function renameSystemModal(page: Page): RenameSystemModal {
  const root = page.locator('[role="dialog"]');
  const nameInput = root.getByRole('textbox').first();
  const saveButton = root.getByRole('button', { name: 'Save' });
  const cancelButton = root.getByRole('button', { name: 'Cancel' });

  return {
    root,
    nameInput,
    saveButton,
    cancelButton,

    async rename(newDisplayName: string) {
      await expect(root).toBeVisible();
      await nameInput.fill(newDisplayName);
      await expect(nameInput).toHaveValue(newDisplayName);
      await saveButton.click();
      await expect(root).toBeHidden();
    },

    async cancel() {
      await expect(root).toBeVisible();
      await cancelButton.click();
      await expect(root).toBeHidden();
    },
  };
}

/**
 * Locators/actions for the move-to-workspace modal. Detects at runtime whether
 * the Kessel federated selector or the legacy combobox is rendered.
 *
 * @example
 * const modal = moveToWorkspaceModal(page);
 * await modal.moveTo('Other Workspace');
 */
export function moveToWorkspaceModal(page: Page): MoveToWorkspaceModal {
  const root = page.locator('[role="dialog"]');
  const workspaceSelectorToggle = root.getByRole('button', {
    name: 'Select workspaces',
  });
  const workspaceSelectorMenu = page.getByTestId('workspace-selector-menu');
  const workspaceSearchInput = workspaceSelectorMenu.getByRole('textbox', {
    name: 'Search input',
  });
  const workspaceSelectorConfirmButton = workspaceSelectorMenu.getByTestId(
    'workspace-selector-confirm',
  );
  const legacyWorkspaceCombobox = root.getByRole('button', {
    name: 'Select workspace',
  });
  const submitButton = root.getByRole('button', { name: /^(Move|Add)$/ });
  const cancelButton = root.getByRole('button', { name: 'Cancel' });

  return {
    root,
    title: root.getByText(/^(Move systems?|Add to workspace)$/),
    workspaceSelectorToggle,
    workspaceSelectorMenu,
    workspaceSearchInput,
    workspaceSelectorConfirmButton,
    legacyWorkspaceCombobox,
    submitButton,
    cancelButton,

    async moveTo(workspaceName: string) {
      await expect(root).toBeVisible();

      const isKesselFlow = await workspaceSelectorToggle
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (isKesselFlow) {
        // Kessel flow: federated WorkspaceSelector (insights-rbac-ui), renders
        // its menu outside the dialog, so it's queried from `page`.
        await workspaceSelectorToggle.click();
        await expect(workspaceSelectorMenu).toBeVisible({ timeout: 15000 });
        await expect(workspaceSearchInput).toBeVisible({ timeout: 5000 });
        await workspaceSearchInput.fill(workspaceName);

        const workspaceButton = workspaceSelectorMenu.getByRole('button', {
          name: workspaceName,
          exact: true,
        });
        await expect(workspaceButton).toBeVisible({ timeout: 15000 });
        await workspaceButton.click();
        await workspaceSelectorConfirmButton.click();
      } else {
        // Legacy flow: data-driven-forms "Select workspace" combobox.
        await legacyWorkspaceCombobox.click();
        await page
          .getByRole('option', { name: workspaceName, exact: true })
          .click();
      }

      await submitButton.click();
      await expect(root).toBeHidden({ timeout: 15000 });
    },

    async cancel() {
      await expect(root).toBeVisible();
      await cancelButton.click();
      await expect(root).toBeHidden();
    },
  };
}

/**
 * Locators/actions for the per-system Tags modal.
 *
 * @example
 * const modal = tagsModal(page);
 * await expect(modal.heading(`${systemName} (${tagCount})`)).toBeVisible();
 * await modal.filterByTag('basement');
 * await expect(modal.nameCell).toHaveText('Location');
 */
export function tagsModal(page: Page): TagsModal {
  const root = page.locator('[role="dialog"]');
  const filterInput = page.getByPlaceholder('Filter tags');
  const nameCell = root
    .locator('td[data-label="Name"]')
    .or(root.locator('td').nth(0));
  const valueCell = root
    .locator('td[data-label="Value"]')
    .or(root.locator('td').nth(1));
  const tagSourceCell = root
    .locator('td[data-label="Tag source"]')
    .or(root.locator('td').nth(2));

  return {
    root,
    filterInput,
    nameCell,
    valueCell,
    tagSourceCell,

    heading(title) {
      return root.getByRole('heading', { name: title });
    },

    async filterByTag(value) {
      await filterInput.fill(value);
    },
  };
}
