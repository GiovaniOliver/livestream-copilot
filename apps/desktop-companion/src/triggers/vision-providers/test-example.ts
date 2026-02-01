/**
 * Vision Provider Test Example
 *
 * Example code for testing vision providers manually.
 * Not meant to be run directly - copy snippets to test files or scripts.
 */

import { GeminiVisionProvider } from "./gemini.js";
import { OpenAIVisionProvider } from "./openai.js";
import { createFrameExtractor } from "../frame-extractor.js";
import fs from "fs";

/**
 * Test Gemini provider with saved frame
 */
async function testGeminiWithSavedFrame() {
  // Load a test image
  const frameBuffer = fs.readFileSync("./test-frame.jpg");

  // Initialize provider
  const provider = new GeminiVisionProvider(process.env.GEMINI_API_KEY!);

  // Test single detection
  console.log("Testing single detection...");
  const result = await provider.detect(frameBuffer, "person waving", 0.7);
  console.log("Result:", result);

  // Test batch detection
  console.log("\nTesting batch detection...");
  const queries = ["thumbs up", "peace sign", "waving"];
  const results = await provider.detectBatch(frameBuffer, queries, 0.7);
  console.log("Results:", results);
}

/**
 * Test OpenAI provider with saved frame
 */
async function testOpenAIWithSavedFrame() {
  const frameBuffer = fs.readFileSync("./test-frame.jpg");
  const provider = new OpenAIVisionProvider(process.env.OPENAI_API_KEY!);

  const result = await provider.detect(
    frameBuffer,
    "person giving thumbs up gesture",
    0.8
  );
  console.log("OpenAI Result:", result);
}

/**
 * Extract frame from live RTSP stream
 */
async function extractFrameFromLiveStream() {
  const extractor = createFrameExtractor("live/stream", {
    maxWidth: 1024,
    quality: 85,
  });

  try {
    console.log("Extracting frame from RTSP stream...");
    const frame = await extractor.extractFrame();

    // Save for inspection
    fs.writeFileSync("./extracted-frame.jpg", frame);
    console.log(`Frame saved: ${frame.length} bytes`);

    return frame;
  } catch (error) {
    console.error("Frame extraction failed:", error);
    throw error;
  }
}

/**
 * Full integration test: Extract frame and detect
 */
async function testFullIntegration() {
  try {
    // Extract frame from live stream
    const frame = await extractFrameFromLiveStream();

    // Test with Gemini
    const gemini = new GeminiVisionProvider(process.env.GEMINI_API_KEY!);
    const geminiResult = await gemini.detect(frame, "person waving", 0.7);
    console.log("Gemini detection:", geminiResult);

    // Test with OpenAI
    const openai = new OpenAIVisionProvider(process.env.OPENAI_API_KEY!);
    const openaiResult = await openai.detect(frame, "person waving", 0.7);
    console.log("OpenAI detection:", openaiResult);

    // Compare results
    console.log("\nComparison:");
    console.log(`Gemini confidence: ${geminiResult.confidence}`);
    console.log(`OpenAI confidence: ${openaiResult.confidence}`);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

/**
 * Benchmark provider performance
 */
async function benchmarkProviders() {
  const frameBuffer = fs.readFileSync("./test-frame.jpg");
  const query = "person waving";
  const iterations = 10;

  // Benchmark Gemini
  console.log("Benchmarking Gemini...");
  const gemini = new GeminiVisionProvider(process.env.GEMINI_API_KEY!);
  const geminiStart = Date.now();

  for (let i = 0; i < iterations; i++) {
    await gemini.detect(frameBuffer, query, 0.7);
  }

  const geminiTime = (Date.now() - geminiStart) / iterations;
  console.log(`Gemini avg: ${geminiTime.toFixed(0)}ms`);

  // Benchmark OpenAI
  console.log("\nBenchmarking OpenAI...");
  const openai = new OpenAIVisionProvider(process.env.OPENAI_API_KEY!);
  const openaiStart = Date.now();

  for (let i = 0; i < iterations; i++) {
    await openai.detect(frameBuffer, query, 0.7);
  }

  const openaiTime = (Date.now() - openaiStart) / iterations;
  console.log(`OpenAI avg: ${openaiTime.toFixed(0)}ms`);

  console.log(`\nSpeedup: ${(openaiTime / geminiTime).toFixed(2)}x`);
}

/**
 * Test confidence threshold tuning
 */
async function testThresholdTuning() {
  const frameBuffer = fs.readFileSync("./test-frame.jpg");
  const provider = new GeminiVisionProvider(process.env.GEMINI_API_KEY!);
  const query = "person waving";

  console.log("Testing different confidence thresholds:");

  for (const threshold of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    const result = await provider.detect(frameBuffer, query, threshold);
    console.log(
      `Threshold ${threshold}: detected=${result.confidence >= threshold}, confidence=${result.confidence}`
    );
  }
}

/**
 * Test batch detection efficiency
 */
async function testBatchEfficiency() {
  const frameBuffer = fs.readFileSync("./test-frame.jpg");
  const provider = new GeminiVisionProvider(process.env.GEMINI_API_KEY!);
  const queries = [
    "thumbs up",
    "peace sign",
    "waving",
    "pointing",
    "fist bump",
  ];

  // Sequential detection
  console.log("Testing sequential detection...");
  const seqStart = Date.now();
  const seqResults = [];
  for (const query of queries) {
    const result = await provider.detect(frameBuffer, query, 0.7);
    seqResults.push(result);
  }
  const seqTime = Date.now() - seqStart;
  console.log(`Sequential: ${seqTime}ms (${queries.length} queries)`);

  // Batch detection
  console.log("\nTesting batch detection...");
  const batchStart = Date.now();
  const batchResults = await provider.detectBatch(frameBuffer, queries, 0.7);
  const batchTime = Date.now() - batchStart;
  console.log(`Batch: ${batchTime}ms (${queries.length} queries)`);

  console.log(`\nSpeedup: ${(seqTime / batchTime).toFixed(2)}x`);
  console.log(`Cost savings: ${((1 - batchTime / seqTime) * 100).toFixed(0)}%`);
}

// Export test functions
export {
  testGeminiWithSavedFrame,
  testOpenAIWithSavedFrame,
  extractFrameFromLiveStream,
  testFullIntegration,
  benchmarkProviders,
  testThresholdTuning,
  testBatchEfficiency,
};

/**
 * Run all tests
 *
 * Usage:
 *   tsx src/triggers/vision-providers/test-example.ts
 */
async function runAllTests() {
  console.log("=".repeat(60));
  console.log("Vision Provider Tests");
  console.log("=".repeat(60));

  try {
    await testGeminiWithSavedFrame();
    await testOpenAIWithSavedFrame();
    await testFullIntegration();
    await benchmarkProviders();
    await testThresholdTuning();
    await testBatchEfficiency();

    console.log("\n" + "=".repeat(60));
    console.log("All tests completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\nTest suite failed:", error);
    process.exit(1);
  }
}

// Uncomment to run tests
// runAllTests();
