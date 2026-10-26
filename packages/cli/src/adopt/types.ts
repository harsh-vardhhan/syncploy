export interface AdoptOptions {
  templatePath: string;
  config?: string | undefined;
  params?: Record<string, string> | undefined;
  out?: string | undefined;
  silent?: boolean | undefined;
}

export interface AdoptResult {
  code: string;
  adoptedResources: {
    tables: string[];
    buckets: string[];
    queues: string[];
    topics: string[];
    deliveryStreams: string[];
    alarms: string[];
    functions: string[];
    auths: string[];
  };
  unmodeledResources: string[];
}
