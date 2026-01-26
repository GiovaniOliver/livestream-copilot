import type { Chapter, Quote, PromoDraft, ChecklistItem, PodcastEpisode } from "./types";

export const mockChapters: Chapter[] = [
  {
    id: "ch-1",
    title: "Introduction",
    startTime: 0,
    endTime: 180,
    color: "#00D4C7",
  },
  {
    id: "ch-2",
    title: "The Problem with Traditional Workflows",
    startTime: 180,
    endTime: 540,
    color: "#8B5CF6",
  },
  {
    id: "ch-3",
    title: "AI-Powered Solutions",
    startTime: 540,
    endTime: 1020,
    color: "#00D4C7",
  },
  {
    id: "ch-4",
    title: "Case Study: FluxBoard in Action",
    startTime: 1020,
    endTime: 1560,
    color: "#8B5CF6",
  },
  {
    id: "ch-5",
    title: "Q&A with Listeners",
    startTime: 1560,
    endTime: 2100,
    color: "#00D4C7",
  },
  {
    id: "ch-6",
    title: "Closing Thoughts",
    startTime: 2100,
    endTime: 2340,
    color: "#8B5CF6",
  },
];

export const mockQuotes: Quote[] = [
  {
    id: "q-1",
    text: "The future of content creation isn't about working harder, it's about working smarter with AI as your co-pilot.",
    timestamp: 245,
    speaker: "Sarah Chen",
    isFavorite: true,
  },
  {
    id: "q-2",
    text: "We've seen a 70% reduction in post-production time since implementing FluxBoard into our workflow.",
    timestamp: 612,
    speaker: "Marcus Johnson",
    isFavorite: false,
  },
  {
    id: "q-3",
    text: "The key insight is that AI doesn't replace creativity, it amplifies it by handling the repetitive tasks.",
    timestamp: 823,
    speaker: "Sarah Chen",
    isFavorite: true,
  },
  {
    id: "q-4",
    text: "Every livestreamer I know spends more time on clips and highlights than on creating new content.",
    timestamp: 1145,
    speaker: "Marcus Johnson",
    isFavorite: false,
  },
  {
    id: "q-5",
    text: "What surprised me most was how accurate the chapter detection became after just a few episodes.",
    timestamp: 1402,
    speaker: "Guest: Alex Rivera",
    isFavorite: true,
  },
  {
    id: "q-6",
    text: "The real game-changer is being able to repurpose a single piece of content across ten different platforms.",
    timestamp: 1876,
    speaker: "Sarah Chen",
    isFavorite: false,
  },
];

export const mockPromoDrafts: PromoDraft[] = [
  {
    id: "pd-1",
    type: "title",
    content: "AI Revolution: How FluxBoard is Changing Content Creation",
    variant: 1,
  },
  {
    id: "pd-2",
    type: "title",
    content: "From 10 Hours to 2: The FluxBoard Content Workflow",
    variant: 2,
  },
  {
    id: "pd-3",
    type: "title",
    content: "Inside the Future of Livestream Post-Production",
    variant: 3,
  },
  {
    id: "pd-4",
    type: "description",
    content:
      "In this episode, we dive deep into the world of AI-powered content workflows. Join Sarah Chen and Marcus Johnson as they explore how FluxBoard is revolutionizing the way creators handle post-production, from automatic chapter detection to intelligent quote extraction.",
    variant: 1,
  },
  {
    id: "pd-5",
    type: "description",
    content:
      "Tired of spending hours editing after every stream? This episode breaks down the tools and techniques that are helping creators cut their post-production time by 70%. Featuring insights from industry experts and real case studies.",
    variant: 2,
  },
  {
    id: "pd-6",
    type: "social",
    content:
      "New episode alert! We're breaking down how AI is transforming content creation. From 10 hours to 2 - the numbers don't lie. Link in bio.",
    variant: 1,
  },
  {
    id: "pd-7",
    type: "social",
    content:
      "\"The future of content creation isn't about working harder, it's about working smarter.\" - @sarahchen\n\nListen to our latest episode to learn how.",
    variant: 2,
  },
  {
    id: "pd-8",
    type: "newsletter",
    content:
      "This week's episode is a must-listen for any content creator looking to optimize their workflow. We sat down with Marcus Johnson to discuss the tools that are saving creators hundreds of hours per month. Plus, an exclusive case study featuring real results from FluxBoard users.",
    variant: 1,
  },
];

export const mockChecklist: ChecklistItem[] = [
  {
    id: "cl-1",
    label: "Chapters reviewed and timestamped",
    isCompleted: true,
    category: "content",
  },
  {
    id: "cl-2",
    label: "Key quotes selected for promotion",
    isCompleted: true,
    category: "content",
  },
  {
    id: "cl-3",
    label: "Episode title finalized",
    isCompleted: false,
    category: "review",
  },
  {
    id: "cl-4",
    label: "Episode description written",
    isCompleted: false,
    category: "review",
  },
  {
    id: "cl-5",
    label: "Social media posts approved",
    isCompleted: false,
    category: "review",
  },
  {
    id: "cl-6",
    label: "Thumbnail selected and uploaded",
    isCompleted: false,
    category: "publish",
  },
];

export const mockEpisode: PodcastEpisode = {
  id: "ep-001",
  title: "AI Revolution: How FluxBoard is Changing Content Creation",
  duration: 2340, // 39 minutes
  chapters: mockChapters,
  quotes: mockQuotes,
  promoDrafts: mockPromoDrafts,
  checklist: mockChecklist,
};
