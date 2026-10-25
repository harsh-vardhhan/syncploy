export interface ContainerOptions {
  dockerfile?: string;
  context?: string;
  imageUri?: string;
  cmd?: string[];
  entrypoint?: string[];
  workingDirectory?: string;
}
