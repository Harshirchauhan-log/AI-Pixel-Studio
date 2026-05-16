const { expect, test } = require("@playwright/test");
const { setupAuthenticatedApi } = require("./fixtures");

test("starts the PayPal upgrade handoff from the premium modal", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    approvalLink: "http://127.0.0.1:3100/subscription/success?token=e2e-order",
  });

  await page.goto("/");
  await expect(page.getByText("Spring Campaign")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Open billing" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Upgrade AI Pixel Studio." })
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Upgrade" }).click();

  await expect.poll(() => api.paypalOrders.length).toBe(1);
  await expect(page).toHaveURL(/\/subscription\/success\?token=e2e-order$/);
});
