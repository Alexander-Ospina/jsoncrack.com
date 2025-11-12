import { create } from "zustand";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import { setValueAtPath } from "../lib/utils/jsonHelper";

interface JsonActions {
  setJson: (json: string) => void;
  getJson: () => string;
  updateAtPath: (path: Array<string | number>, value: any) => string | undefined;
  clear: () => void;
}

const initialStates = {
  json: "{}",
  loading: true,
};

export type JsonStates = typeof initialStates;

const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,
  getJson: () => get().json,
  setJson: json => {
    set({ json, loading: false });
    useGraph.getState().setGraph(json);
  },
  updateAtPath: (path, value) => {
    try {
      const current = get().json || "{}";
      const parsed = JSON.parse(current);
      const next = setValueAtPath(parsed, path, value);
      const jsonStr = JSON.stringify(next, null, 2);
      set({ json: jsonStr, loading: false });
      useGraph.getState().setGraph(jsonStr);
      return jsonStr;
    } catch (err) {
      return get().json;
    }
  },
  clear: () => {
    set({ json: "", loading: false });
    useGraph.getState().clearGraph();
  },
}));

export default useJson;
