import path from "node:path";
import { pathToFileURL } from "node:url";

import { net, protocol } from "electron";

export const RENDERER_SCHEME = "alu";
export const PACKAGED_RENDERER_URL = `${RENDERER_SCHEME}://app/index.html`;

export function resolveRendererRequestPath(
  requestUrl: string,
  rendererRoot: string,
): string | null {
  try {
    const url = new URL(requestUrl);
    if (
      url.protocol !== `${RENDERER_SCHEME}:` ||
      url.hostname !== "app" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
    const decodedPath = decodeURIComponent(url.pathname || "/index.html");
    if (decodedPath.includes("\0")) return null;
    const candidate = path.resolve(rendererRoot, `.${decodedPath}`);
    const relative = path.relative(rendererRoot, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function registerRendererScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: RENDERER_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        codeCache: true,
      },
    },
  ]);
}

export function handleRendererScheme(rendererRoot: string): void {
  protocol.handle(RENDERER_SCHEME, (request) => {
    const filePath = resolveRendererRequestPath(request.url, rendererRoot);
    if (!filePath) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(filePath).href);
  });
}
