import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isNaverMapConfigured, geocodeAddress, fetchStaticMapImage } from "@/lib/naverMap";

const ORIGINAL_ENV = { ...process.env };

function setCredentials(id?: string, secret?: string) {
  if (id === undefined) delete process.env.NCP_MAP_CLIENT_ID;
  else process.env.NCP_MAP_CLIENT_ID = id;
  if (secret === undefined) delete process.env.NCP_MAP_CLIENT_SECRET;
  else process.env.NCP_MAP_CLIENT_SECRET = secret;
}

describe("naverMap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("isNaverMapConfigured", () => {
    it("is false when neither env var is set", () => {
      setCredentials(undefined, undefined);
      expect(isNaverMapConfigured()).toBe(false);
    });

    it("is false when only one of the pair is set", () => {
      setCredentials("id-only", undefined);
      expect(isNaverMapConfigured()).toBe(false);
    });

    it("is true when both are set", () => {
      setCredentials("id", "secret");
      expect(isNaverMapConfigured()).toBe(true);
    });
  });

  describe("geocodeAddress", () => {
    it("returns null without calling fetch when not configured", async () => {
      setCredentials(undefined, undefined);
      const fetchSpy = vi.spyOn(global, "fetch");
      const result = await geocodeAddress("서울특별시 강남구 테헤란로 123");
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns null for a blank address without calling fetch", async () => {
      setCredentials("id", "secret");
      const fetchSpy = vi.spyOn(global, "fetch");
      const result = await geocodeAddress("   ");
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("sends the API key headers and parses coordinates from a successful response", async () => {
      setCredentials("test-id", "test-secret");
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "OK",
          addresses: [{ x: "127.0276", y: "37.4979" }],
        }),
      } as Response);

      const result = await geocodeAddress("서울특별시 강남구 테헤란로 123");

      expect(result).toEqual({ lat: 37.4979, lng: 127.0276 });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain("map-geocode/v2/geocode");
      expect((init?.headers as Record<string, string>)["x-ncp-apigw-api-key-id"]).toBe("test-id");
      expect((init?.headers as Record<string, string>)["x-ncp-apigw-api-key"]).toBe("test-secret");
    });

    it("returns null (never throws) when the API responds with a non-OK status", async () => {
      setCredentials("id", "secret");
      vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 401 } as Response);
      const result = await geocodeAddress("아무 주소");
      expect(result).toBeNull();
    });

    it("returns null when the address has no matching result", async () => {
      setCredentials("id", "secret");
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ status: "OK", addresses: [] }),
      } as Response);
      const result = await geocodeAddress("존재하지 않는 주소");
      expect(result).toBeNull();
    });

    it("returns null (never throws) when fetch itself rejects (network error, timeout, etc.)", async () => {
      setCredentials("id", "secret");
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
      const result = await geocodeAddress("서울특별시 강남구");
      expect(result).toBeNull();
    });
  });

  describe("fetchStaticMapImage", () => {
    it("returns null without calling fetch when not configured", async () => {
      setCredentials(undefined, undefined);
      const fetchSpy = vi.spyOn(global, "fetch");
      const result = await fetchStaticMapImage({ lat: 37.4979, lng: 127.0276 });
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("requests a marker centered on the given coordinates with auth headers", async () => {
      setCredentials("test-id", "test-secret");
      const fakeBody = new ReadableStream();
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        body: fakeBody,
        headers: new Headers({ "content-type": "image/png" }),
      } as Response);

      const result = await fetchStaticMapImage({ lat: 37.4979, lng: 127.0276 });

      expect(result).toEqual({ body: fakeBody, contentType: "image/png" });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain("map-static/v2/raster");
      expect(String(url)).toContain("center=127.0276%2C37.4979");
      expect((init?.headers as Record<string, string>)["x-ncp-apigw-api-key-id"]).toBe("test-id");
    });

    it("returns null (never throws) on a failed response", async () => {
      setCredentials("id", "secret");
      vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500, body: null } as Response);
      const result = await fetchStaticMapImage({ lat: 0, lng: 0 });
      expect(result).toBeNull();
    });

    it("returns null (never throws) when fetch itself rejects", async () => {
      setCredentials("id", "secret");
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
      const result = await fetchStaticMapImage({ lat: 0, lng: 0 });
      expect(result).toBeNull();
    });
  });
});
