import type { WestBankSourceItem, WestBankThreatMarker } from '../../types/westbank.ts';

export function buildWestBankThreatMarkers(events: WestBankSourceItem[]): WestBankThreatMarker[] {
  return events
    .filter((event): event is WestBankSourceItem & { lat: number; lon: number } => event.lat != null && event.lon != null)
    .map((event, index) => ({
      id: event.id || `${event.sourceId}:${event.link || event.title}:${event.publishedAt}:${index}`,
      lat: event.lat,
      lon: event.lon,
      title: event.title,
      sourceName: event.sourceName,
      verification: event.verification,
      sourceCount: Math.max(1, event.sourceCount ?? 1),
      threatLevel: event.threatLevel ?? 'info',
      publishedAt: event.publishedAt,
      url: event.link,
      placeLabel: event.placeLabel,
      category: event.category,
      excerpt: event.excerpt,
    }));
}
