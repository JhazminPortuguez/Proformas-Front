import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/lib/csp";

function directivas(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((parte) => {
      const [nombre, ...valores] = parte.trim().split(/\s+/);
      return [nombre, valores];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  it("incluye las directivas mínimas", () => {
    const d = directivas(contentSecurityPolicy(false));

    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
  });

  it("en producción no permite eval", () => {
    const csp = contentSecurityPolicy(false);

    expect(csp).not.toContain("unsafe-eval");
    expect(directivas(csp).get("script-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
    ]);
  });

  it("en desarrollo agrega unsafe-eval solo a script-src", () => {
    const d = directivas(contentSecurityPolicy(true));

    expect(d.get("script-src")).toContain("'unsafe-eval'");
    expect(d.get("style-src")).not.toContain("'unsafe-eval'");
  });

  it("no permite orígenes externos ni comodines", () => {
    for (const isDev of [false, true]) {
      const csp = contentSecurityPolicy(isDev);

      expect(csp).not.toMatch(/https?:|\*/);
    }
  });
});
