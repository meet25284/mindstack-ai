import { embedMany, generateText, stepCountIs, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import Usage from '@/models/usage';

const usage = new Map([
  ["emb", 0],
  ["title", {
    input: 0,
    output: 0,
    total: 0,
  }
  ],
  ["response", {
    input: 0,
    output: 0,
    total: 0,
  }
  ],
])

function resetUsage() {
  usage.set("emb", 0);

  usage.set("title", {
    input: 0,
    output: 0,
    total: 0,
  });

  usage.set("response", {
    input: 0,
    output: 0,
    total: 0,
  });
}

const model = openai("gpt-4o-mini");

export async function generateBatchEmbeddings(text) {
  const values = Array.isArray(text) ? text : [text];
  const { embeddings, usage: tokenUsage } = await embedMany({
    model: openai.embeddingModel('text-embedding-3-small'),
    values
  });
  usage.set("emb", usage.get("emb") + tokenUsage.tokens);

  return embeddings
}

export async function generateTitle(prompt) {
  if (process.env.NODE_ENV === "test") {
    return "Mocked Title";
  }

  try {
    const { text, usage: tokenUsage } = await generateText({
      model,
      system:
        "Generate a very short chat title (maximum 4 words, no quotes, no markdown).",
      prompt: prompt,
    });

    usage.set("title", {
      input: tokenUsage.inputTokens ?? 0,
      output: tokenUsage.outputTokens ?? 0,
      total: tokenUsage.totalTokens ?? 0,
    });
    return text.trim() || "New Chat";
  } catch (err) {
    console.error(err);

    return prompt.split(" ").slice(0, 5).join(" ") || "New Chat";
  }
}

export async function generateResponse(systemPrompt, prompt, tools) {

  const result = streamText({
    model,
    system: systemPrompt,
    tools,
    messages: prompt,
    stopWhen: stepCountIs(5),
    onFinish: ({ usage: tokenUsage }) => {
      usage.set("response", {
        input: tokenUsage.inputTokens ?? 0,
        output: tokenUsage.outputTokens ?? 0,
        total: tokenUsage.totalTokens ?? 0,
      });
    }
  });

  return result
}

export async function updateUsage(userId) {
  try {
    const emb = usage.get("emb");
    const title = usage.get("title");
    const response = usage.get("response");

    await Usage.create({
      userId,
      embeddingToken: emb,
      titleGenerationToken: {
        prompt: title.input,
        output: title.output,
        total: title.total,
      },
      responseGenerationToken: {
        prompt: response.input,
        output: response.output,
        total: response.total,
      },
      totalUsage: emb + title.total + response.total,
    });

    resetUsage();
  } catch (error) {
    console.log(error);
  }
}