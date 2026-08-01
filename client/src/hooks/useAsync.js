import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks its state.
 *
 * `deps` behaves like a useEffect dependency list. `reload()` re-runs it after a
 * mutation. A generation counter discards responses from a superseded request,
 * so switching projects quickly cannot leave the previous project's data on screen.
 */
export const useAsync = (loader, deps = [], { immediate = true } = {}) => {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const generation = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    const current = generation.current + 1;
    generation.current = current;

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const result = await loader(...args);
      if (!mounted.current || generation.current !== current) return undefined;
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      if (!mounted.current || generation.current !== current) return undefined;
      setState({ data: null, loading: false, error });
      return undefined;
    }
    // The caller controls re-running through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
};

/**
 * Tracks a one-off action (submit, approve, advance) so a button can show a
 * spinner and the page can surface the server's refusal message.
 */
export const useAction = (action, { onSuccess, onError } = {}) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setPending(true);
      setError(null);
      try {
        const result = await action(...args);
        onSuccess?.(result);
        return result;
      } catch (caught) {
        setError(caught);
        onError?.(caught);
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [action, onSuccess, onError]
  );

  return { execute, pending, error, clearError: () => setError(null) };
};

export default useAsync;
