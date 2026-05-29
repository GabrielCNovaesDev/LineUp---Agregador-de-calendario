export interface ScrapedBroadcast {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  channels: string[];
  time: string;
}

const BASE_URL = 'https://www.torcedores.com/noticias/futebol/jogos-de-hoje';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class TorcedoresScraper {
  private readonly fetchImpl: typeof fetch;
  private readonly logger: Pick<Console, 'warn' | 'error'>;

  constructor(options: { fetchImpl?: typeof fetch; logger?: Pick<Console, 'warn' | 'error'> } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.logger = options.logger ?? console;
  }

  async fetchTodayBroadcasts(): Promise<ScrapedBroadcast[]> {
    try {
      const response = await this.fetchImpl(BASE_URL, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Torcedores scraper: HTTP ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parse(html);
    } catch (error) {
      this.logger.error('Torcedores scraper failed:', error);
      return [];
    }
  }

  private parse(html: string): ScrapedBroadcast[] {
    const results: ScrapedBroadcast[] = [];

    // Match game blocks: typically "HH:MM - Team A x Team B - Competition - Channel(s)"
    // or structured HTML with teams, time, competition, and broadcast info.
    const gamePattern =
      /(\d{1,2}[h:]\d{2})\s*[-–]\s*([^x×]+)\s*[x×]\s*([^-–\n]+)\s*[-–]\s*([^-–\n]+)\s*[-–]\s*([^\n<]+)/gi;

    let match: RegExpExecArray | null;

    while ((match = gamePattern.exec(html)) !== null) {
      const time = this.normalizeTime(match[1]?.trim() ?? '');
      const homeTeam = this.cleanText(match[2] ?? '');
      const awayTeam = this.cleanText(match[3] ?? '');
      const competition = this.cleanText(match[4] ?? '');
      const channelsRaw = this.cleanText(match[5] ?? '');

      if (!homeTeam || !awayTeam || !time) continue;

      const channels = channelsRaw
        .split(/[,/e]/)
        .map((ch) => ch.trim())
        .filter((ch) => ch.length > 0);

      results.push({
        homeTeam,
        awayTeam,
        competition,
        channels,
        time,
      });
    }

    // Fallback: try a simpler pattern for structured content
    if (results.length === 0) {
      const simplePattern =
        /(\d{1,2}[h:]\d{2})[^<]*?([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)*)\s*[x×]\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)*)/gi;

      while ((match = simplePattern.exec(html)) !== null) {
        const time = this.normalizeTime(match[1]?.trim() ?? '');
        const homeTeam = this.cleanText(match[2] ?? '');
        const awayTeam = this.cleanText(match[3] ?? '');

        if (!homeTeam || !awayTeam || !time) continue;

        results.push({
          homeTeam,
          awayTeam,
          competition: '',
          channels: [],
          time,
        });
      }
    }

    return results;
  }

  private normalizeTime(raw: string): string {
    return raw.replace('h', ':');
  }

  private cleanText(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }
}
