
// Enums
export enum View {
    SQUAD = 'Squad',
    TEAM = 'Team',
    TACTICS = 'Tactics',
    STAFF = 'Staff',
    COMPETITION = 'Competition',
    CALENDAR = 'Calendar',
    FINANCES = 'Finances',
    TRANSFERS = 'Transfers',
    NEWS = 'News',
    PLAYER_PROFILE = 'Player Profile',
    TRAINING = 'Training',
    SCOUTING = 'Scouting',
}

export type PlayerRole =
    // Goalkeeper
    | 'Goalkeeper' | 'Sweeper Keeper'
    // Defenders
    | 'Central Defender' | 'Ball-Playing Defender' | 'Full-Back' | 'Wing-Back' | 'Inverted Wing-Back' | 'Libero'
    // Midfielders
    | 'Defensive Midfielder' | 'Central Midfielder' | 'Ball Winning Midfielder' | 'Box-To-Box Midfielder'
    | 'Deep Lying Playmaker' | 'Roaming Playmaker' | 'Mezzala' | 'Carrilero' | 'Wide Midfielder' | 'Wide Playmaker'
    // Attacking Midfielders
    | 'Attacking Midfielder' | 'Advanced Playmaker' | 'Shadow Striker' | 'Trequartista' | 'False Nine'
    // Strikers
    | 'Striker' | 'Advanced Forward' | 'Complete Forward' | 'Poacher' | 'Deep-Lying Forward';

export type Mentality = 'Defensive' | 'Balanced' | 'Offensive';

export enum ShootingInstruction { Normal = 'Normal', ShootMoreOften = 'Shoot More Often', ShootLessOften = 'Shoot Less Often' }
export enum PassingInstruction { Normal = 'Normal', Shorter = 'Shorter', Risky = 'Risky' }
export enum DribblingInstruction { Normal = 'Normal', DribbleMore = 'Dribble More', DribbleLess = 'Dribble Less' }
export enum CrossingInstruction { Normal = 'Normal', CrossMore = 'Cross More', CrossLess = 'Cross Less' }
export enum PositioningInstruction { Normal = 'Normal', GetForward = 'Get Forward', HoldPosition = 'Hold Position' }
export enum TacklingInstruction { Normal = 'Normal', Cautious = 'Cautious', Harder = 'Harder' }
export enum PressingInstruction { Normal = 'Normal', Urgent = 'Urgent', DropOff = 'Drop Off' }
export enum MarkingInstruction { Normal = 'Normal', Zonal = 'Zonal', ManMarking = 'Man Marking' }

// Staff Types
export enum StaffRole {
    Assistant = 'Assistant Manager',
    Scout = 'Scout',
    Physio = 'Physiotherapist',
}

export interface AssistantAttributes {
    tacticalKnowledge: number;
    judgingPlayerAbility: number;
    manManagement: number;
}

export interface ScoutAttributes {
    judgingPlayerAbility: number;
    judgingPlayerPotential: number;
    adaptability: number;
}

export interface PhysioAttributes {
    physiotherapy: number;
    injuryPrevention: number;
}

export type StaffAttributes = AssistantAttributes | ScoutAttributes | PhysioAttributes;

export interface Staff {
    id: number;
    clubId: number | null; // null if unemployed
    name: string;
    age: number;
    nationality: string;
    role: StaffRole;
    wage: number;
    contractExpires: Date;
    attributes: StaffAttributes;
}


// Interfaces & Types
export interface PlayerAttributes {
    passing: number; dribbling: number; shooting: number; tackling: number; heading: number;
    crossing: number;
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
    dribbles: number;
    redCards: number;
    ratingPoints: number; // Sum of all match ratings
}

export type IndividualTrainingFocus = { type: 'attribute', attribute: keyof PlayerAttributes } | { type: 'role', role: PlayerRole } | null;


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
    scoutedAttributes: Partial<PlayerAttributes>; // Revealed attributes
    scoutedPotentialRange: [number, number] | null;
    history: PlayerSeasonStats[];
    morale: number; // 0-100
    satisfaction: number; // 0-100
    matchFitness: number; // 0-100
    injury: { type: string; returnDate: Date } | null;
    suspension: { returnDate: Date } | null;
    seasonYellowCards: number;
    promise?: { type: 'playing_time', deadline: Date } | null;
    lastInteractionDate?: Date | null;
    individualTrainingFocus: IndividualTrainingFocus;
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

export type TeamTrainingFocus = 'Balanced' | 'Attacking' | 'Defending' | 'Tactical' | 'Physical' | 'Set Pieces';

export interface Club {
    id: number;
    name: string;
    country: string;
    reputation: number;
    balance: number;
    tactics: Tactics;
    trainingFocus: TeamTrainingFocus;
    staffIds: {
        assistant: number | null;
        physios: number[];
        scouts: number[];
    };
    competitionId: number;
}

export interface Competition {
    id: number;
    name: string;
    level: number; // e.g., 1 for top division, 2 for second
}

export interface LeagueEntry {
    clubId: number; played: number; wins: number; draws: number; losses: number;
    goalsFor: number; goalsAgainst: number; goalDifference: number; points: number;
}

export interface PlayerMatchStats {
    shots: number; goals: number; assists: number; keyPasses: number; passes: number;
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
    primaryPlayerId?: number;
    secondaryPlayerId?: number;
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
    injuryEvents?: { playerId: number, type: string, returnDate: Date }[];
}

export interface NewsItem {
    id: number;
    date: Date;
    headline: string;
    content: string;
    type: 'round_summary' | 'match_summary_player' | 'transfer_completed' | 'injury_report_player' | 'suspension_report_player' | 'promise_broken' | 'interaction_praise' | 'interaction_criticize' | 'interaction_promise' | 'scouting_report_ready';
    relatedEntityId?: number;
    isRead: boolean;
    matchStatsSummary?: Match;
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
    yellowCardCount: number;
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
    initialHomeLineup?: (LineupPlayer | null)[];
    initialAwayLineup?: (LineupPlayer | null)[];
    lastPasser: { teamId: number, playerId: number } | null;
    forcedSubstitution: {
        teamId: number;
        playerOutId: number;
        reason: 'injury' | 'red_card';
    } | null;
    injuredPlayerIds: number[];
}

export type ScoutingFilters = {
    minAge?: number;
    maxAge?: number;
    position?: 'GK' | 'DEF' | 'MID' | 'FWD';
    minPotential?: number;
    attributes?: Partial<Record<keyof PlayerAttributes, number>>;
    name?: string;
};

export interface ScoutingAssignment {
    id: number;
    scoutId: number;
    description: string;
    filters: ScoutingFilters;
    completionDate: Date;
    isComplete: boolean;
    reportPlayerIds: number[];
}

export interface SeasonReviewData {
    season: string;
    finalTable: LeagueEntry[];
    leagueWinnerId: number;
    promotedClubIds: number[];
    relegatedClubIds: number[];
    awards: {
        playerOfTheSeason: Player;
        topScorer: Player & { goals: number };
        youngPlayer: Player;
    };
    prizeMoney: number;
}

// --- NEW TRANSFER SYSTEM TYPES ---

export interface TransferOffer {
    fee: number;
    sellOnPercentage?: number;
    // For AI counter offers
    playerToSwapId?: number; 
}

export interface ContractOffer {
    wage: number;
    signingBonus: number;
    goalBonus: number;
    releaseClause?: number;
}

export interface TransferNegotiation {
    id: number;
    playerId: number;
    sellingClubId: number;
    buyingClubId: number;
    stage: 'club' | 'agent';
    // player_turn: player needs to make an offer or accept/reject counter
    // ai_turn: AI is considering player's offer
    // club_agreed: move to agent stage
    status: 'player_turn' | 'ai_turn' | 'club_agreed' | 'completed' | 'cancelled_player' | 'cancelled_ai';
    lastOfferBy: 'player' | 'ai';
    clubOfferHistory: { offer: TransferOffer, by: 'player' | 'ai' }[];
    agentOfferHistory: { offer: ContractOffer, by: 'player' | 'ai' }[];
    agreedFee: number;
}


export interface GameState {
    currentDate: Date;
    playerClubId: number | null;
    clubs: Record<number, Club>;
    players: Record<number, Player>;
    staff: Record<number, Staff>;
    competitions: Record<number, Competition>;
    schedule: Match[];
    leagueTable: LeagueEntry[];
    liveMatch: LiveMatchState | null;
    news: NewsItem[];
    nextNewsId: number;
    matchDayFixtures: { playerMatch: MatchDayInfo; aiMatches: Match[] } | null;
    matchDayResults: { playerResult: Match; aiResults: Match[] } | null;
    matchStartError: string | null;
    scoutingAssignments: ScoutingAssignment[];
    nextScoutAssignmentId: number;
    seasonReviewData: SeasonReviewData | null;
    transferNegotiations: Record<number, TransferNegotiation>;
    nextNegotiationId: number;
}

// FIX: Add missing TransferResult type used by TransferResultModal.
export interface TransferResult {
    success: boolean;
    message: string;
}
