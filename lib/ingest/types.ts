/**
 * Ingestion pipeline — shared types.
 *
 * The pipeline turns raw public-source material into normalized `Signal`
 * records (defined in lib/types.ts). A "collector" gathers raw material from
 * one kind of source; an "extractor" normalizes that material into Signals.
 *
 * This file defines the collector contract so we can add more collectors
 * later (a direct DIS scraper, an RSS reader, a filings API) without
 * touching the orchestrator.
 */

import type { SignalSource } from '../types';

/** One raw source document/result gathered by a collector, pre-extraction. */
export interface RawSourceItem {
  /** Canonical URL for the source (used for citation + dedupe). */
  url: string;
  /** Human title of the page/filing, if known. */
  title?: string;
  /** Publisher / site name, if known (e.g. "Mount Vernon News"). */
  publisher?: string;
  /** ISO date the underlying item was published, if the collector knows it. */
  publishedAt?: string;
  /** Free-text page-age string some sources return (e.g. "June 26, 2025"). */
  pageAge?: string;
}

/** Result of a collector run. */
export interface CollectionResult {
  /** The model's synthesized digest of what it found (with inline references). */
  digest: string;
  /** Deduplicated list of source items the model actually consulted. */
  sources: RawSourceItem[];
  /** The search queries the collector issued (for transparency / the run log). */
  queries: string[];
  /** Model id used. */
  model: string;
}

/** Context a collector needs to know what to look for. */
export interface CollectionContext {
  campaignId: string;
  /** Project display name, e.g. "Frasier Solar". */
  projectName: string;
  /** Jurisdiction, e.g. "Knox County, Ohio". */
  jurisdiction: string;
  /** Regulatory docket / case number, if any (e.g. "OPSB 23-0796-EL-BGN"). */
  docket?: string;
  /** Extra hints for the search (developer name, technology, capacity). */
  hints?: string;
  /** Optional domains to prefer (bare domains). */
  allowedDomains?: string[];
  /** Operator/agent-designated URLs to specifically check this pass. */
  monitoredUrls?: string[];
}

/** A collector gathers raw civic-record material for a campaign. */
export interface Collector {
  readonly kind: SignalSource;
  collect(ctx: CollectionContext): Promise<CollectionResult>;
}
