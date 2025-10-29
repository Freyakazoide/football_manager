// Enums
export enum View {
    SQUAD = 'Squad',
    TACTICS = 'Tactics',
    COMPETITION = 'Competition',
    CALENDAR = 'Calendar',
    FINANCES = 'Finances',
    TRANSFERS = 'Transfers',
    NEWS = 'News',
}

export type PlayerRole = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'DM' | 'CM' | 'LM' | 'RM' | 'AM' | 'LW' | 'RW' | 'ST' | 'CF';
export type Mentality = 'Defensive' | 'Balanced' | 'Offensive';

export enum ShootingInstruction { Normal = 'Normal', ShootMoreOften = 'Shoot More Often', ShootLessOften = 'Shoot Less Often' }
export enum PassingInstruction { Normal = 'Normal', Shorter = 'Shorter', Risky = 'Risky' }
export enum DribblingInstruction { Normal = 'Normal', DribbleMore = 'Dribble More', DribbleLess = 'Dribble Less' }
export enum CrossingInstruction { Normal = 'Normal', CrossMore = 'Cross More', CrossLess = 'Cross Less' }
export enum PositioningInstruction { Normal = 'Normal', GetForward = 'Get Forward', HoldPosition = 'Hold Position' }
export enum TacklingInstruction { Normal = 'Normal', Cautious = 'Cautious', Harder = 'Harder' }
export enum PressingInstruction { Normal = 'Normal', Urgent = 'Urgent', DropOff = 'Drop Off' }
export enum MarkingInstruction { Normal = 'Normal', Zonal = 'Zonal', ManMarking = 'Man Marking' }

// Interfaces & Types
export interface PlayerAttributes {
    passing: number; dribbling: number; shooting: number; tackling: number; heading: number;
    aggression: number; creativity: number; positioning: number; teamwork: number; workRate: number;
    pace: number; stamina: number; strength: number; naturalFitness: number;
}

export interface PlayerInstructions {
    shooting: ShootingInstruction; passing: PassingInstruction; dribbling: DribblingInstruction;
    crossing: CrossingInstruction; positioning: PositioningInstruction; tackling: TacklingInstruction;
    pressing: PressingInstruction; marking: MarkingInstruction;
}

export interface PlayerSeasonStats {
    season: string;
    clubId: number;
    apps: number;
    subOn: number;
    goals: number;
    assists: number;
    shots: number;
    tackles: number;
    ratingPoints: number; // Sum of all match ratings
}

export interface Player {
    id: number;
    clubId: number;
    name: string;
    age: number;
    nationality: string;
    naturalPosition: PlayerRole;
    positionalFamiliarity: Record<PlayerRole, number>;
    wage: number;
    contractExpires: Date;
    marketValue: number;
    potential: number;
    attributes: PlayerAttributes;
    history: PlayerSeasonStats[];
    morale: number; // 0-100
    satisfaction: number; // 0-100
    matchFitness: number; // 0-100
    injury: { type: string; returnDate: Date } | null;
    suspension: { returnDate: Date } | null;
    seasonYellowCards: number;
}

export interface LineupPlayer {
    playerId: number;
    position: { x: number; y: number };
    role: PlayerRole;
    instructions: PlayerInstructions;
}

export interface Tactics {
    mentality: Mentality;
    lineup: (LineupPlayer | null)[];
    bench: (number | null)[];
}

export interface Club {
    id: number;
    name: string;
    country: string;
    reputation: number;
    balance: number;
    tactics: Tactics;
}

export interface LeagueEntry {
    clubId: number; played: number; wins: number; draws: number; losses: number;
    goalsFor: number; goalsAgainst: number; goalDifference: number; points: number;
}

export interface PlayerMatchStats {
    shots: number; goals: number; assists: number; passes: number; keyPasses: number;
    tackles: number; dribbles: number; rating: number;
}

export interface MatchStats {
    shots: number; shotsOnTarget: number; possession: number; tackles: number; passes: number;
    passAccuracy: number; fouls: number; corners: number; offsides: number; xG: number; bigChances: number;
}

export interface MatchEvent {
    minute: number;
    text: string;
    type: 'Goal' | 'Sub' | 'Info' | 'Chance' | 'Corner' | 'Highlight' | 'Tackle' | 'Foul' | 'YellowCard' | 'RedCard' | 'Injury';
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
    playerStats?: Record<number, PlayerMatchStats>;
    homeLineup?: (LineupPlayer | null)[]; // For match report
    awayLineup?: (LineupPlayer | null)[]; // for match report
    disciplinaryEvents?: { playerId: number, type: 'yellow' | 'red' }[];
    injuryEvents?: { playerId: number, returnDate: Date }[];
}

export interface TransferResult {
    success: boolean;
    message: string;
}

export interface NewsItem {
    id: number;
    date: Date;
    headline: string;
    content: string;
    type: 'round_summary' | 'match_summary_player' | 'transfer_completed';
    relatedEntityId?: number;
    isRead: boolean;
}

export interface MatchDayInfo {
    match: Match;
    homeTeam: Club;
    awayTeam: Club;
}

export interface LivePlayer {
    id: number; name: string;
    attributes: PlayerAttributes;
    stamina: number;
    yellowCards: number;
    isSentOff: boolean;
    isInjured: boolean;
    stats: PlayerMatchStats;
    role: PlayerRole;
    instructions: PlayerInstructions;
    currentPosition: { x: number; y: number };
    positionalFamiliarity: Record<PlayerRole, number>;
    morale: number;
    matchFitness: number;
}

export interface LiveMatchState {
    matchId: number;
    homeTeamId: number; awayTeamId: number;
    homeTeamName: string; awayTeamName: string;
    minute: number;
    homeScore: number; awayScore: number;
    homeLineup: LivePlayer[]; awayLineup: LivePlayer[];
    homeBench: LivePlayer[]; awayBench: LivePlayer[];
    homeSubsMade: number; awaySubsMade: number;
    log: MatchEvent[];
    isPaused: boolean;
    status: 'pre-match' | 'first-half' | 'half-time' | 'second-half' | 'full-time';
    homeMentality: Mentality; awayMentality: Mentality;
    refereeStrictness: number;
    homeStats: MatchStats; awayStats: MatchStats;
    attackingTeamId: number;
    ballCarrierId: number | null;
    ballZone: number;
    homePossessionMinutes: number;
    awayPossessionMinutes: number;
    initialHomeLineupIds: number[];
    initialAwayLineupIds: number[];
    lastPasser: { teamId: number, playerId: number } | null;
    forcedSubstitution: {
        teamId: number;
        playerOutId: number;
        reason: 'injury' | 'red_card';
    } | null;
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
    matchDayFixtures: { playerMatch: MatchDayInfo; aiMatches: Match[] } | null;
    matchDayResults: { playerResult: Match; aiResults: Match[] } | null;
}