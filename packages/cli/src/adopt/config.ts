import * as fs from "node:fs";

export function parseSamConfig(configPath: string): { parameters: Record<string, string>; stackName?: string | undefined } {
  if (!fs.existsSync(configPath)) {
    return { parameters: {} };
  }
  const content = fs.readFileSync(configPath, "utf-8");
  const parameters: Record<string, string> = {};
  let stackName: string | undefined;

  const stackMatch = content.match(/stack_name\s*=\s*["']([^"']+)["']/);
  if (stackMatch && stackMatch[1]) {
    stackName = stackMatch[1];
  }

  // Parse string parameter_overrides = "Key1=\"Val1\" Key2=\"Val2\""
  const strMatch = content.match(/parameter_overrides\s*=\s*["'](.*)["']\s*$/m);
  if (strMatch && strMatch[1]) {
    const raw = strMatch[1];
    const regex = /([a-zA-Z0-9_]+)=(?:\\"([^\\"]*)\\"|"([^"]*)"|([^"\s]+))/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      const k = match[1];
      const val = match[2] ?? match[3] ?? match[4];
      if (k && val !== undefined) {
        parameters[k] = val;
      }
    }
  }

  // Parse array parameter_overrides = ["Key1=Val1", "Key2=Val2"]
  const arrMatch = content.match(/parameter_overrides\s*=\s*\[([\s\S]*?)\]/);
  if (arrMatch && arrMatch[1]) {
    const regex = /([a-zA-Z0-9_]+)=(?:\\"([^\\"]*)\\"|"([^"]*)"|([^",\s\]]+))/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(arrMatch[1])) !== null) {
      const k = match[1];
      const val = match[2] ?? match[3] ?? match[4];
      if (k && val !== undefined) {
        parameters[k] = val;
      }
    }
  }

  return { parameters, stackName };
}
