import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateBatchEmbeddings(text) {
  const { embeddings, usage } = await embedMany({
    model: openai.embeddingModel('text-embedding-3-small'),
    values: text
  });

  return embeddings
}
