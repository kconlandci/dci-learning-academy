// Stubbed by scripts/rebrand.ts — web fallbacks for @capacitor/* modules.
interface ListenerHandle {
  remove: () => void;
}

type AppEvent = "pause" | "resume" | "backButton";
type AppListener = (...args: unknown[]) => void;

function addAppListener(event: AppEvent, callback: AppListener): Promise<ListenerHandle> {
  if (event === "pause") {
    const visHandler = () => {
      if (document.visibilityState === "hidden") callback();
    };
    const unloadHandler = () => callback();
    document.addEventListener("visibilitychange", visHandler);
    window.addEventListener("beforeunload", unloadHandler);
    return Promise.resolve({
      remove: () => {
        document.removeEventListener("visibilitychange", visHandler);
        window.removeEventListener("beforeunload", unloadHandler);
      },
    });
  }
  if (event === "resume") {
    const visHandler = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", visHandler);
    return Promise.resolve({
      remove: () => document.removeEventListener("visibilitychange", visHandler),
    });
  }
  return Promise.resolve({ remove: () => {} });
}

export const App = {
  addListener: addAppListener,
  exitApp: () => {},
};

export const Preferences = {
  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: typeof localStorage !== "undefined" ? localStorage.getItem(key) : null };
  },
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  async remove({ key }: { key: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

interface ConfirmOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}

export const Dialog = {
  async confirm({ message }: ConfirmOptions): Promise<{ value: boolean }> {
    const value = typeof window !== "undefined" ? window.confirm(message) : false;
    return { value };
  },
  async alert({ message }: { title?: string; message: string }): Promise<void> {
    if (typeof window !== "undefined") window.alert(message);
  },
};

export const Browser = {
  async open({ url }: { url: string }): Promise<void> {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  },
  async close(): Promise<void> {},
};
