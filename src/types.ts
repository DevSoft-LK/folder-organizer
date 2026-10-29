export interface OrganizerConfig {
  targetDirectory: string;
  dryRun: boolean;
  minAgeMinutes?: number;
  categories?: Record<string, string[]>;
}

export interface MoveRecord {
  originalPath: string;
  newPath: string;
}