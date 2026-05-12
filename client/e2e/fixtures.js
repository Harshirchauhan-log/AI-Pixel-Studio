const API_ORIGIN = "http://localhost:5000";

const testUser = {
  name: "E2E Tester",
  email: "tester@example.com",
  image: "",
};

const designs = [
  {
    _id: "design-1",
    name: "Spring Campaign",
    width: 900,
    height: 500,
    category: "YouTube Thumbnail",
    canvasData: null,
  },
  {
    _id: "design-2",
    name: "Logo Exploration",
    width: 400,
    height: 465,
    category: "Logo Design",
    canvasData: null,
  },
];

const transparentPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const redSvgDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%23e53935'/%3E%3C/svg%3E";

async function authenticate(page) {
  await page.context().addCookies([
    {
      name: "e2e-auth",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function mockSession(page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: testUser,
        expires: "2099-01-01T00:00:00.000Z",
        idToken: "e2e-id-token",
      }),
    });
  });
}

function jsonResponse(data, status = 200) {
  return {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
    },
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

async function mockApi(page, overrides = {}) {
  const state = {
    designs: [...(overrides.designs || designs)],
    createDesignId: overrides.createDesignId || "created-design",
    subscription: overrides.subscription || { isPremium: false },
    uploads: [...(overrides.uploads || [])],
    aiImageUrl: overrides.aiImageUrl || transparentPngDataUrl,
    approvalLink:
      overrides.approvalLink ||
      "http://127.0.0.1:3100/subscription/success?token=e2e-order",
    posts: [],
    deletes: [],
    aiGenerations: [],
    uploadsPosted: [],
    paypalOrders: [],
  };

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill(jsonResponse({}, 204));
      return;
    }

    if (path === "/v1/subscription" && method === "GET") {
      await route.fulfill(
        jsonResponse({ success: true, data: state.subscription })
      );
      return;
    }

    if (path === "/v1/subscription/create-order" && method === "POST") {
      state.paypalOrders.push({ createdAt: Date.now() });
      await route.fulfill(
        jsonResponse({
          success: true,
          data: { approvalLink: state.approvalLink },
        })
      );
      return;
    }

    if (path === "/v1/designs" && method === "GET") {
      await route.fulfill(jsonResponse({ success: true, data: state.designs }));
      return;
    }

    if (path === "/v1/designs" && method === "POST") {
      const body = request.postDataJSON();
      state.posts.push(body);
      const createdDesign = {
        _id: body.designId || state.createDesignId,
        name: body.name,
        width: body.width,
        height: body.height,
        category: body.category,
        canvasData: body.canvasData || null,
      };

      state.designs = [
        createdDesign,
        ...state.designs.filter((design) => design._id !== createdDesign._id),
      ];

      await route.fulfill(
        jsonResponse({
          success: true,
          data: createdDesign,
        })
      );
      return;
    }

    if (path.startsWith("/v1/designs/") && method === "GET") {
      const id = path.split("/").pop();
      const design =
        state.designs.find((item) => item._id === id) ||
        overrides.designById?.[id] || {
          _id: id,
          name: "Loaded Design",
          width: 900,
          height: 500,
          canvasData: null,
        };

      await route.fulfill(jsonResponse({ success: true, data: design }));
      return;
    }

    if (path.startsWith("/v1/designs/") && method === "DELETE") {
      const id = path.split("/").pop();
      state.deletes.push(id);
      state.designs = state.designs.filter((design) => design._id !== id);
      await route.fulfill(jsonResponse({ success: true }));
      return;
    }

    if (path === "/v1/media/get" && method === "GET") {
      await route.fulfill(jsonResponse({ success: true, data: state.uploads }));
      return;
    }

    if (path === "/v1/media/upload" && method === "POST") {
      const upload = {
        _id: `uploaded-${state.uploadsPosted.length + 1}`,
        name: "uploaded-file.png",
        url: state.aiImageUrl,
      };

      state.uploadsPosted.push({ createdAt: Date.now() });
      state.uploads.unshift(upload);
      await route.fulfill(jsonResponse({ success: true, data: upload }));
      return;
    }

    if (path === "/v1/media/ai-image-generate" && method === "POST") {
      const body = request.postDataJSON();
      state.aiGenerations.push(body);
      await route.fulfill(
        jsonResponse({ success: true, data: { url: state.aiImageUrl } })
      );
      return;
    }

    await route.fulfill(
      jsonResponse(
        { success: false, message: `Unhandled ${method} ${path}` },
        500
      )
    );
  });

  return state;
}

async function setupAuthenticatedApi(page, overrides) {
  await authenticate(page);
  await mockSession(page);
  return mockApi(page, overrides);
}

module.exports = {
  designs,
  redSvgDataUrl,
  transparentPngDataUrl,
  setupAuthenticatedApi,
};
