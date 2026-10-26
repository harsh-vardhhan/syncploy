export interface DocItem {
  slug: string;
  title: string;
  description: string;
  category: "Getting Started" | "Core Constructs" | "Compiler & Safety" | "CLI & Operations" | "Case Studies";
  content: string;
}

export type DocMeta = Omit<DocItem, "content">;
