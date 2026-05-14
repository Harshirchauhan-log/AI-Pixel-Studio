const { expect, test } = require("@playwright/test");
const { setupAuthenticatedApi } = require("./fixtures");

test("exposes accessible editor header button names", async ({ page }) => {
  await setupAuthenticatedApi(page, {
    designs: [
      {
        _id: "design-1",
        name: "Spring Campaign",
        width: 900,
        height: 500,
        canvasData: null,
      },
    ],
  });

  await page.goto("/editor/design-1");

  await expect(
    page.getByRole("button", {
      name: "Current mode: Editing. Change editor mode",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save status: Saved" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export design" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open premium upgrade" })
  ).toBeVisible();
});

test("adds text to the editor canvas and persists the serialized canvas", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    designs: [
      {
        _id: "design-1",
        name: "Spring Campaign",
        width: 900,
        height: 500,
        canvasData: null,
      },
    ],
  });

  await page.goto("/editor/design-1");

  await expect(page.getByLabel("Design name")).toHaveValue("Spring Campaign");
  await page.getByRole("button", { name: "Text" }).click();
  await page.getByRole("button", { name: "Add a text box" }).click();

  await expect
    .poll(() =>
      api.posts.some((post) => {
        if (post.designId !== "design-1" || !post.canvasData) return false;
        const canvasData = JSON.parse(post.canvasData);
        return canvasData.objects?.some(
          (object) => object.text === "Enter text here"
        );
      })
    )
    .toBe(true);
});

test("renames the design and autosaves the updated title", async ({ page }) => {
  const api = await setupAuthenticatedApi(page, {
    designs: [
      {
        _id: "design-1",
        name: "Spring Campaign",
        width: 900,
        height: 500,
        canvasData: JSON.stringify({
          version: "6.6.2",
          objects: [],
          background: "#ffffff",
        }),
      },
    ],
  });

  await page.goto("/editor/design-1");
  await expect(page.getByLabel("Design name")).toHaveValue("Spring Campaign");
  await page.getByLabel("Design name").fill("Summer Launch");

  await expect
    .poll(() =>
      api.posts.some(
        (post) => post.designId === "design-1" && post.name === "Summer Launch"
      )
    )
    .toBe(true);
});

test("provides scrollable workspace for large canvases", async ({ page }) => {
  await setupAuthenticatedApi(page, {
    designs: [
      {
        _id: "large-design",
        name: "Large Poster",
        width: 1800,
        height: 1400,
        canvasData: null,
      },
    ],
  });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/editor/large-design");

  const workspace = page.getByLabel("Canvas workspace");
  await expect(workspace).toBeVisible();

  await expect
    .poll(async () =>
      workspace.evaluate((element) => ({
        canScrollHorizontally: element.scrollWidth > element.clientWidth,
        canScrollVertically: element.scrollHeight > element.clientHeight,
      }))
    )
    .toEqual({
      canScrollHorizontally: true,
      canScrollVertically: true,
    });

  await page.getByRole("button", { name: "Text" }).click();
  await page.getByRole("button", { name: "Add a text box" }).click();

  const propertiesPanel = page.getByLabel("Object properties");
  await expect(propertiesPanel).toBeVisible();

  await expect
    .poll(async () => {
      const workspaceBox = await workspace.boundingBox();
      const panelBox = await propertiesPanel.boundingBox();
      const scrollState = await workspace.evaluate((element) => ({
        canScrollHorizontally: element.scrollWidth > element.clientWidth,
        canScrollVertically: element.scrollHeight > element.clientHeight,
      }));

      return {
        panelIsBesideWorkspace:
          Boolean(workspaceBox && panelBox) &&
          Math.round(workspaceBox.x + workspaceBox.width) <=
            Math.round(panelBox.x),
        ...scrollState,
      };
    })
    .toEqual({
      panelIsBesideWorkspace: true,
      canScrollHorizontally: true,
      canScrollVertically: true,
    });

  await page.getByRole("button", { name: "Close properties panel" }).click();
  await expect(propertiesPanel).toBeHidden();
});

test("switches to viewing mode and hides editing tools", async ({ page }) => {
  await setupAuthenticatedApi(page, {
    designs: [
      {
        _id: "design-1",
        name: "Spring Campaign",
        width: 900,
        height: 500,
        canvasData: null,
      },
    ],
  });

  await page.goto("/editor/design-1");
  await expect(page.getByRole("button", { name: "Text" })).toBeVisible();

  await page.getByRole("button", { name: /Editing/ }).click();
  await page.getByRole("menuitem", { name: "Viewing" }).click();

  await expect(page.getByRole("button", { name: /Viewing/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Text" })).toBeHidden();
});

test("persists background color changes from the settings panel", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    designs: [
      {
        _id: "design-1",
        name: "Spring Campaign",
        width: 900,
        height: 500,
        canvasData: null,
      },
    ],
  });

  await page.goto("/editor/design-1");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Background color hex value").fill("#E53935");
  await page.getByRole("button", { name: "Apply Changes" }).click();

  await expect
    .poll(() =>
      api.posts.some((post) => {
        if (post.designId !== "design-1" || !post.canvasData) return false;
        const canvasData = JSON.parse(post.canvasData);
        return canvasData.background === "#E53935";
      })
    )
    .toBe(true);
});
