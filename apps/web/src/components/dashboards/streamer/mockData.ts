// ============================================================
// Mock Data for Producer Desk Development
// ============================================================

import type { Clip, Post, Moment } from "./types";

// ============================================================
// Mock Clips
// ============================================================

export const mockClips: Clip[] = [
  {
    id: "clip-1",
    title: "Epic Game Win",
    hookText: "Watch this insane clutch play that won us the match!",
    thumbnailUrl: "/api/placeholder/320/180",
    duration: 45,
    status: "ready",
    createdAt: new Date("2024-12-30T10:15:00"),
    startTime: 1234,
    endTime: 1279,
  },
  {
    id: "clip-2",
    title: "Community Q&A Highlight",
    hookText: "The best questions from tonight's Q&A session",
    thumbnailUrl: "/api/placeholder/320/180",
    duration: 120,
    status: "ready",
    createdAt: new Date("2024-12-30T10:30:00"),
    startTime: 2100,
    endTime: 2220,
  },
  {
    id: "clip-3",
    title: "Sponsor Shoutout",
    hookText: "Thanks to our amazing sponsors for supporting the stream!",
    thumbnailUrl: "/api/placeholder/320/180",
    duration: 30,
    status: "processing",
    createdAt: new Date("2024-12-30T10:45:00"),
    startTime: 3000,
    endTime: 3030,
  },
  {
    id: "clip-4",
    title: "Funny Fail Moment",
    hookText: "When everything goes wrong but you keep laughing",
    thumbnailUrl: "/api/placeholder/320/180",
    duration: 25,
    status: "ready",
    createdAt: new Date("2024-12-30T11:00:00"),
    startTime: 4500,
    endTime: 4525,
  },
  {
    id: "clip-5",
    title: "Viewer Raid Reaction",
    hookText: "The community came through with an epic raid!",
    thumbnailUrl: "/api/placeholder/320/180",
    duration: 60,
    status: "error",
    createdAt: new Date("2024-12-30T11:15:00"),
    startTime: 5400,
    endTime: 5460,
  },
  {
    id: "clip-6",
    title: "Pro Tips Tutorial",
    hookText: "Quick tips to improve your gameplay instantly",
    thumbnailUrl: "/api/placeholder/320/180",
    duration: 180,
    status: "ready",
    createdAt: new Date("2024-12-30T11:30:00"),
    startTime: 6000,
    endTime: 6180,
  },
];

// ============================================================
// Mock Posts
// ============================================================

export const mockPosts: Post[] = [
  {
    id: "post-1",
    platform: "x",
    content:
      "Just had an INSANE clutch play on stream! The chat went absolutely wild! Check out the clip below and let me know what you think. #gaming #clutch #epicwin",
    status: "draft",
    clipId: "clip-1",
    createdAt: new Date("2024-12-30T10:20:00"),
    characterLimit: 280,
  },
  {
    id: "post-2",
    platform: "linkedin",
    content:
      "Tonight's Q&A session was incredible! We discussed content creation strategies, community building, and the future of live streaming. Thank you to everyone who submitted questions - your engagement makes these sessions so valuable.\n\nKey takeaways:\n- Consistency beats perfection\n- Engage authentically with your audience\n- Always be learning and adapting\n\nWhat topics would you like me to cover in the next Q&A?",
    status: "approved",
    clipId: "clip-2",
    createdAt: new Date("2024-12-30T10:35:00"),
    characterLimit: 3000,
  },
  {
    id: "post-3",
    platform: "instagram",
    content:
      "Stream highlights incoming! Drop a comment if you were there tonight - the energy was unmatched. New content dropping soon, stay tuned!",
    status: "draft",
    createdAt: new Date("2024-12-30T10:50:00"),
    characterLimit: 2200,
  },
  {
    id: "post-4",
    platform: "youtube",
    content:
      "Full stream replay is now available! Tonight we covered some incredible community questions, had some epic gameplay moments, and announced some exciting news for the channel.\n\nTimestamps:\n0:00 - Intro\n5:00 - Q&A Session\n45:00 - Gameplay Highlights\n1:30:00 - Sponsor Segment\n1:35:00 - Closing Thoughts\n\nDon't forget to like and subscribe if you enjoyed the stream!",
    status: "published",
    clipId: "clip-2",
    createdAt: new Date("2024-12-30T11:00:00"),
    publishedAt: new Date("2024-12-30T11:30:00"),
    characterLimit: 5000,
  },
  {
    id: "post-5",
    platform: "x",
    content:
      "Big thanks to @SponsorBrand for supporting the stream tonight! Use code STREAMER for 20% off your next order. Link in bio!",
    status: "approved",
    clipId: "clip-3",
    createdAt: new Date("2024-12-30T11:10:00"),
    characterLimit: 280,
  },
  {
    id: "post-6",
    platform: "instagram",
    content:
      "When the fail becomes the highlight. Sometimes you just have to laugh at yourself. Who else has had moments like this? Tag someone who needs to see this!",
    status: "draft",
    clipId: "clip-4",
    createdAt: new Date("2024-12-30T11:20:00"),
    characterLimit: 2200,
  },
];

// ============================================================
// Mock Moments
// ============================================================

export const mockMoments: Moment[] = [
  {
    id: "moment-1",
    type: "hype",
    timestamp: 300,
    label: "First Win",
    description: "Chat explodes after first victory of the night",
  },
  {
    id: "moment-2",
    type: "qa",
    timestamp: 900,
    label: "Q&A Start",
    description: "Beginning of community Q&A session",
  },
  {
    id: "moment-3",
    type: "clip",
    timestamp: 1234,
    label: "Epic Clutch",
    description: "Incredible clutch play - clip created",
    clipId: "clip-1",
  },
  {
    id: "moment-4",
    type: "hype",
    timestamp: 1500,
    label: "Raid Incoming",
    description: "500+ viewer raid from friendly streamer",
  },
  {
    id: "moment-5",
    type: "qa",
    timestamp: 2100,
    label: "Best Question",
    description: "Community favorite question answered",
    clipId: "clip-2",
  },
  {
    id: "moment-6",
    type: "sponsor",
    timestamp: 3000,
    label: "Sponsor Read",
    description: "Sponsor segment with product showcase",
    clipId: "clip-3",
  },
  {
    id: "moment-7",
    type: "clip",
    timestamp: 4500,
    label: "Funny Fail",
    description: "Hilarious fail moment",
    clipId: "clip-4",
  },
  {
    id: "moment-8",
    type: "hype",
    timestamp: 5400,
    label: "Community Raid",
    description: "Epic community raid moment",
    clipId: "clip-5",
  },
  {
    id: "moment-9",
    type: "clip",
    timestamp: 6000,
    label: "Tutorial Start",
    description: "Pro tips tutorial begins",
    clipId: "clip-6",
  },
  {
    id: "moment-10",
    type: "sponsor",
    timestamp: 6300,
    label: "Giveaway",
    description: "Sponsor giveaway announcement",
  },
  {
    id: "moment-11",
    type: "hype",
    timestamp: 6800,
    label: "Sub Train",
    description: "Massive subscription train",
  },
  {
    id: "moment-12",
    type: "qa",
    timestamp: 7200,
    label: "Closing Q&A",
    description: "Final questions from chat",
  },
];

// Total mock stream duration: 2 hours (7200 seconds)
export const MOCK_STREAM_DURATION = 7200;
