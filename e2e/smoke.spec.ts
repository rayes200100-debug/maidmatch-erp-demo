import { test, expect, type Page } from "@playwright/test";

const SIDEBAR = "aside.sidebar";

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

/** Fill a link-mode media input by its field label. */
async function fillMedia(page: Page, label: string, value: string) {
  const field = page.locator(".workspace-task .task-input-field").filter({ hasText: label }).first();
  await field.locator(".media-field input").fill(value);
}

test("reception to hired happy path with deep links", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("MaidMatch ERP Prototype");

  // Reception: dispatch a seed maid into the retraction queue.
  await page.locator(SIDEBAR).getByRole("button", { name: "Reception" }).click();
  await page.getByLabel("Search maids").fill("Maria");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const maidName = (await rowByName(page, "Maria").locator(".person-cell strong").innerText()).trim();
  await rowByName(page, "Maria").getByRole("button", { name: "Send to Retraction" }).click();

  // Retraction: the dispatched maid lands in the queue, with a deep-linkable task URL.
  await openNav(page, "Retraction", "Pending Retraction");
  const retractionQueue = page.locator(".retraction-queue-table");
  await expect(retractionQueue.getByText(maidName, { exact: true })).toBeVisible();

  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await expect(page).toHaveURL(/#\/task\//);

  // Retract to MaidMatch: block 1 — no client; block 3 — make the profile publishable.
  await page.locator(".workspace-task").getByRole("button", { name: "Retract to MaidMatch" }).click();
  await page.locator(".workspace-task").locator(".tristate").first().getByRole("button", { name: "No" }).click();
  await page.locator(".form-field").filter({ hasText: "Live-in or live-out" }).locator("select").selectOption("Live-in");
  await page.locator(".form-field").filter({ hasText: "Expected salary — min" }).locator("input").fill("2000");
  await page.locator(".form-field").filter({ hasText: "Expected salary — max" }).locator("input").fill("2500");
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm · Retract to MaidMatch" }).click();

  // Collect Documents: upload both papers and set the unpaid-leave expiry; the task
  // completes itself and hands her to Media.
  await openNav(page, "Document Collection", "Pending Documents Collection");
  await expect(page.locator(".documents-queue-table").getByText(maidName, { exact: true })).toBeVisible();
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Upload manually" }).first().click();
  await page.locator(".workspace-task").getByRole("button", { name: "Upload manually" }).click();
  await page.getByLabel("Unpaid leave expiry date").fill("2027-10-31");

  // Videographers: shoot raw photo + video (both required).
  await openNav(page, "Media & Production", "Videographers");
  await expect(page.locator(".media-queue-table").getByText(maidName, { exact: true })).toBeVisible();
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Done shooting" }).click();
  await fillMedia(page, "Raw photo", "https://example.com/raw.jpg");
  await fillMedia(page, "Raw video", "https://example.com/raw.mp4");
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm · Done shooting" }).click();

  // Editors: deliver final photo + video.
  await openNav(page, "Media & Production", "Editors");
  await expect(page.locator(".media-queue-table").getByText(maidName, { exact: true })).toBeVisible();
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Editing done" }).click();
  await fillMedia(page, "Final photo", "https://example.com/final.jpg");
  await fillMedia(page, "Final video", "https://example.com/final.mp4");
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm · Editing done" }).click();

  // Publishing: the system job posts to all three platforms.
  await openNav(page, "Publishing", "Available Pending Publishing");
  await page.getByRole("button", { name: "Run publish job now" }).click();

  // Fully green → Available & Published.
  await openNav(page, "Publishing", "Available & Published");
  const published = page.locator(".publishing-queue-table");
  await expect(published.getByText(maidName, { exact: true })).toBeVisible({ timeout: 20000 });

  // Under trial → Hired.
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Under trial" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm · Under trial" }).click();

  await openNav(page, "Publishing", "Under Trial");
  await rowByName(page, maidName).getByRole("button", { name: "Open Task" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Hired" }).click();
  await page.locator(".workspace-task").getByRole("button", { name: "Confirm · Hired" }).click();

  await openNav(page, "Publishing", "Hired");
  await expect(page.getByText(maidName, { exact: true })).toBeVisible();
});

test("profile page deep link and tabs", async ({ page }) => {
  await page.goto("/#/maid/h014");
  await expect(page).toHaveURL(/#\/maid\/h014/);

  const tabs = ["Overview", "Details", "Documents", "Media", "History"];
  for (const tab of tabs) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible();
  }

  await page.getByRole("tab", { name: "Details" }).click();
  await expect(page.getByRole("button", { name: /Edit/ })).toBeVisible();

  await page.getByRole("tab", { name: "Media" }).click();
  await expect(page.locator(".raw-media-grid img, .raw-media-grid video").first()).toBeVisible();

  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByRole("main").getByText("Retracted to MaidMatch")).toBeVisible();
});
