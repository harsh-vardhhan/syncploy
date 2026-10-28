export interface TranslatorContext {
  resources: Record<string, any>;
  params: Record<string, string>;
  templateParams: Record<string, any>;
  bucketLogicalIdToVar?: Record<string, string>;
}

export interface TranslationResult {
  code: string;
  adopted: string[];
}
