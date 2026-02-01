/**
 * Gemini Vision Provider
 *
 * Uses Google's Gemini 1.5 Flash model for visual detection.
 * Cost-effective and fast for real-time visual trigger detection.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "../../logger/index.js";
import type { VisualDetection } from "../visual-trigger.service.js";

const logger = createLogger("gemini-vision");

/**
 * Detection response from Gemini
 */
interface GeminiDetectionResponse {
  detected: boolean;
  confidence: number;
  explanation?: string;
}

/**
 * Gemini Vision Provider
 * Uses gemini-1.5-flash for fast, cost-effective visual detection
 */
export class GeminiVisionProvider {
  private client: GoogleGenerativeAI;
  private model: string = "gemini-1.5-flash";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.client = new GoogleGenerativeAI(apiKey);
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
      const model = this.client.getGenerativeModel({ model: this.model });

      // Convert buffer to base64
      const base64Image = imageBuffer.toString("base64");

      // Create prompt for vision detection
      const prompt = `
Analyze this image and determine if it contains: "${query}"

Respond ONLY with valid JSON in this exact format:
{
  "detected": true or false,
  "confidence": 0.0 to 1.0,
  "explanation": "brief explanation of what you see"
}

Be precise and objective. Only set detected to true if you clearly see the requested element.
      `.trim();

      // Generate content with vision
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ]);

      const response = result.response.text();
      logger.debug({ response }, "[GeminiVision] Raw API response");

      // Parse JSON response
      const parsed = this.parseResponse(response);

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
          },
          "[GeminiVision] Detection successful"
        );
      } else {
        logger.debug(
          {
            query,
            confidence: parsed.confidence,
            explanation: parsed.explanation,
          },
          "[GeminiVision] No detection"
        );
      }

      return detectionResult;
    } catch (error) {
      logger.error({ error, query }, "[GeminiVision] Detection error");
      throw error;
    }
  }

  /**
   * Parse Gemini response to extract JSON
   * Handles cases where response includes markdown code blocks
   */
  private parseResponse(response: string): GeminiDetectionResponse {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;

      const parsed = JSON.parse(jsonText.trim());

      // Validate response structure
      if (typeof parsed.detected !== "boolean") {
        throw new Error("Invalid response: 'detected' must be boolean");
      }
      if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error("Invalid response: 'confidence' must be between 0 and 1");
      }

      return parsed as GeminiDetectionResponse;
    } catch (error) {
      logger.error(
        { error, response },
        "[GeminiVision] Failed to parse response"
      );
      // Return safe default on parse error
      return {
        detected: false,
        confidence: 0,
        explanation: "Parse error",
      };
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
      const model = this.client.getGenerativeModel({ model: this.model });
      const base64Image = imageBuffer.toString("base64");

      const queriesList = queries.map((q, i) => `${i + 1}. "${q}"`).join("\n");

      const prompt = `
Analyze this image and check for ALL of the following elements:

${queriesList}

Respond ONLY with valid JSON array:
[
  {"label": "exact query text", "detected": true/false, "confidence": 0.0-1.0, "explanation": "brief description"},
  ...
]

Include an entry for EACH query, even if not detected (confidence: 0).
      `.trim();

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ]);

      const response = result.response.text();
      logger.debug({ response }, "[GeminiVision] Batch detection response");

      // Parse array response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonText.trim());

      if (!Array.isArray(parsed)) {
        throw new Error("Expected array response for batch detection");
      }

      // Filter by threshold and map to VisualDetection
      const detections: VisualDetection[] = parsed
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
        { count: detections.length, total: queries.length },
        "[GeminiVision] Batch detection completed"
      );

      return detections;
    } catch (error) {
      logger.error({ error, queries }, "[GeminiVision] Batch detection error");
      throw error;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): { name: string; provider: string } {
    return {
      name: this.model,
      provider: "google",
    };
  }
}
