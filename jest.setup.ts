import "@testing-library/jest-dom";

if (!globalThis.fetch) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({}),
    } as Response)
  ) as unknown as typeof fetch;
}
