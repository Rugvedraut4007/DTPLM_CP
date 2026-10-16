import { useCallback, useEffect, useRef, useState } from "react";

/* Loads data for a view and re-runs on demand (reload()), which is what the
   vanilla client did by re-rendering the whole route after a mutation. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async () => {
    const id = ++seq.current;
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await loaderRef.current();
      if (id === seq.current) setState({ status: "ready", data, error: null });
    } catch (e) {
      if (id === seq.current) setState({ status: "error", data: null, error: e });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, loading: state.status === "loading", reload: load };
}

export default useAsync;
