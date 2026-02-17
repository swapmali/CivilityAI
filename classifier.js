/**
 * CivilityAI — OpenAI toxicity classifier
 *
 * Calls gpt-4o-mini to score a comment's toxicity from 0 to 100.
 */

import { OPENAI_API_KEY } from "./config.local.js";
import { OPENAI_API_URL, MODEL_NAME } from "./constants.js";

/**
 * Classify the toxicity of a comment.
 * @param {string} commentText  The raw comment text.
 * @returns {Promise<number>}   Score 0-100, or -1 on error.
 */
export async function classifyToxicity(commentText) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "your_api_key_here") {
    console.error("[CivilityAI] OpenAI API key is not configured. Edit config.local.js.");
    return -1;
  }

  const prompt = `Classify the toxicity of this internet comment on a scale from 0 to 100.\n\n0 = completely safe\n100 = extremely toxic, abusive, hateful, or hostile\n\nReturn ONLY the number.\n\nComment:\n"${commentText}"`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[CivilityAI] API error ${response.status}:`, errorBody);
      return -1;
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      console.error("[CivilityAI] Empty API response.");
      return -1;
    }

    const score = parseInt(raw, 10);

    if (isNaN(score) || score < 0 || score > 100) {
      console.error("[CivilityAI] Unexpected score value:", raw);
      return -1;
    }

    return score;
  } catch (err) {
    console.error("[CivilityAI] Classification failed:", err.message);
    return -1;
  }
}
