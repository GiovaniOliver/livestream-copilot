# FluxBoard AI Agent Actions Specification

This document defines discrete AI operations (Actions) for each of the 7 workflow types in the FluxBoard livestream-copilot application. Actions are invokable AI operations that users can trigger manually, that auto-trigger based on conditions, or that become available based on current session state.

---

## Table of Contents

1. [Action Schema](#action-schema)
2. [Content Creator (Streamer)](#1-content-creator-streamer)
3. [Podcast Console](#2-podcast-console)
4. [Script Studio (Screenwriters)](#3-script-studio-screenwriters)
5. [Writers Corner (Authors/Novelists)](#4-writers-corner-authorsnovelists)
6. [Mind Map Room (Brainstorming)](#5-mind-map-room-brainstorming)
7. [Court Session (Legal/Mock Trial)](#6-court-session-legalmock-trial)
8. [Debate Room](#7-debate-room)
9. [Cross-Workflow Actions](#cross-workflow-actions)
10. [Implementation Notes](#implementation-notes)

---

## Action Schema

Each action follows this TypeScript interface:

```typescript
interface AgentAction {
  actionId: string;           // Unique identifier: workflow.action_name
  label: string;              // Display name for UI
  description: string;        // What this action does
  triggerType: 'manual' | 'auto' | 'both';
  autoTriggerCondition?: string;  // When to auto-trigger
  inputs: ActionInput[];      // Required data/context
  outputs: OutputCategory[];  // What it produces
  estimatedTokens: 'low' | 'medium' | 'high';  // ~100-300 | ~300-800 | ~800-2000
  icon: string;               // Icon identifier
  cooldownMs?: number;        // Minimum time between triggers
  requiresTranscript?: boolean;
  minTranscriptLength?: number;
}

interface ActionInput {
  name: string;
  type: 'transcript' | 'context' | 'selection' | 'artifact' | 'user_input';
  required: boolean;
  description: string;
}
```

---

## 1. Content Creator (Streamer)

**Purpose:** Help streamers create clips, social content, and engagement during live sessions.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `content_creator.detect_clip_moment` | Detect Clip Moment | auto | Analyzes transcript for clip-worthy moments (funny, epic, fails) | transcript, mood_context | CHAPTER_MARKER | Medium |
| `content_creator.generate_clip_title` | Generate Clip Title | both | Creates catchy, clickable title for a clip | clip_context, transcript_segment | CLIP_TITLE | Low |
| `content_creator.generate_social_post` | Generate Social Post | both | Creates platform-optimized social media post | transcript_segment, platform, clip_ref | SOCIAL_POST | Low |
| `content_creator.generate_hashtags` | Generate Hashtags | manual | Generates trending/relevant hashtags for content | transcript, platform, content_type | SOCIAL_POST | Low |
| `content_creator.generate_thumbnail_text` | Thumbnail Text | manual | Creates text overlay suggestions for thumbnails | clip_context, title | CLIP_TITLE | Low |
| `content_creator.highlight_moments` | Highlight Moments | auto | Identifies and ranks best moments from session | full_transcript, moments_list | CHAPTER_MARKER | High |
| `content_creator.generate_engagement_hook` | Engagement Hook | both | Creates opening hooks for clips/posts | transcript_segment, target_platform | SOCIAL_POST | Low |
| `content_creator.generate_cta` | Generate CTA | manual | Creates call-to-action text for posts | content_context, goal, platform | SOCIAL_POST | Low |
| `content_creator.rate_clip_worthiness` | Rate Clip Worthiness | auto | Scores transcript segment for viral potential | transcript_segment | CHAPTER_MARKER | Low |
| `content_creator.generate_thread` | Generate Thread | manual | Creates multi-post thread from content | transcript_segment, platform | SOCIAL_POST | Medium |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `detect_clip_moment` | Every 30s of new transcript, or on high-energy audio detection |
| `rate_clip_worthiness` | When clip is created or moment is marked |
| `highlight_moments` | At session end, or every 15 minutes |
| `generate_engagement_hook` | When clip_worthiness > 0.7 |

---

## 2. Podcast Console

**Purpose:** Assist podcast production with chapters, notes, quotes, and promotional content.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `podcast.detect_chapter` | Detect Chapter | auto | Identifies topic changes for chapter markers | transcript, previous_topics | CHAPTER_MARKER | Medium |
| `podcast.extract_quote` | Extract Quote | both | Pulls notable, shareable quotes | transcript_segment | QUOTE | Low |
| `podcast.generate_show_notes` | Generate Show Notes | manual | Creates structured show notes | full_transcript, topics, guests | EPISODE_META | High |
| `podcast.generate_episode_description` | Episode Description | manual | Writes compelling episode description | transcript_summary, topics, guests | EPISODE_META | Medium |
| `podcast.detect_soundbite` | Detect Soundbite | auto | Identifies compelling audio clips | transcript, audio_energy | CHAPTER_MARKER | Medium |
| `podcast.generate_guest_intro` | Guest Introduction | manual | Creates guest bio/introduction text | guest_info, context | EPISODE_META | Low |
| `podcast.summarize_topic` | Summarize Topic | both | Creates summary of discussed topic | topic_transcript_segment | EPISODE_META | Medium |
| `podcast.detect_sponsor_read` | Detect Sponsor Read | auto | Identifies sponsor segments for timestamps | transcript_segment | CHAPTER_MARKER | Low |
| `podcast.extract_action_items` | Extract Action Items | both | Pulls mentioned tasks, links, recommendations | transcript_segment | ACTION_ITEM | Medium |
| `podcast.generate_promo_clip_text` | Promo Clip Text | manual | Creates promotional text for clip teasers | clip_context, episode_title | SOCIAL_POST | Low |
| `podcast.generate_timestamps` | Generate Timestamps | manual | Creates YouTube-style timestamp list | chapters, full_transcript | CHAPTER_MARKER | Medium |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `detect_chapter` | When topic shift detected (semantic similarity < 0.5) |
| `detect_soundbite` | Every 60s, when quote confidence > 0.6 |
| `detect_sponsor_read` | When sponsor-related keywords detected |
| `extract_action_items` | When action-oriented language detected |

---

## 3. Script Studio (Film/TV/Theater Writers)

**Purpose:** Support screenwriters and playwrights in developing scripts for film, television, and theater productions.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `script_studio.generate_slugline` | Generate Slugline | manual | Creates properly formatted scene heading (INT/EXT, LOCATION - TIME) | location_description, time_of_day | SCRIPT_INSERT | Low |
| `script_studio.analyze_scene_structure` | Analyze Scene | manual | Breaks down scene into setup, conflict, resolution | scene_text, context | SCRIPT_INSERT | High |
| `script_studio.polish_dialogue` | Polish Dialogue | manual | Refines dialogue for character voice and subtext | dialogue_text, character_profile | SCRIPT_INSERT | Medium |
| `script_studio.check_character_voice` | Character Voice Check | manual | Verifies dialogue consistency with character | dialogue_text, character_bible | SCRIPT_INSERT | Medium |
| `script_studio.detect_plot_point` | Detect Plot Point | auto | Identifies major story turning points (inciting incident, midpoint, climax) | transcript, story_context | BEAT | Medium |
| `script_studio.suggest_act_break` | Suggest Act Break | both | Proposes act break placement (3-act film, 5-act play) | story_outline, format_type | BEAT | Medium |
| `script_studio.identify_conflict` | Identify Conflict | both | Finds conflict/tension points in scenes | scene_text, characters | BEAT | Medium |
| `script_studio.analyze_subtext` | Analyze Subtext | manual | Reveals underlying meaning in dialogue | dialogue_text, scene_context | SCRIPT_INSERT | Medium |
| `script_studio.generate_action_line` | Generate Action Line | manual | Creates visual action description (show don't tell) | action_description | SCRIPT_INSERT | Low |
| `script_studio.suggest_transition` | Suggest Transition | manual | Proposes scene transition (CUT TO, FADE, DISSOLVE) | from_scene, to_scene, tone | SCRIPT_INSERT | Low |
| `script_studio.track_character_arc` | Track Character Arc | both | Monitors character transformation through story | character, scenes_list | BEAT | Medium |
| `script_studio.detect_montage` | Detect Montage | auto | Identifies montage sequence opportunities | transcript_segment | SCRIPT_INSERT | Low |
| `script_studio.generate_stage_direction` | Stage Direction (Theater) | manual | Creates blocking and stage direction notes | action_context, stage_layout | SCRIPT_INSERT | Medium |
| `script_studio.estimate_page_timing` | Estimate Timing | manual | Calculates approximate runtime (1 page ≈ 1 min) | scene_pages, action_density | SCRIPT_INSERT | Low |
| `script_studio.check_format_compliance` | Check Format | manual | Verifies script follows industry format standards | script_segment, format_type | ACTION_ITEM | Medium |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `detect_plot_point` | When major story event discussed (keywords: "turning point", "twist", "revelation") |
| `identify_conflict` | When tension/obstacle language detected |
| `track_character_arc` | When character development/change discussed |
| `detect_montage` | When sequence/passage of time discussed |

---

## 4. Writers Corner (Authors/Novelists)

**Purpose:** Support novel/book authors with chapter tracking, character notes, and continuity.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `writers_corner.summarize_chapter` | Summarize Chapter | both | Creates chapter summary | chapter_transcript, context | BEAT | Medium |
| `writers_corner.capture_character_note` | Capture Character Note | both | Records character development notes | transcript_segment, character | QUOTE | Low |
| `writers_corner.track_plot_thread` | Track Plot Thread | auto | Identifies and logs plot threads | transcript, existing_threads | BEAT | Medium |
| `writers_corner.capture_worldbuilding` | Capture Worldbuilding | both | Records world/setting details | transcript_segment | BEAT | Low |
| `writers_corner.attribute_dialogue` | Attribute Dialogue | auto | Assigns dialogue to characters | dialogue_text, characters | SCRIPT_INSERT | Low |
| `writers_corner.identify_theme` | Identify Theme | both | Recognizes thematic elements | transcript_segment, context | BEAT | Medium |
| `writers_corner.check_continuity` | Check Continuity | manual | Flags potential continuity issues | current_content, story_bible | ACTION_ITEM | High |
| `writers_corner.generate_character_sheet` | Character Sheet | manual | Creates character profile template | character_notes, appearances | BEAT | Medium |
| `writers_corner.track_timeline` | Track Timeline | both | Monitors story chronology | events_list, dates | BEAT | Medium |
| `writers_corner.suggest_foreshadowing` | Suggest Foreshadowing | manual | Proposes foreshadowing opportunities | plot_threads, current_position | SCRIPT_INSERT | Medium |
| `writers_corner.log_open_loop` | Log Open Loop | auto | Captures unresolved story elements | transcript_segment | ACTION_ITEM | Low |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `track_plot_thread` | When plot-related discussion detected |
| `attribute_dialogue` | When dialogue is being drafted |
| `log_open_loop` | When "need to resolve" or similar phrases detected |

---

## 5. Mind Map Room (Brainstorming)

**Purpose:** Capture, cluster, and develop ideas during brainstorming sessions.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `mind_map.capture_idea` | Capture Idea | auto | Extracts new ideas from discussion | transcript_segment | IDEA_NODE | Low |
| `mind_map.cluster_ideas` | Cluster Ideas | both | Groups related ideas together | ideas_list | IDEA_NODE | Medium |
| `mind_map.find_connections` | Find Connections | both | Identifies relationships between ideas | ideas_list | IDEA_NODE | Medium |
| `mind_map.expand_idea` | Expand Idea | manual | Develops an idea with sub-points | idea_node, context | IDEA_NODE | Medium |
| `mind_map.prioritize_ideas` | Prioritize Ideas | manual | Ranks ideas by criteria | ideas_list, criteria | IDEA_NODE | Medium |
| `mind_map.extract_action_items` | Extract Actions | both | Converts ideas to action items | ideas_list, priorities | ACTION_ITEM | Medium |
| `mind_map.detect_duplicate` | Detect Duplicate | auto | Flags similar/duplicate ideas | new_idea, existing_ideas | IDEA_NODE | Low |
| `mind_map.synthesize_ideas` | Synthesize Ideas | manual | Combines ideas into new concept | selected_ideas | IDEA_NODE | Medium |
| `mind_map.generate_variations` | Generate Variations | manual | Creates variations of an idea | idea_node | IDEA_NODE | Medium |
| `mind_map.identify_eureka` | Identify Eureka | auto | Flags breakthrough moments | transcript_segment | QUOTE | Low |
| `mind_map.categorize_idea` | Categorize Idea | auto | Assigns category to new idea | idea_node, categories | IDEA_NODE | Low |
| `mind_map.generate_session_summary` | Session Summary | manual | Creates overview of brainstorm session | all_ideas, connections | EPISODE_META | High |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `capture_idea` | When new concept language detected |
| `detect_duplicate` | When new idea captured (similarity check) |
| `identify_eureka` | When excitement/breakthrough language detected |
| `categorize_idea` | Immediately after idea capture |

---

## 6. Court Session (Legal/Mock Trial)

**Purpose:** Support legal proceedings and mock trials with evidence tracking and argument analysis.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `court.log_evidence` | Log Evidence | both | Records evidence presented | transcript_segment, exhibit_ref | EVIDENCE_CARD | Low |
| `court.track_objection` | Track Objection | auto | Logs objections and rulings | transcript_segment | CLAIM | Low |
| `court.assess_witness_credibility` | Assess Credibility | manual | Evaluates witness testimony | testimony_text, context | EVIDENCE_CARD | Medium |
| `court.rate_argument_strength` | Rate Argument | manual | Scores argument effectiveness | argument_text, evidence | CLAIM | Medium |
| `court.identify_precedent` | Identify Precedent | both | Suggests relevant case precedents | argument_text, jurisdiction | EVIDENCE_CARD | High |
| `court.construct_timeline` | Construct Timeline | both | Builds case timeline from testimony | testimonies, evidence | EVIDENCE_CARD | High |
| `court.generate_ruling_notes` | Ruling Notes | manual | Drafts notes for ruling | arguments, evidence, law | MODERATOR_PROMPT | High |
| `court.summarize_testimony` | Summarize Testimony | both | Creates witness testimony summary | testimony_transcript | QUOTE | Medium |
| `court.track_exhibits` | Track Exhibits | auto | Logs and organizes exhibits | exhibit_mention, description | EVIDENCE_CARD | Low |
| `court.identify_contradictions` | Find Contradictions | both | Flags contradictory statements | testimonies_list | CLAIM | Medium |
| `court.generate_cross_questions` | Cross-Exam Questions | manual | Suggests cross-examination questions | testimony, case_theory | MODERATOR_PROMPT | Medium |
| `court.draft_closing_points` | Closing Points | manual | Outlines key closing argument points | full_case_record | CLAIM | High |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `track_objection` | When "objection" detected in transcript |
| `track_exhibits` | When "exhibit" or "evidence" mentioned |
| `identify_contradictions` | Every 5 minutes, comparing recent testimony |
| `log_evidence` | When evidentiary language detected |

---

## 7. Debate Room

**Purpose:** Facilitate structured debates with claim tracking, evidence scoring, and moderation.

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `debate.track_claim` | Track Claim | auto | Logs assertions and arguments | transcript_segment, speaker | CLAIM | Low |
| `debate.link_counterclaim` | Link Counterclaim | auto | Connects claims to rebuttals | new_claim, existing_claims | CLAIM | Medium |
| `debate.score_evidence` | Score Evidence | both | Evaluates evidence quality | evidence_text, claim_ref | EVIDENCE_CARD | Medium |
| `debate.detect_fallacy` | Detect Fallacy | auto | Identifies logical fallacies | argument_text | CLAIM | Medium |
| `debate.queue_rebuttal` | Queue Rebuttal | manual | Suggests rebuttal points | claim, counter_evidence | MODERATOR_PROMPT | Medium |
| `debate.rate_argument_strength` | Rate Argument | both | Scores argument effectiveness | argument_text, evidence | CLAIM | Medium |
| `debate.suggest_fact_check` | Suggest Fact Check | both | Flags claims needing verification | claim_text | ACTION_ITEM | Low |
| `debate.generate_moderator_prompt` | Moderator Prompt | both | Creates questions for moderator | debate_state, topics | MODERATOR_PROMPT | Medium |
| `debate.summarize_position` | Summarize Position | manual | Creates summary of speaker's stance | speaker_claims | CLAIM | Medium |
| `debate.track_topic_coverage` | Track Coverage | auto | Monitors topics discussed | transcript, topic_list | CHAPTER_MARKER | Low |
| `debate.generate_closing_summary` | Closing Summary | manual | Creates debate summary | all_claims, evidence | EPISODE_META | High |
| `debate.extract_key_quotes` | Extract Key Quotes | both | Pulls impactful debate quotes | transcript_segment | QUOTE | Low |

### Auto-Trigger Conditions

| Action | Condition |
|--------|-----------|
| `track_claim` | When assertion language detected |
| `link_counterclaim` | When rebuttal language following existing claim |
| `detect_fallacy` | When logical structure analyzed, confidence > 0.6 |
| `track_topic_coverage` | Every 2 minutes |
| `generate_moderator_prompt` | Every 5 claims, or on moderator request |

---

## Cross-Workflow Actions

These actions are available across all workflows:

| Action ID | Label | Trigger | Description | Inputs | Outputs | Tokens |
|-----------|-------|---------|-------------|--------|---------|--------|
| `common.summarize_segment` | Summarize Segment | manual | Summarizes last N minutes | transcript_segment, duration | EPISODE_META | Medium |
| `common.generate_transcript_segment` | Get Transcript | manual | Extracts clean transcript | time_range | - | Low |
| `common.extract_key_points` | Extract Key Points | both | Pulls main points from discussion | transcript_segment | ACTION_ITEM | Medium |
| `common.identify_speakers` | Identify Speakers | auto | Attributes speech to speakers | transcript_segment | - | Low |
| `common.generate_title` | Generate Title | manual | Creates session title | transcript_summary, workflow | EPISODE_META | Low |
| `common.tag_content` | Tag Content | both | Generates tags/keywords | transcript_segment | EPISODE_META | Low |
| `common.detect_language` | Detect Language | auto | Identifies spoken language | audio_segment | - | Low |
| `common.translate_segment` | Translate Segment | manual | Translates transcript | transcript_segment, target_lang | - | Medium |
| `common.generate_session_recap` | Session Recap | manual | Creates end-of-session summary | full_transcript, outputs | EPISODE_META | High |
| `common.export_outputs` | Export Outputs | manual | Compiles outputs for export | output_selection, format | - | Low |
| `common.mark_timestamp` | Mark Timestamp | manual | Creates bookmark at current time | label, notes | CHAPTER_MARKER | Low |
| `common.search_transcript` | Search Transcript | manual | Semantic search in transcript | query | - | Low |

---

## Implementation Notes

### Token Estimates

| Level | Range | Use Cases |
|-------|-------|-----------|
| Low | 100-300 tokens | Simple extraction, classification, short generation |
| Medium | 300-800 tokens | Analysis, summarization, multi-step generation |
| High | 800-2000 tokens | Comprehensive analysis, long-form content, synthesis |

### Cooldown Recommendations

| Action Type | Recommended Cooldown |
|-------------|---------------------|
| Auto-trigger detection | 15-30 seconds |
| Analysis actions | 60 seconds |
| Heavy synthesis | 120 seconds |
| Manual actions | No cooldown |

### Output Category Mapping by Workflow

| Workflow | Primary Categories |
|----------|-------------------|
| Content Creator | SOCIAL_POST, CLIP_TITLE, CHAPTER_MARKER, QUOTE |
| Podcast Console | CHAPTER_MARKER, QUOTE, EPISODE_META, ACTION_ITEM |
| Script Studio | BEAT, SCRIPT_INSERT, QUOTE |
| Writers Corner | BEAT, QUOTE, SCRIPT_INSERT, ACTION_ITEM |
| Mind Map Room | IDEA_NODE, ACTION_ITEM, QUOTE |
| Court Session | EVIDENCE_CARD, CLAIM, QUOTE, MODERATOR_PROMPT |
| Debate Room | CLAIM, EVIDENCE_CARD, QUOTE, MODERATOR_PROMPT |

### Context Requirements

Actions require varying amounts of context:

| Context Type | Description | Token Impact |
|--------------|-------------|--------------|
| `transcript_segment` | Last 30-120 seconds of speech | +100-400 |
| `full_transcript` | Complete session transcript | +500-2000 |
| `context` | Session metadata, participants | +50-100 |
| `artifact` | Reference to clip, document, etc. | +50-150 |
| `existing_items` | Previous outputs (beats, ideas, claims) | +100-500 |

### UI Integration Recommendations

1. **Action Buttons**: Display in workflow dashboard action bar
2. **Auto-Trigger Indicators**: Show when auto-actions are running
3. **Action Queue**: Display pending actions with cancel option
4. **Output Preview**: Show generated content before committing
5. **Confidence Scores**: Display confidence for auto-triggered outputs
6. **Token Usage**: Show estimated vs. actual token consumption
7. **Cooldown Timers**: Visual indicator for action cooldowns

### Action State Machine

```
IDLE -> QUEUED -> PROCESSING -> (SUCCESS | FAILED | CANCELLED)
                      |
                      v
                  REVIEWING (for user confirmation)
                      |
                      v
              (COMMITTED | DISCARDED)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-31 | Initial specification |
