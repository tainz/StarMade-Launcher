declare global {
  interface Window {
    windowController: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

export const useWindowControls = () => {
  const minimize = () => window.windowController.minimize();
  const maximize = () => window.windowController.maximize();
  const close = () => window.windowController.close();

  return { minimize, maximize, close };
};
