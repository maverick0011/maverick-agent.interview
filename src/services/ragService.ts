/**
 * Local RAG (Retrieval Augmented Generation) Service for Maverick AI
 * Purely local semantic retrieval, document chunking, and citations
 */

import { GroundedSource, DocumentChunk, KnowledgeDocument } from '../types';
import { localStore } from '../database/localStore';

export class LocalRAGService {
  /**
   * Split document into overlapping semantic chunks
   */
  chunkDocument(docId: string, title: string, text: string, chunkSize = 400, overlap = 80): DocumentChunk[] {
    const words = text.split(/\s+/);
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
      const slice = words.slice(i, i + chunkSize);
      if (slice.length < 20 && chunks.length > 0) break; // skip tiny residual chunks

      const content = slice.join(' ');
      chunks.push({
        id: `chunk-${docId}-${chunkIndex}`,
        docId,
        docTitle: title,
        content,
        chunkIndex,
      });
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Retrieve relevant snippets from all local documents and resume profile
   */
  async findRelevantSources(query: string, limit = 3): Promise<GroundedSource[]> {
    const docs = localStore.getKnowledgeDocs();
    const resume = localStore.getResume();
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0) return [];

    const candidates: GroundedSource[] = [];

    // 1. Search Knowledge Base Documents
    for (const doc of docs) {
      const chunks = this.chunkDocument(doc.id, doc.title, doc.content);
      for (const chunk of chunks) {
        const score = this.calculateRelevance(queryTokens, chunk.content);
        if (score > 0.15) {
          candidates.push({
            documentId: doc.id,
            documentTitle: doc.title,
            snippet: this.getExtractAroundMatch(chunk.content, queryTokens),
            relevance: Math.min(0.99, Number(score.toFixed(2))),
          });
        }
      }
    }

    // 2. Search Candidate Resume Projects & Experience
    if (resume) {
      for (const exp of resume.experience) {
        const text = `${exp.company} ${exp.role}: ${exp.highlights.join(' ')}`;
        const score = this.calculateRelevance(queryTokens, text);
        if (score > 0.12) {
          candidates.push({
            documentId: 'resume-exp',
            documentTitle: `Verified Resume (${exp.company})`,
            snippet: exp.highlights[0] || text.substring(0, 180),
            relevance: Math.min(0.98, Number((score + 0.1).toFixed(2))),
          });
        }
      }

      for (const proj of resume.projects) {
        const text = `${proj.name} ${proj.technologies.join(' ')}: ${proj.description} ${proj.metrics || ''}`;
        const score = this.calculateRelevance(queryTokens, text);
        if (score > 0.12) {
          candidates.push({
            documentId: 'resume-proj',
            documentTitle: `Verified Project (${proj.name})`,
            snippet: `${proj.description} Metric: ${proj.metrics || 'Production tested'}`,
            relevance: Math.min(0.97, Number((score + 0.12).toFixed(2))),
          });
        }
      }
    }

    // Sort descending by score and return top results
    return candidates
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  private calculateRelevance(queryTokens: string[], targetText: string): number {
    const targetTokens = this.tokenize(targetText);
    if (targetTokens.length === 0) return 0;

    const targetSet = new Set(targetTokens);
    let matched = 0;
    let boost = 0;

    for (const q of queryTokens) {
      if (targetSet.has(q)) {
        matched++;
      } else {
        // partial substring match
        for (const t of targetTokens) {
          if (t.includes(q) || q.includes(t)) {
            matched += 0.5;
            break;
          }
        }
      }
    }

    // High intent technical keyword boost
    for (const kw of ['kubernetes', 'oomkilled', '503', 'terraform', 'aws', 'eks', 'slo', 'route53']) {
      if (queryTokens.includes(kw) && targetSet.has(kw)) {
        boost += 0.2;
      }
    }

    const ratio = matched / queryTokens.length;
    return Math.min(1.0, ratio + boost);
  }

  private getExtractAroundMatch(text: string, queryTokens: string[], maxLength = 240): string {
    const lower = text.toLowerCase();
    let bestIndex = -1;

    for (const token of queryTokens) {
      const idx = lower.indexOf(token);
      if (idx !== -1) {
        bestIndex = idx;
        break;
      }
    }

    if (bestIndex === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, bestIndex - 40);
    const end = Math.min(text.length, start + maxLength);
    let snippet = text.substring(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'that', 'this', 'to', 'for',
  'with', 'as', 'by', 'of', 'from', 'it', 'can', 'you', 'how', 'what', 'when', 'why',
  'would', 'could', 'should', 'about', 'some', 'any', 'my', 'your', 'our'
]);

export const ragService = new LocalRAGService();
