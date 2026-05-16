const { expect, test } = require("@playwright/test");
const { redSvgDataUrl, setupAuthenticatedApi } = require("./fixtures");

async function expectGeneratedImageOnCanvas(page) {
  const lowerCanvas = page.locator(".lower-canvas").first();
  await expect(lowerCanvas).toBeVisible();

  await expect
    .poll(async () =>
      lowerCanvas.evaluate((canvas) => {
        const context = canvas.getContext("2d");
        const { data } = context.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1
        );

        return {
          red: data[0],
          green: data[1],
          blue: data[2],
          alpha: data[3],
        };
      })
    )
    .toMatchObject({
      red: 229,
      green: 57,
      blue: 53,
      alpha: 255,
    });
}

test("generates a thumbnail from a title and creates an editable design", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    aiImageUrl: redSvgDataUrl,
    createDesignId: "ai-thumbnail-design",
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Generate from title" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Generate thumbnail from video title",
  });

  await dialog
    .getByRole("textbox", { name: "Video title" })
    .fill("Building a SaaS in 7 Days");
  await dialog.getByRole("button", { name: "Generate" }).click();

  await expect(page).toHaveURL(/\/editor\/ai-thumbnail-design$/);
  await expectGeneratedImageOnCanvas(page);
  expect(api.aiGenerations).toHaveLength(1);
  expect(api.aiGenerations[0]).toMatchObject({ aspectRatio: "16:9" });
  expect(api.aiGenerations[0].prompt).toContain("Building a SaaS in 7 Days");

  const createdDesign = api.posts.find(
    (post) => post.name === "AI Thumbnail - Building a SaaS in 7 Days"
  );
  expect(createdDesign).toMatchObject({
    width: 825,
    height: 465,
    category: "youtube_thumbnail",
  });

  const canvasData = JSON.parse(createdDesign.canvasData);
  expect(canvasData.objects[0]).toMatchObject({
    type: "Image",
    src: redSvgDataUrl,
    left: 0,
    top: 0,
    width: 8,
    height: 8,
    scaleX: 825 / 8,
    scaleY: 465 / 8,
  });
});

test("generates a custom prompt thumbnail and opens it on the canvas", async ({
  page,
}) => {
  const api = await setupAuthenticatedApi(page, {
    aiImageUrl: redSvgDataUrl,
    createDesignId: "custom-thumbnail-design",
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Custom prompt" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Generate custom thumbnail image",
  });

  await dialog
    .getByRole("textbox", { name: "Thumbnail prompt" })
    .fill("A cinematic desk setup with neon blue light and a bold laptop");
  await dialog.getByRole("button", { name: "Generate" }).click();

  await expect(page).toHaveURL(/\/editor\/custom-thumbnail-design$/);
  await expectGeneratedImageOnCanvas(page);

  expect(api.aiGenerations).toHaveLength(1);
  expect(api.aiGenerations[0]).toMatchObject({ aspectRatio: "16:9" });
  expect(api.aiGenerations[0].prompt).toContain(
    "A cinematic desk setup with neon blue light and a bold laptop"
  );

  const createdDesign = api.posts.find(
    (post) => post.name === "AI Custom Thumbnail"
  );
  expect(createdDesign).toMatchObject({
    width: 825,
    height: 465,
    category: "youtube_thumbnail",
  });
  expect(JSON.parse(createdDesign.canvasData).objects[0]).toMatchObject({
    type: "Image",
    src: redSvgDataUrl,
  });
});

test("does not run AI generation when the prompt is empty", async ({ page }) => {
  const api = await setupAuthenticatedApi(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Custom prompt" }).click();

  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Generate" })
  ).toBeDisabled();
  expect(api.aiGenerations).toEqual([]);
  expect(api.posts).toEqual([]);
});
