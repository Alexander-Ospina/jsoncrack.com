import React, { useEffect, useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, TextInput } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";
import { parseInputToType, formatValueForInput } from "../../../lib/utils/jsonHelper";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rows = nodeData?.text ?? [];
    const map: Record<string, string> = {};
    // populate edit map for all primitive fields
    rows?.forEach(r => {
      if (r.type !== "array" && r.type !== "object") {
        const key = r.key ?? "__value";
        map[String(key)] = formatValueForInput(r.value);
      }
    });
    setEditValues(map);
    setError(null);
    setIsEditing(false);
  }, [nodeData]);

  const primitiveRows = (nodeData?.text ?? []).filter(r => r.type !== "array" && r.type !== "object");
  const canEdit = primitiveRows.length > 0;

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
            <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs" align="center">
              {isEditing ? (
                <>
                  <Button size="xs" color="green" onClick={async () => {
                    try {
                      setError(null);
                      if (!nodeData?.path) throw new Error("No node path");

                      // parse current full JSON and get target
                      const currentJsonStr = useJson.getState().json || "{}";
                      const parsedRoot = JSON.parse(currentJsonStr);
                      const path = nodeData.path ?? [];

                      // navigate to current target value
                      let targetParent: any = parsedRoot;
                      for (let i = 0; i < path.length; i++) {
                        const seg = path[i] as any;
                        if (targetParent == null) break;
                        targetParent = targetParent[seg];
                      }

                      // if targetParent is primitive (no key), replace it
                      if ((primitiveRows.length === 1) && (nodeData?.text?.[0]?.key == null)) {
                        const originalValue = nodeData.text[0].value;
                        const parsedValue = parseInputToType(editValues["__value"], originalValue);
                        const newJson = useJson.getState().updateAtPath(nodeData.path, parsedValue);
                        useFile.setState({ contents: newJson, hasChanges: true });
                        setIsEditing(false);
                        onClose?.();
                        return;
                      }

                      // else target is object-like: merge primitive edits into it
                      const updatedTarget = Array.isArray(targetParent) ? targetParent.slice() : { ...(targetParent ?? {}) };
                      primitiveRows.forEach(row => {
                        const key = row.key ?? "__value";
                        const raw = editValues[String(key)];
                        if (raw === undefined) return;
                        const parsed = parseInputToType(raw, row.value);
                        if (row.key) {
                          updatedTarget[row.key] = parsed;
                        }
                      });

                      const newJson = useJson.getState().updateAtPath(nodeData.path, updatedTarget);
                      // update left editor contents immediately
                      useFile.setState({ contents: newJson, hasChanges: true });
                      setIsEditing(false);
                      onClose?.();
                    } catch (err: any) {
                      setError(err?.message || "Invalid value");
                    }
                  }}>
                    Save
                  </Button>
                  <Button size="xs" color="gray" variant="outline" onClick={() => {
                    // reset edits from nodeData
                    const map: Record<string, string> = {};
                    nodeData?.text?.forEach(r => {
                      if (r.type !== "array" && r.type !== "object") {
                        map[String(r.key ?? "__value")] = formatValueForInput(r.value);
                      }
                    });
                    setEditValues(map);
                    setError(null);
                    setIsEditing(false);
                  }}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {canEdit && <Button size="xs" onClick={() => setIsEditing(true)}>Edit</Button>}
                  <CloseButton onClick={onClose} />
                </>
              )}
            </Flex>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing && canEdit ? (
              <div>
                <Stack gap="xs">
                  {primitiveRows.map((r, idx) => {
                    const key = r.key ?? "__value";
                    const label = r.key ?? "value";
                    return (
                      <div key={String(key) + idx}>
                        <Text fz="xs" fw={500} mb="xs">{label}</Text>
                        <TextInput value={editValues[String(key)] ?? ""} onChange={(e) => setEditValues(prev => ({ ...prev, [String(key)]: e.currentTarget.value }))} />
                      </div>
                    );
                  })}
                </Stack>
                {error && <Text color="red" fz="xs">{error}</Text>}
              </div>
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
