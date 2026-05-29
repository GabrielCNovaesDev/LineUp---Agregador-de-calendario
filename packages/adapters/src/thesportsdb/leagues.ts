/**
 * Registry of TheSportsDB league IDs mapped by slug.
 * Source: https://www.thesportsdb.com/api/v1/json/{key}/all_leagues.php
 */
export const LEAGUE_IDS: Record<string, string> = {
  // football
  "brasileirao-a": "4351",
  "brasileirao-b": "4404",
  "champions-league": "4480",
  "premier-league": "4328",
  "la-liga": "4335",
  "copa-do-brasil": "4482",
  "libertadores": "4350",
  "copa-america": "4497",
  // motorsport
  "f1": "4370",
  "motogp": "4407",
  "wec": "4431",
  "formula-e": "4468",
  "indycar": "4373",
  "stock-car": "4776",
  // mma
  "ufc": "4443",
  "bellator": "4540",
  "pfl": "4917",
  // boxing
  "boxing-wbc": "4461",
  "boxing-wba": "4462",
  // basketball
  "nba": "4387",
  "nbb": "4777",
  "euroleague": "4516",
  // tennis
  "atp-tour": "4464",
  "wta-tour": "4465",
  // volleyball
  "superliga-volei": "4778",
  "vnl": "4779",
  // american-football
  "nfl": "4391",
  "college-football": "4479",
  // cycling
  "tour-de-france": "4469",
  "giro-italia": "4470",
  "vuelta-espana": "4471",
  // rugby
  "six-nations": "4456",
  "rugby-world-cup": "4455",
  // esports
  "lol-worlds": "4780",
  "cs2-major": "4781",
  "valorant-champions": "4782",
  // surfing
  "wsl-championship": "4783",
  "wsl-big-wave": "4784",
  // ice-hockey
  "nhl": "4380",
  "khl": "4518",
  // golf
  "pga-tour": "4401",
  "masters": "4785",
  // strength-sports
  "crossfit-games": "4786",
  "worlds-strongest-man": "4787",
  // kickboxing
  "glory-kickboxing": "4788",
  "one-championship-kb": "4789",
  // grappling
  "adcc": "4790",
  "ibjjf": "4791",
};

export function getLeagueId(slug: string): string | undefined {
  return LEAGUE_IDS[slug];
}

export function getSupportedSlugs(): string[] {
  return Object.keys(LEAGUE_IDS);
}
