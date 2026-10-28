import * as fs from "node:fs";
import YAML from "yaml";

const CF_SCALAR_TAGS = [
  "Ref",
  "Sub",
  "GetAtt",
  "Base64",
  "GetAZs",
  "ImportValue",
].map((name) => ({
  tag: "!" + name,
  resolve: (value: any) =>
    name === "Ref" ? { Ref: value } : { ["Fn::" + name]: value },
}));

const CF_SEQ_TAGS = [
  "Equals",
  "If",
  "Join",
  "Select",
  "Split",
  "FindInMap",
  "And",
  "Or",
  "Not",
].map((name) => ({
  tag: "!" + name,
  collection: "seq" as const,
  resolve: (value: any) => ({
    ["Fn::" + name]: value && typeof value.toJSON === "function" ? value.toJSON() : value,
  }),
}));

export function loadTemplate(filePath: string): any {
  const content = fs.readFileSync(filePath, "utf-8");
  if (filePath.endsWith(".json")) {
    return JSON.parse(content);
  }
  return YAML.parse(content, { customTags: [...CF_SCALAR_TAGS, ...CF_SEQ_TAGS] });
}
