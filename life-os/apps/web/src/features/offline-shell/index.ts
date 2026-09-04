export {
  STATIC_CACHE_PREFIX,
  clearShellCaches,
  registerServiceWorker,
  unregisterServiceWorker,
  type RegisterServiceWorkerOptions,
} from "./model/serviceWorkerRegistration";

export {
  useServiceWorkerUpdate,
  type UseServiceWorkerUpdateOptions,
  type UseServiceWorkerUpdateResult,
} from "./hooks/useServiceWorkerUpdate";

export { UpdatePromptToast, type UpdatePromptToastProps } from "./components/UpdatePromptToast";
