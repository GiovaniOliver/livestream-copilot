// Podcast Console Types

export interface Chapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  color?: string;
}

export interface Quote {
  id: string;
  text: string;
  timestamp: number; // in seconds
  speaker: string;
  isFavorite: boolean;
}

export interface PromoDraft {
  id: string;
  type: "title" | "description" | "social" | "newsletter";
  content: string;
  variant: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  category: "content" | "review" | "publish";
}

export interface PodcastEpisode {
  id: string;
  title: string;
  duration: number; // total duration in seconds
  chapters: Chapter[];
  quotes: Quote[];
  promoDrafts: PromoDraft[];
  checklist: ChecklistItem[];
}
