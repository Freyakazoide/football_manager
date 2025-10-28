export enum View {
    SQUAD = 'Squad',
    TACTICS = 'Tactics',
    COMPETITION = 'Competition',
    CALENDAR = 'Calendar',
    FINANCES = 'Finances',
    TRANSFERS = 'Transfers',
    NEWS = 'News',
}

export interface PlayerAttributes {
    // Technical
    passing: number;
    dribbling: number;
    shooting: number;
    tackling: number;
    heading: number;
    // Mental
    aggression: number;
    creativity: number;
    positioning: number;
    teamwork: number;
    workRate: number; // How hard the player works, affects stamina drain
    // Physical
    pace: number;
    stamina: number; // Determines rate of stamina drain
    strength: number;
    naturalFitness: number; // Affects stamina recovery
}

export interface Player {
    id: number;
    name: string;
    age: number;
    nationality: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    clubId: number;
    wage: number;
    contractExpires: Date;
    marketValue: number;
    attributes: PlayerAttributes;
    potential: number; // 1-100
}

export interface Club {
    id: number;
    name: string;
    country: string;
    reputation: number; // 1-100
    balance: number;
    tactics: Tactics;
}

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2';
export type Mentality = 'Defensive' | 'Balanced' | 'Offensive';

export interface Tactics {
    formation: Formation;
    mentality: Mentality;
    lineup: (number | null)[]; // Player IDs, 11 slots
    bench: (number | null)[]; // Player IDs, 7 slots
}

export interface Match {
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    date: Date;
    homeScore?: number;
    awayScore?: number;
}

export interface LeagueEntry {
    clubId: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalDifference: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
}

export interface MatchDayInfo {
    match: Match;
    homeTeam: Club;
    awayTeam: Club;
}

export interface TransferResult {
    success: boolean;
    message: string;
}

// Live Match Engine Types
export interface LivePlayer {
    id: number;
    name: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    attributes: PlayerAttributes;
    stamina: number; // Current stamina 0-100
    yellowCards: number;
    isSentOff: boolean;
}

export interface MatchEvent {
    minute: number;
    text: string;
    type: 'Goal' | 'Chance' | 'Foul' | 'Card' | 'Sub' | 'Info' | 'Highlight' | 'Tackle' | 'NearMiss' | 'YellowCard' | 'RedCard';
}

export interface LiveMatchState {
    matchId: number;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamName: string;
    awayTeamName: string;
    minute: number;
    homeScore: number;
    awayScore: number;
    homeLineup: LivePlayer[];
    awayLineup: LivePlayer[];
    homeBench: LivePlayer[];
    awayBench: LivePlayer[];
    homeSubsMade: number;
    awaySubsMade: number;
    log: MatchEvent[];
    isPaused: boolean;
    status: 'pre-match' | 'first-half' | 'half-time' | 'second-half' | 'extra-time' | 'full-time';
    homeMentality: Mentality;
    awayMentality: Mentality;
    refereeStrictness: number; // 0.5 (lenient) to 1.5 (strict)
}

export interface NewsItem {
    id: number;
    date: Date;
    type: 'match_summary_player' | 'round_summary' | 'transfer_completed';
    headline: string;
    content: string;
    relatedEntityId?: number; // e.g., match id, player id
    isRead: boolean;
}

export interface GameState {
    currentDate: Date;
    playerClubId: number | null;
    clubs: Record<number, Club>;
    players: Record<number, Player>;
    schedule: Match[];
    leagueTable: LeagueEntry[];
    playerMatch: MatchDayInfo | null;
    transferResult: TransferResult | null;
    liveMatch: LiveMatchState | null;
    news: NewsItem[];
    nextNewsId: number;
}