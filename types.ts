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

export type Mentality = 'Defensive' | 'Balanced' | 'Offensive';

// --- NEW TACTICS & INSTRUCTIONS SYSTEM ---
export type PlayerRole = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'LM' | 'RM' | 'AM' | 'LW' | 'RW' | 'ST';

export enum ShootingInstruction { Normal = 'Normal', ShootMoreOften = 'Shoot More Often', ShootLessOften = 'Shoot Less Often' }
export enum PassingInstruction { Normal = 'Normal', Shorter = 'Shorter Passes', Risky = 'More Risky Passes' }
export enum DribblingInstruction { Normal = 'Normal', DribbleMore = 'Dribble More', DribbleLess = 'Dribble Less' }
export enum CrossingInstruction { Normal = 'Normal', CrossMore = 'Cross More Often', CutInside = 'Cut Inside' }
export enum PositioningInstruction { Normal = 'Normal', GetForward = 'Get Further Forward', HoldPosition = 'Hold Position' }

export enum TacklingInstruction { Normal = 'Normal', Cautious = 'Tackle Cautiously', Harder = 'Tackle Harder' }
export enum PressingInstruction { Normal = 'Normal', Urgent = 'Press More Urgently' }
export enum MarkingInstruction { Normal = 'Normal', Tighter = 'Mark Tighter' }

export interface PlayerInstructions {
    // In Possession
    shooting: ShootingInstruction;
    passing: PassingInstruction;
    dribbling: DribblingInstruction;
    crossing: CrossingInstruction;
    positioning: PositioningInstruction;
    // Out of Possession
    tackling: TacklingInstruction;
    pressing: PressingInstruction;
    marking: MarkingInstruction;
}

export interface LineupPlayer {
    playerId: number;
    position: { x: number; y: number }; // 0-100 for both
    role: PlayerRole;
    instructions: PlayerInstructions;
}

export interface Tactics {
    mentality: Mentality;
    lineup: (LineupPlayer | null)[]; // Player objects, 11 slots
    bench: (number | null)[]; // Player IDs, 7 slots
}
// --- END NEW TACTICS SYSTEM ---


export interface PlayerMatchStats {
    shots: number;
    goals: number;
    assists: number;
    passes: number;
    keyPasses: number;
    tackles: number;
    dribbles: number;
    rating: number;
}


export interface MatchStats {
    shots: number;
    shotsOnTarget: number;
    possession: number; // Stored as a percentage
    tackles: number;
    passes: number;
    passAccuracy: number;
    fouls: number;
    corners: number;
    offsides: number;
    xG: number;
    bigChances: number;
}


export interface Match {
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    date: Date;
    homeScore?: number;
    awayScore?: number;
    homeStats?: MatchStats;
    awayStats?: MatchStats;
    log?: MatchEvent[];
    playerStats?: Record<number, PlayerMatchStats>; // Key is player ID
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
    role: PlayerRole;
    attributes: PlayerAttributes;
    stamina: number; // Current stamina 0-100
    yellowCards: number;
    isSentOff: boolean;
    stats: PlayerMatchStats;
    instructions: PlayerInstructions; // <-- NEW
    currentPosition: { x: number; y: number }; // <-- NEW
}

export interface MatchEvent {
    minute: number;
    text: string;
    type: 'Goal' | 'Chance' | 'Foul' | 'Card' | 'Sub' | 'Info' | 'Highlight' | 'Tackle' | 'NearMiss' | 'YellowCard' | 'RedCard' | 'Corner' | 'Offside' | 'LongShot' | 'OwnGoal';
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
    homeStats: MatchStats;
    awayStats: MatchStats;
    // Zone-based possession engine state
    attackingTeamId: number;
    ballCarrierId: number | null;
    ballZone: number; // 1-3 Def, 4-6 Mid, 7-9 Att (from home perspective)
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
    transferResult: TransferResult | null;
    liveMatch: LiveMatchState | null;
    news: NewsItem[];
    nextNewsId: number;
    // New state for handling match day flow
    matchDayFixtures: { playerMatch: MatchDayInfo; aiMatches: Match[] } | null;
    matchDayResults: { playerResult: Match; aiResults: Match[] } | null;
}