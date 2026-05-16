const { expect, test } = require("@playwright/test");
const { setupAuthenticatedApi, transparentPngDataUrl } = require("./fixtures");

test("adds an existing uploaded image to the canvas and autosaves it", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    uploads: [
      {
        _id: "media-1",
        name: "Campaign image",
        url: transparentPngDataUrl,
      },
    ],
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
  await page.getByRole("button", { name: "Uploads" }).click();
  await page
    .getByRole("button", { name: "Add Campaign image to canvas" })
    .click();

  await expect
    .poll(() =>
      api.posts.some((post) => {
        if (post.designId !== "design-1" || !post.canvasData) return false;
        const canvasData = JSON.parse(post.canvasData);
        return canvasData.objects?.some(
          (object) =>
            object.type === "Image" && object.src === transparentPngDataUrl
        );
      })
    )
    .toBe(true);
});
