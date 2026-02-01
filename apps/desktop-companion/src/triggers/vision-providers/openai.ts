/**
 * OpenAI Vision Provider
 *
 * Uses OpenAI's GPT-4o model for visual detection.
 * Higher accuracy than Gemini but also higher cost.
 */

import OpenAI from "openai";
import { createLogger } from "../../logger/index.js";
import type { VisualDetection } from "../visual-trigger.service.js";

const logger = createLogger("openai-vision");

/**
 * Detection response from OpenAI
 */
interface OpenAIDetectionResponse {
  detected: boolean;
  confidence: number;
  explanation?: string;
}

/**
 * OpenAI Vision Provider
 * Uses GPT-4o for high-accuracy visual detection
 */
export class OpenAIVisionProvider {
  private client: OpenAI;
  private model: string = "gpt-4o";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Detect visual query in image buffer
   *
   * @param imageBuffer - JPEG image buffer from frame extractor
   * @param query - Visual query to detect (e.g., "person waving", "thumbs up gesture")
   * @param threshold - Minimum confidence threshold (0.0 to 1.0)
   * @returns Detection result with confidence score
   */
  async detect(
    imageBuffer: Buffer,
    query: string,
    threshold: number = 0.7
  ): Promise<VisualDetection> {
    try {
      const base64Image = imageBuffer.toString("base64");

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and determine if it contains: "${query}"

Respond ONLY with valid JSON in this exact format:
{
  "detected": true or false,
  "confidence": 0.0 to 1.0,
  "explanation": "brief explanation of what you see"
}

Be precise and objective. Only set detected to true if you clearly see the requested element.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "low", // Use low detail for faster/cheaper processing
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
        temperature: 0.0, // Deterministic responses
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      logger.debug({ content }, "[OpenAIVision] Raw API response");

      const parsed = JSON.parse(content) as OpenAIDetectionResponse;

      // Validate response
      if (typeof parsed.detected !== "boolean") {
        throw new Error("Invalid response: 'detected' must be boolean");
      }
      if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error("Invalid response: 'confidence' must be between 0 and 1");
      }

      const detectionResult: VisualDetection = {
        label: query,
        confidence: parsed.confidence,
      };

      // Log result
      if (parsed.detected && parsed.confidence >= threshold) {
        logger.info(
          {
            query,
            confidence: parsed.confidence,
            explanation: parsed.explanation,
            usage: response.usage,
          },
          "[OpenAIVision] Detection successful"
        );
      } else {
        logger.debug(
          {
            query,
            confidence: parsed.confidence,
            explanation: parsed.explanation,
          },
          "[OpenAIVision] No detection"
        );
      }

      return detectionResult;
    } catch (error) {
      logger.error({ error, query }, "[OpenAIVision] Detection error");
      throw error;
    }
  }

  /**
   * Batch detect multiple queries in a single image
   * More efficient when checking multiple triggers
   *
   * @param imageBuffer - JPEG image buffer
   * @param queries - Array of visual queries to detect
   * @param threshold - Minimum confidence threshold
   * @returns Array of detection results
   */
  async detectBatch(
    imageBuffer: Buffer,
    queries: string[],
    threshold: number = 0.7
  ): Promise<VisualDetection[]> {
    try {
      const base64Image = imageBuffer.toString("base64");
      const queriesList = queries.map((q, i) => `${i + 1}. "${q}"`).join("\n");

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and check for ALL of the following elements:

${queriesList}

Respond ONLY with valid JSON array:
[
  {"label": "exact query text", "detected": true/false, "confidence": 0.0-1.0, "explanation": "brief description"},
  ...
]

Include an entry for EACH query, even if not detected (confidence: 0).`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "low",
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.0,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      logger.debug({ content }, "[OpenAIVision] Batch detection response");

      // OpenAI's response_format json_object wraps arrays in an object
      const parsed = JSON.parse(content);
      let detectionArray: any[];

      // Handle both array and object-wrapped-array responses
      if (Array.isArray(parsed)) {
        detectionArray = parsed;
      } else if (parsed.detections && Array.isArray(parsed.detections)) {
        detectionArray = parsed.detections;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        detectionArray = parsed.results;
      } else {
        throw new Error("Expected array or object with array property in response");
      }

      // Filter by threshold and map to VisualDetection
      const detections: VisualDetection[] = detectionArray
        .filter(
          (item: any) =>
            item.detected === true &&
            typeof item.confidence === "number" &&
            item.confidence >= threshold
        )
        .map((item: any) => ({
          label: item.label || "",
          confidence: item.confidence,
        }));

      logger.info(
        {
          count: detections.length,
          total: queries.length,
          usage: response.usage,
        },
        "[OpenAIVision] Batch detection completed"
      );

      return detections;
    } catch (error) {
      logger.error({ error, queries }, "[OpenAIVision] Batch detection error");
      throw error;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): { name: string; provider: string } {
    return {
      name: this.model,
      provider: "openai",
    };
  }
}
