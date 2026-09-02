import { test, expect, type Page } from "@playwright/test";

const SIDEBAR = "aside.sidebar";

/**
 * Navigate into a stage group and click one of its child nav buttons.
 * Stage groups are `<details>/<summary>` elements whose open state is
 * React-controlled, so we click the summary and fall back to forcing it open.
 */
async function openNav(page: Page, groupLabel: string, childLabel: string) {
  const group = page.locator(`${SIDEBAR} details.stage-nav`).filter({ hasText: groupLabel });
  const isOpen = () => group.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!(await isOpen())) {
    await group.locator("summary").click();
  }
  if (!(await isOpen())) {
    await group.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
  }
  await group.getByRole("button", { name: childLabel }).click();
}

function rowByName(page: Page, name: string) {
  return page.locator(".table-row").filter({ hasText: name }).first();
}

test("retraction to hired happy path", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("MaidMatch ERP Prototype");

  // Reception: dispatch a seed maid into the retraction queue.
  await page.locator(SIDEBAR).getByRole("button", { name: "Reception" }).click();
  await page.getByLabel("Search reception maids").fill("Maria");
  await page.getByRole("button", { name: "Send to Retraction Team" }).click();

  // Retraction: the queue is locked to its top row, so capture that maid's
  // name and carry it through every downstream stage.
  await openNav(page, "Retraction", "Pending Retraction");
  const firstRow = page.locator(".retraction-queue-table .table-row").nth(1);
  const maidName = (await firstRow.locator(".person-cell strong").innerText()).trim();

  await firstRow.getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Retract to MaidMatch" }).click();
  await page.locator(".check-row").first().click();
  await page.locator(".modal-card").getByRole("button", { name: "Confirm" }).click();

  // Shooting
  await openNav(page, "Media & Production", "Pending Shooting");
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Done shooting" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm" }).click();

  // Editing
  await openNav(page, "Media & Production", "Pending Editing");
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Editing done" }).click();
  await page.getByLabel(/final photo/i).fill("https://example.com/final.jpg");
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm" }).click();

  // Publishing: staggered auto-publish moves her to Available & Published.
  await openNav(page, "Publishing", "Available & Published");
  const published = page.locator(".publishing-queue-table");
  await expect(published.getByText(maidName, { exact: true })).toBeVisible({ timeout: 20000 });

  // Under trial
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Under trial" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm" }).click();

  // Trial -> Hired
  await openNav(page, "Publishing", "Under Trial");
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Hired" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm" }).click();

  // Hired archive
  await openNav(page, "Publishing", "Hired");
  await expect(page.getByText(maidName, { exact: true })).toBeVisible();
});
