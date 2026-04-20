import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom polyfills used by the Fan PWA components
class MockSpeechSynthesisUtterance {
  text: string;
  lang = "en-IN";
  rate = 1;
  pitch = 1;
  constructor(text: string) {
    this.text = text;
  }
}

Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  writable: true,
  value: MockSpeechSynthesisUtterance,
});

Object.defineProperty(globalThis, "speechSynthesis", {
  writable: true,
  value: {
    speak: () => undefined,
    cancel: () => undefined,
    getVoices: () => [],
  },
});

// Fetch is used by SWR inside some screens; give it a noop default.
if (!globalThis.fetch) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
}
