const { expect, test } = require("@playwright/test");
const { setupAuthenticatedApi } = require("./fixtures");

test("shows project status and opens the projects modal", async ({
  page,
}) => {
  await setupAuthenticatedApi(page);

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Recent Designs" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Design faster, without losing control.",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start with a draft" })
  ).toBeVisible();
  await page.getByRole("button", { name: "AI Draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Start with a draft" })
  ).toBeInViewport();
  await expect(page.getByText("Spring Campaign")).toBeVisible();
  await expect(page.getByText("Logo Exploration")).toBeVisible();
  await expect(page.getByText("2 projects")).toBeVisible();
  await expect(page.getByText("Free plan")).toBeVisible();

  await page
    .getByRole("main")
    .getByRole("button", { name: "Projects" })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All Designs" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open design Logo Exploration" })
  ).toBeVisible();

  const dialogBox = await page.getByRole("dialog").boundingBox();
  const firstProjectBox = await page
    .getByRole("button", { name: "Open design Logo Exploration" })
    .boundingBox();

  expect(dialogBox).toBeTruthy();
  expect(firstProjectBox).toBeTruthy();
  expect(firstProjectBox.x).toBeGreaterThan(dialogBox.x + 24);
});

test("creates a design from the dashboard using the expected canvas defaults", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    createDesignId: "new-youtube-thumbnail",
  });

  await page.goto("/");
  await expect(page.getByText("Spring Campaign")).toBeVisible();
  await page.getByRole("button", { name: "Start Designing" }).click();

  await expect(page).toHaveURL(/\/editor\/new-youtube-thumbnail$/);
  expect(api.posts[0]).toMatchObject({
    name: "Untitled design - Youtube Thumbnail",
    canvasData: null,
    width: 825,
    height: 465,
    category: "youtube_thumbnail",
    designId: null,
  });
});

test("creates a selected design type with the correct dimensions", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    createDesignId: "new-logo-design",
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Create Logo Design" }).click();

  await expect(page).toHaveURL(/\/editor\/new-logo-design\?panel=elements$/);
  await expect(page.locator(".panel-title", { hasText: "Elements" })).toBeVisible();
  expect(api.posts[0]).toMatchObject({
    name: "Logo Design",
    canvasData: null,
    width: 400,
    height: 465,
    category: "Logo Design",
    designId: null,
  });
});

test("blocks free users from creating more than five designs", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    designs: Array.from({ length: 5 }, (_, index) => ({
      _id: `design-${index}`,
      name: `Existing Design ${index + 1}`,
      width: 900,
      height: 500,
      canvasData: null,
    })),
    subscription: { isPremium: false },
  });

  await page.goto("/");
  await expect(page.getByText("Existing Design 1")).toBeVisible();
  await page.getByRole("button", { name: "Start Designing" }).click();

  await expect(page.getByText("Please upgrade to premium!")).toBeVisible();
  await expect(page).toHaveURL("/");
  expect(api.posts).toEqual([]);
});

test("creates an upload workspace and opens the uploads panel", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    createDesignId: "upload-workspace",
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Create Upload" }).click();

  await expect(page).toHaveURL(/\/editor\/upload-workspace\?panel=uploads$/);
  await expect(page.locator(".panel-title", { hasText: "Uploads" })).toBeVisible();
  expect(api.posts[0]).toMatchObject({
    name: "Untitled upload design",
    canvasData: null,
    width: 825,
    height: 465,
    category: "Upload",
    designId: null,
  });
});

test("deletes a project from the projects modal and refreshes the list", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page);

  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Projects" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Spring Campaign")).toBeVisible();

  await dialog
    .getByRole("button", { name: "Delete design Spring Campaign" })
    .click();

  await expect.poll(() => api.deletes).toEqual(["design-1"]);
  await expect(dialog.getByText("Spring Campaign")).toBeHidden();
  await expect(dialog.getByText("Logo Exploration")).toBeVisible();
});
