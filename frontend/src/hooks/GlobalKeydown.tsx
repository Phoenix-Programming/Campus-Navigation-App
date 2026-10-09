import { useEffect, useRef } from 'react';

export function useGlobalKeydown(handler: (input: { event: KeyboardEvent; pressedKeys: string[] }) => void, options: { ignoreInputs?: boolean } = {}) {
  const { ignoreInputs = true } = options;
  const pressedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const shouldIgnore = (target: EventTarget | null): boolean => {
      if (!ignoreInputs) return false;

      const element = target as HTMLElement;
      return (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        (element as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnore(e.target)) return;

      pressedKeys.current.add(e.key);

      handler({
        event: e,
        pressedKeys: [...pressedKeys.current],
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (shouldIgnore(e.target)) return;

      pressedKeys.current.delete(e.key);

      handler({
        event: e,
        pressedKeys: Array.from(pressedKeys.current),
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