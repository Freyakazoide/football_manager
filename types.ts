// Enums
export enum View {
    SQUAD = 'Elenco',
    TEAM = 'Time',
    TACTICS = 'Táticas',
    STAFF = 'Equipe Técnica',
    BOARD = 'Diretoria',
    ACADEMY = 'Base',
    COMPETITION = 'Competição',
    CALENDAR = 'Calendário',
    FINANCES = 'Finanças',
    TRANSFERS = 'Transferências',
    NEWS = 'Notícias',
    PLAYER_PROFILE = 'Perfil do Jogador',
    TRAINING = 'Treino',
    SCOUTING = 'Observação',
}

export type PlayerRole =
    // Goleiro
    | 'Goleiro' | 'Goleiro Líbero'
    // Defensores
    | 'Zagueiro' | 'Zagueiro com Passe' | 'Lateral' | 'Ala' | 'Lateral Invertido' | 'Líbero'
    // Meio-campistas
    | 'Volante' | 'Meio-campista' | 'Volante Ladrão de Bolas' | 'Meia Box-to-Box'
    | 'Construtor de Jogo Recuado' | 'Meia Itinerante' | 'Mezzala' | 'Carrilero' | 'Meia Aberto' | 'Armador Aberto'
    // Meias Atacantes
    | 'Meia Atacante' | 'Armador Avançado' | 'Atacante Sombra' | 'Trequartista' | 'Falso Nove'
    // Atacantes
    | 'Atacante' | 'Atacante Avançado' | 'Atacante Completo' | 'Finalizador' | 'Atacante Recuado';

export type Mentality = 'Defensiva' | 'Equilibrada' | 'Ofensiva';

export enum ShootingInstruction { Normal = 'Normal', ShootMoreOften = 'Chutar Mais Vezes', ShootLessOften = 'Chutar Menos Vezes' }
export enum PassingInstruction { Normal = 'Normal', Shorter = 'Mais Curtos', Risky = 'Passes de Risco' }
export enum DribblingInstruction { Normal = 'Normal', DribbleMore = 'Driblar Mais', DribbleLess = 'Driblar Menos' }
export enum CrossingInstruction { Normal = 'Normal', CrossMore = 'Cruzar Mais', CrossLess = 'Cruzar Menos' }
export enum PositioningInstruction { Normal = 'Normal', GetForward = 'Avançar Mais', HoldPosition = 'Manter Posição' }
export enum TacklingInstruction { Normal = 'Normal', Cautious = 'Com Cautela', Harder = 'Mais Forte' }
export enum PressingInstruction { Normal = 'Normal', Urgent = 'Urgente', DropOff = 'Recuar' }
export enum MarkingInstruction { Normal = 'Normal', Zonal = 'Marcação por Zona', ManMarking = 'Marcação Individual' }

// --- NEW STAFF SYSTEM ---

export enum DepartmentType {
    Coaching = 'Treinamento',
    Medical = 'Médico',
    Scouting = 'Observação',
    Performance = 'Performance',
}

export enum StaffRole {
    AssistantManager = 'Auxiliar Técnico',
    HeadOfPhysiotherapy = 'Chefe de Fisioterapia',
    HeadOfScouting = 'Chefe de Observação',
    HeadOfPerformance = 'Chefe de Performance',
    Coach = 'Treinador',
}

export interface AssistantManagerAttributes {
    tacticalKnowledge: number;
    judgingPlayerAbility: number;
    manManagement: number;
}

export interface HeadOfPhysiotherapyAttributes {
    physiotherapy: number;
    injuryPrevention: number;
    sportsScience: number;
}

export interface HeadOfScoutingAttributes {
    judgingPlayerAbility: number;
    judgingPlayerPotential: number;
    reach: number;
}

export interface HeadOfPerformanceAttributes {
    fitnessCoaching: number;
    loadManagement: number;
}

export interface CoachingAttributes {
    attacking: number;
    defending: number;
    possession: number;
    fitness: number;
    goalkeeping: number;
    workingWithYoungsters: number;
}

export type StaffAttributes = AssistantManagerAttributes | HeadOfPhysiotherapyAttributes | HeadOfScoutingAttributes | HeadOfPerformanceAttributes | CoachingAttributes;

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

export interface StaffDepartment {
    level: number; // 1-5
    chiefId: number | null;
    coachIds?: number[]; // Only for Coaching department
}

// --- END NEW STAFF SYSTEM ---

// --- NEW BANKING & LOAN TYPES ---
export interface Bank {
    id: number;
    name: string;
    tier: 'Investimento Global' | 'Comercial Nacional' | 'Regional' | 'Cooperativa de Crédito';
    minReputation: number;
    maxLoanAmount: number;
    interestRateRange: [number, number]; // [min, max] percentage
    termMonthsRange: [number, number]; // [min, max] months
}

export interface Loan {
    id: number;
    bankId: number;
    clubId: number;
    principal: number;
    remainingBalance: number;
    monthlyRepayment: number;
    interestRate: number;
    termMonths: number;
    monthsRemaining: number;
    startDate: Date;
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

export type SquadStatus = 'Titular' | 'Rodízio' | 'Rotação' | 'Jovem Promessa' | 'Excedente' | 'Base';

// --- NEW CONCERN/PROMISE SYSTEM ---
export type PlayerConcernType = 'playing_time' | 'new_contract' | 'squad_status' | 'new_challenge' | 'team_performance' | 'position_reinforcement' | 'unhappy_with_criticism' | 'training_level' | 'broken_promise' | 'wants_to_be_starter';

export interface PlayerConcern {
    type: PlayerConcernType;
    startDate: Date;
}

export type PromiseType =
    | 'playing_time'
    | 'discipline_warning'
    | 'season_target'
    | 'will_strengthen_position'
    | 'will_offer_new_contract'
    | 'will_improve_squad_status'
    | 'will_win_trophy'
    | 'will_improve_training'
    | 'will_let_leave'
    | 'will_be_patient'
    | 'will_be_starter';

export interface PlayerPromise {
    type: PromiseType;
    deadline: Date;
    targetMetric?: 'goals' | 'assists' | 'avg_rating';
    targetValue?: number;
    positionToStrengthen?: 'GK' | 'DEF' | 'MID' | 'FWD';
}
// --- END NEW CONCERN/PROMISE SYSTEM ---


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
    scoutedAttributes: Partial<PlayerAttributes>;
    scoutedPotentialRange: [number, number] | null;
    history: PlayerSeasonStats[];
    morale: number; // 0-100
    satisfaction: number; // 0-100
    matchFitness: number; // 0-100
    injury: { type: string; returnDate: Date; startDate: Date; } | null;
    suspension: { returnDate: Date } | null;
    seasonYellowCards: number;
    promise: PlayerPromise | null;
    individualTrainingFocus: IndividualTrainingFocus;
    squadStatus: SquadStatus;
    isTransferListed?: boolean;
    askingPrice?: number;

    // --- NEW/UPDATED Player properties ---
    lastRenewalDate?: Date; // Cooldown for new negotiations
    interactions: { topic: string, date: Date }[]; // For interaction cooldowns
    attributeChanges: { date: Date, attr: keyof PlayerAttributes, change: number }[]; // For training feedback
    onLoan?: { fromClubId: number; until: Date; wageContribution: number };
    concern: PlayerConcern | null;
    
    // --- NEW MENTORING SYSTEM ---
    mentorId?: number | null;
    menteeIds?: number[];
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

export type TeamTrainingFocus = 'Equilibrado' | 'Ofensivo' | 'Defensivo' | 'Tático' | 'Físico' | 'Bolas Paradas';
export type SecondaryTrainingFocus = 'Nenhum' | 'Bolas Paradas de Ataque' | 'Bolas Paradas de Defesa' | 'Contra-Ataque' | 'Pressão Alta';


export type ClubPhilosophy =
    | { type: 'sign_young_players'; description: string; parameters: { maxAge: number } }
    | { type: 'play_attacking_football'; description: string; }
    | { type: 'develop_youth'; description: string; }
    | { type: 'sign_high_reputation'; description: string; parameters: { minReputation: number } };

// --- NEW BOARD REQUESTS ---
export enum BoardRequestType {
    INCREASE_TRANSFER_BUDGET = 'Aumentar Orçamento de Transferência',
    INCREASE_WAGE_BUDGET = 'Aumentar Orçamento de Salários',
    INVEST_IN_YOUTH_SETUP = 'Investir na Estrutura de Base',
    UPGRADE_TRAINING_FACILITIES = 'Melhorar Instalações de Treino',
    UPGRADE_MEDICAL_DEPARTMENT = 'Melhorar Departamento Médico',
    EXPAND_SCOUTING_NETWORK = 'Expandir Rede de Observação',
    IMPROVE_PERFORMANCE_ANALYSIS = 'Melhorar Análise de Desempenho',
    EXPAND_STADIUM_CAPACITY = 'Expandir Capacidade do Estádio',
    RELAY_PITCH = 'Reformar o Gramado',
    SEARCH_FOR_AFFILIATE_CLUB = 'Procurar Clube Afiliado',
    SEARCH_FOR_PARENT_CLUB = 'Procurar Clube Parceiro',
    REQUEST_MORE_TIME = 'Pedir Mais Tempo',
    PRAISE_BOARD = 'Elogiar a Diretoria',
    CHANGE_CLUB_PHILOSOPHY = 'Mudar Filosofia do Clube',
    IMPROVE_CLUB_REPUTATION = 'Melhorar Reputação do Clube',
}

export interface BoardRequest {
    type: BoardRequestType;
    title: string;
    description: string;
    cost: number;
    cooldownMonths: number;
    requirements: {
        minConfidence?: number;
        minReputation?: number;
        minBalance?: number;
    };
}

export interface Club {
    id: number;
    name: string;
    country: string;
    reputation: number;
    // FIX: Add missing competitionId property.
    competitionId: number;
    balance: number;
    transferBudget: number;
    wageBudget: number;
    tactics: Tactics;
    weeklyTrainingFocus: {
        primary: TeamTrainingFocus;
        secondary: SecondaryTrainingFocus;
    };
    departments: Record<DepartmentType, StaffDepartment>;
    managerConfidence: number; // 0-100
    boardObjective: { type: 'league_finish', position: number, description: string } | null;
    philosophies: ClubPhilosophy[];
    // --- NEW FINANCIAL HISTORY ---
    creditScore: number; // 0-100, affects interest rates
    loanHistory: { bankId: number, outcome: 'paid_off' | 'defaulted', amount: number, date: Date }[];
    // --- NEW BOARD REQUESTS ---
    boardRequestCooldowns: Partial<Record<BoardRequestType, Date>>;
    requestsThisMonth: { month: number, year: number, count: number };
    // --- NEW TEAM COHESION ---
    teamCohesion: number; // 0-100
    lastLineup: number[]; // Array of player IDs from last month
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
    injuryEvents?: { playerId: number, type: string, returnDate: Date, startDate: Date }[];
}

export interface NewsItem {
    id: number;
    date: Date;
    headline: string;
    content: string;
    type: 'round_summary' | 'match_summary_player' | 'transfer_completed' | 'injury_report_player' | 'suspension_report_player' | 'promise_broken' | 'interaction_praise' | 'interaction_criticize' | 'interaction_promise' | 'scouting_report_ready' | 'training_report' | 'youth_player_promoted' | 'transfer_offer_received' | 'transfer_deal_collapsed' | 'board_report' | 'loan_update' | 'board_request_response' | 'loan_deal_completed' | 'player_concern';
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
    ball: { x: number; y: number; z: number, possession: 'home' | 'away' | null, lastTouchedBy: number | null };
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
    playerTeamId: number;
    isKeyPassOpportunity: boolean;
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
    homeCohesion: number;
    awayCohesion: number;
}

export type ScoutingFilters = {
    minAge?: number;
    maxAge?: number;
    position?: 'GK' | 'DEF' | 'MID' | 'FWD';
    minPotential?: number;
    attributes?: Partial<Record<keyof PlayerAttributes, number>>;
    name?: string;
    contractExpiresInYears?: number; // For bargain hunter
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

// FIX: Add missing TransferResult interface for the TransferResultModal component.
export interface TransferResult {
    success: boolean;
    message: string;
}

export interface TransferOffer {
    fee: number;
    sellOnPercentage?: number;
    // For AI counter offers
    playerToSwapId?: number; 
}

export interface LoanOffer {
    loanFee: number;
    wageContribution: number; // Percentage 0-100
    futureBuyOption?: number;
}

export interface ContractOffer {
    wage: number;
    signingBonus: number;
    durationYears: number;
    releaseClause?: number;

    // --- NEW CLAUSES ---
    // Performance Bonuses
    appearanceBonus?: number;
    goalBonus?: number;
    cleanSheetBonus?: number;
    
    // Achievement Bonuses
    leagueTitleBonus?: number;
    continentalQualificationBonus?: number;
    relegationSurvivalBonus?: number;

    // Contract Clauses
    loyaltyBonus?: number;
    annualSalaryIncrease?: number; // As a percentage
    relegationReleaseClause?: number;
    highestEarnerClause?: boolean;
    playerPercentageOfNextSale?: number; // As a percentage
    
    // Future Options
    clubExtensionOption?: number; // years
    playerExtensionOption?: number; // years
}

export interface TransferNegotiation {
    id: number;
    playerId: number;
    type: 'transfer' | 'loan' | 'renewal';
    sellingClubId: number;
    buyingClubId: number;
    stage: 'club' | 'agent';
    // player_turn: player needs to make an offer or accept/reject counter
    // ai_turn: AI is considering player's offer
    // club_agreed: move to agent stage
    status: 'player_turn' | 'ai_turn' | 'completed' | 'cancelled_player' | 'cancelled_ai';
    lastOfferBy: 'player' | 'ai';
    clubOfferHistory: { offer: TransferOffer | LoanOffer, by: 'player' | 'ai' }[];
    agentOfferHistory: { offer: ContractOffer, by: 'player' | 'ai' }[];
    agreedFee: number; // Used for transfer fee or loan fee
}

// --- NEW SPONSORSHIP TYPES ---
export type SponsorType = 'Camisa Principal' | 'Fornecedor de Material' | 'Direitos do Estádio' | 'CT';

export type SponsorGuideline =
    | { type: 'min_reputation', value: number }
    | { type: 'max_reputation', value: number }
    | { type: 'country', value: string }
    | { type: 'prefers_champions' }
    | { type: 'prefers_underdogs' };

export interface Sponsor {
    id: number;
    name: string;
    tier: 1 | 2 | 3 | 4; // 1 = Global, 4 = Local
    guidelines: SponsorGuideline[];
    baseAnnualValue: [number, number]; // min/max range
    preferredType: SponsorType;
}

export interface SponsorshipDeal {
    sponsorId: number;
    clubId: number;
    type: SponsorType;
    annualValue: number;
    expires: Date;
}

export interface AssistantSuggestion {
    title: string;
    justification: string;
    recommendedPrimaryFocus: TeamTrainingFocus;
    recommendedSecondaryFocus: SecondaryTrainingFocus;
    individualFocus?: {
        playerId: number;
        playerName: string;
        focus: IndividualTrainingFocus;
    };
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
    sponsors: Record<number, Sponsor>;
    sponsorshipDeals: SponsorshipDeal[];
    shortlist: number[];
    // --- NEW BANKING STATE ---
    banks: Record<number, Bank>;
    loans: Loan[];
    nextLoanId: number;
}
