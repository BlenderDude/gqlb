export interface FileWriter {
  write(path: string, content: string): Promise<void>;
}
