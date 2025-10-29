import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

interface Document {
  id: string;
  title: string;
  content: string;
  sections: DocumentSection[];
}

interface DocumentSection {
  heading: string;
  content: string;
  lineNumber: number;
}

/**
 * Knowledge Search Service
 *
 * Provides fast text search across knowledge base markdown files.
 * Used by AI to reference Islamic guidance documents.
 *
 * @see apps/backend/src/ai/knowledge/ for markdown files
 */
@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);
  private documents: Document[] = [];
  private wordIndex: Map<string, Set<string>> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeIndex();
  }

  private initializeIndex(): void {
    try {
      const knowledgeDir = path.join(__dirname, '../../knowledge');

      if (!fs.existsSync(knowledgeDir)) {
        this.logger.warn(`Knowledge directory not found: ${knowledgeDir}`);
        return;
      }

      const files = fs.readdirSync(knowledgeDir);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      for (const file of markdownFiles) {
        this.loadDocument(path.join(knowledgeDir, file));
      }

      this.buildWordIndex();
      this.isInitialized = true;
      this.logger.log(`Knowledge search initialized with ${this.documents.length} documents`);
    } catch (error) {
      this.logger.error(`Failed to initialize knowledge search: ${error.message}`);
    }
  }

  private loadDocument(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, '.md');

      const document: Document = {
        id: filename,
        title: this.extractTitle(content, filename),
        content: content,
        sections: this.parseSections(content),
      };

      this.documents.push(document);
    } catch (error) {
      this.logger.error(`Failed to load document ${filePath}: ${error.message}`);
    }
  }

  private extractTitle(content: string, fallback: string): string {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }

    return fallback.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private parseSections(content: string): DocumentSection[] {
    const lines = content.split('\n');
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.match(/^#{1,6}\s/)) {
        if (currentSection) {
          sections.push(currentSection);
        }

        const heading = trimmed.replace(/^#{1,6}\s/, '').trim();
        currentSection = {
          heading,
          content: '',
          lineNumber: index + 1,
        };
      } else if (currentSection && trimmed) {
        currentSection.content += (currentSection.content ? ' ' : '') + trimmed;
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private buildWordIndex(): void {
    for (const doc of this.documents) {
      const words = this.extractWords(doc.content);

      for (const word of words) {
        if (!this.wordIndex.has(word)) {
          this.wordIndex.set(word, new Set());
        }
        this.wordIndex.get(word)!.add(doc.id);
      }
    }
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    ]);

    return stopWords.has(word);
  }

  /**
   * Search knowledge base
   * @param query - Search query
   * @param limit - Maximum number of results (default: 3)
   * @returns Array of search results with snippets
   */
  public search(query: string, limit: number = 3): SearchResult[] {
    if (!this.isInitialized || !query.trim()) {
      return [];
    }

    const queryWords = this.extractWords(query);
    if (queryWords.length === 0) {
      return [];
    }

    const docScores = new Map<string, number>();
    const docMatches = new Map<string, Set<string>>();

    for (const word of queryWords) {
      const matchingDocs = this.wordIndex.get(word);
      if (matchingDocs) {
        for (const docId of matchingDocs) {
          docScores.set(docId, (docScores.get(docId) || 0) + 1);

          if (!docMatches.has(docId)) {
            docMatches.set(docId, new Set());
          }
          docMatches.get(docId)!.add(word);
        }
      }
    }

    const results: SearchResult[] = [];

    for (const [docId, score] of docScores.entries()) {
      const doc = this.documents.find(d => d.id === docId);
      if (!doc) continue;

      const matchedWords = docMatches.get(docId) || new Set();
      const snippet = this.extractSnippet(doc, matchedWords, query);

      let finalScore = score;
      const titleWords = this.extractWords(doc.title);
      for (const queryWord of queryWords) {
        if (titleWords.includes(queryWord)) {
          finalScore += 2;
        }
      }

      results.push({
        id: docId,
        title: doc.title,
        snippet: snippet,
        score: finalScore,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private extractSnippet(doc: Document, matchedWords: Set<string>, query: string): string {
    const queryWords = this.extractWords(query);

    let bestSection: DocumentSection | null = null;
    let bestScore = 0;

    for (const section of doc.sections) {
      const sectionWords = this.extractWords(section.content);
      let score = 0;

      for (const queryWord of queryWords) {
        if (sectionWords.includes(queryWord)) {
          score++;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestSection = section;
      }
    }

    if (bestSection) {
      const sentences = bestSection.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s);

      const relevantSentences = sentences.filter(sentence => {
        const sentenceWords = this.extractWords(sentence);
        return queryWords.some(word => sentenceWords.includes(word));
      });

      if (relevantSentences.length > 0) {
        let snippet = relevantSentences.slice(0, 2).join('. ');
        if (snippet.length > 200) {
          snippet = snippet.substring(0, 197) + '...';
        }
        return snippet;
      }
    }

    const sentences = doc.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    let snippet = sentences.slice(0, 2).join('. ');
    if (snippet.length > 200) {
      snippet = snippet.substring(0, 197) + '...';
    }

    return snippet || 'No preview available';
  }

  public getDocumentCount(): number {
    return this.documents.length;
  }

  public getIndexSize(): number {
    return this.wordIndex.size;
  }
}
