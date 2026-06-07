import { useEffect, useRef } from 'react';

export function useGlobalKeydown(handler, options = {}) {
  const { ignoreInputs = true } = options;
  const pressedKeys = useRef(new Set());

  useEffect(() => {
    const shouldIgnore = (target) => {
      if (!ignoreInputs) return false;

      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e) => {
      if (shouldIgnore(e.target)) return;

      pressedKeys.current.add(e.key);

      handler({
        event: e,
        pressedKeys: [...pressedKeys.current],
      });
    };

    const handleKeyUp = (e) => {
      if (shouldIgnore(e.target)) return;

      pressedKeys.current.delete(e.key);

      handler({
        event: e,
        pressedKeys: [...pressedKeys.current],
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handler, ignoreInputs]);
}