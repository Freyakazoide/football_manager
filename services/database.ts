

import { GameState, Club, Player, PlayerAttributes, Match, LeagueEntry, LineupPlayer, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, CrossingInstruction, PositioningInstruction, TacklingInstruction, PressingInstruction, MarkingInstruction, PlayerRole, Tactics, Staff, StaffRole, StaffAttributes, AssistantManagerAttributes, HeadOfScoutingAttributes, HeadOfPhysiotherapyAttributes, HeadOfPerformanceAttributes, Competition, DepartmentType, Sponsor, SponsorshipDeal, ClubPhilosophy, Bank, SquadStatus } from '../types';
import { SPONSOR_DATA } from './sponsors';

const FIRST_NAMES = ['John', 'Paul', 'Mike', 'Leo', 'Chris', 'David', 'Alex', 'Ben', 'Sam', 'Tom', 'Dan', 'Matt'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Martin'];
const STAFF_FIRST_NAMES = ['Peter', 'Richard', 'Gary', 'Steve', 'Mark', 'Alan', 'Neil', 'Brian'];
const STAFF_LAST_NAMES = ['Taylor', 'Wright', 'Thompson', 'Roberts', 'Walker', 'Harris', 'Clarke', 'King'];
const COUNTRIES = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Brazil', 'Argentina'];
const CLUB_NAMES = ['United', 'Rovers', 'City', 'Wanderers', 'Athletic', 'FC', 'Albion', 'Town'];
const CITIES = ['Northwood', 'Southglen', 'Easton', 'Westfield', 'Oakhaven', 'Riverdale', 'Mountview', 'Portsmith', 'Fairview', 'Lakeside', 'Bridgewater', 'Silverstone'];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- NEW BANK DATA ---
export const BANK_DATA: Bank[] = [
    // FIX: Changed bank tiers from English to Portuguese to match the 'Bank' type definition.
    { id: 1, name: "Stellar Bank Global", tier: 'Investimento Global', minReputation: 85, maxLoanAmount: 50_000_000, interestRateRange: [2.0, 4.5], termMonthsRange: [24, 60] },
    { id: 2, name: "Quantum Finance Group", tier: 'Investimento Global', minReputation: 80, maxLoanAmount: 40_000_000, interestRateRange: [2.5, 5.0], termMonthsRange: [24, 48] },
    { id: 3, name: "Heritage National Bank", tier: 'Comercial Nacional', minReputation: 65, maxLoanAmount: 15_000_000, interestRateRange: [4.0, 7.5], termMonthsRange: [12, 36] },
    { id: 4, name: "Pinnacle Corporate Lending", tier: 'Comercial Nacional', minReputation: 60, maxLoanAmount: 10_000_000, interestRateRange: [5.0, 8.5], termMonthsRange: [12, 36] },
    { id: 5, name: "Oakstead Regional Trust", tier: 'Regional', minReputation: 45, maxLoanAmount: 5_000_000, interestRateRange: [7.0, 11.0], termMonthsRange: [6, 24] },
    { id: 6, name: "Community First Credit Union", tier: 'Cooperativa de Crédito', minReputation: 0, maxLoanAmount: 1_000_000, interestRateRange: [10.0, 15.0], termMonthsRange: [6, 18] },
];

// --- NEW POSITIONAL FAMILIARITY LOGIC ---

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
export const ALL_ROLES: PlayerRole[] = [
    'Goleiro', 'Goleiro Líbero', 'Zagueiro', 'Zagueiro com Passe', 'Lateral', 'Ala', 'Lateral Invertido', 'Líbero',
    'Volante', 'Meio-campista', 'Volante Ladrão de Bolas', 'Meia Box-to-Box', 'Construtor de Jogo Recuado', 'Meia Itinerante',
    'Mezzala', 'Carrilero', 'Meia Aberto', 'Armador Aberto', 'Meia Atacante', 'Armador Avançado', 'Atacante Sombra',
    'Trequartista', 'Falso Nove', 'Atacante', 'Atacante Avançado', 'Atacante Completo', 'Finalizador', 'Atacante Recuado'
];

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
export const ROLE_DEFINITIONS: Record<PlayerRole, { category: 'GK' | 'DEF' | 'MID' | 'FWD' }> = {
    'Goleiro': { category: 'GK' }, 'Goleiro Líbero': { category: 'GK' },
    'Zagueiro': { category: 'DEF' }, 'Zagueiro com Passe': { category: 'DEF' }, 'Líbero': { category: 'DEF' },
    'Lateral': { category: 'DEF' }, 'Ala': { category: 'DEF' }, 'Lateral Invertido': { category: 'DEF' },
    'Volante': { category: 'MID' }, 'Meio-campista': { category: 'MID' }, 'Volante Ladrão de Bolas': { category: 'MID' },
    'Meia Box-to-Box': { category: 'MID' }, 'Construtor de Jogo Recuado': { category: 'MID' }, 'Meia Itinerante': { category: 'MID' },
    'Mezzala': { category: 'MID' }, 'Carrilero': { category: 'MID' }, 'Meia Aberto': { category: 'MID' }, 'Armador Aberto': { category: 'MID' },
    'Meia Atacante': { category: 'FWD' }, 'Armador Avançado': { category: 'FWD' }, 'Atacante Sombra': { category: 'FWD' },
    'Trequartista': { category: 'FWD' }, 'Falso Nove': { category: 'FWD' },
    'Atacante': { category: 'FWD' }, 'Atacante Avançado': { category: 'FWD' }, 'Atacante Completo': { category: 'FWD' },
    'Finalizador': { category: 'FWD' }, 'Atacante Recuado': { category: 'FWD' },
};

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
export const ROLE_TO_POSITION_MAP: Record<PlayerRole, { x: number; y: number }> = {
    // GK
    'Goleiro': { x: 50, y: 95 }, 'Goleiro Líbero': { x: 50, y: 90 },
    // DEF
    'Líbero': { x: 50, y: 82 }, 'Zagueiro': { x: 50, y: 78 }, 'Zagueiro com Passe': { x: 50, y: 78 },
    'Lateral': { x: 18, y: 75 },
    'Ala': { x: 15, y: 65 },
    'Lateral Invertido': { x: 25, y: 68 },
    // MID
    'Volante': { x: 50, y: 65 },
    'Construtor de Jogo Recuado': { x: 50, y: 62 },
    'Volante Ladrão de Bolas': { x: 50, y: 58 },
    'Carrilero': { x: 35, y: 55 },
    'Meio-campista': { x: 50, y: 55 },
    'Meia Box-to-Box': { x: 50, y: 50 },
    'Meia Itinerante': { x: 50, y: 48 },
    'Mezzala': { x: 35, y: 45 },
    'Meia Aberto': { x: 15, y: 50 },
    'Armador Aberto': { x: 20, y: 45 },
    // AM
    'Meia Atacante': { x: 50, y: 38 },
    'Armador Avançado': { x: 50, y: 35 },
    'Trequartista': { x: 50, y: 30 },
    'Atacante Sombra': { x: 50, y: 25 },
    // FWD
    'Falso Nove': { x: 50, y: 22 },
    'Atacante Recuado': { x: 50, y: 18 },
    'Finalizador': { x: 50, y: 12 },
    'Atacante Avançado': { x: 50, y: 10 },
    'Atacante': { x: 50, y: 15 },
    'Atacante Completo': { x: 50, y: 15 },
};


// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
const FAMILIARITY_MAP: Record<PlayerRole, Partial<Record<PlayerRole, number>>> = {
    // GK Group
    'Goleiro': { 'Goleiro': 100, 'Goleiro Líbero': 85 },
    'Goleiro Líbero': { 'Goleiro Líbero': 100, 'Goleiro': 85, 'Líbero': 50 },

    // DEF Group
    'Zagueiro': { 'Zagueiro': 100, 'Zagueiro com Passe': 90, 'Líbero': 70, 'Volante': 60, 'Lateral': 50 },
    'Zagueiro com Passe': { 'Zagueiro com Passe': 100, 'Zagueiro': 90, 'Líbero': 75, 'Volante': 65, 'Construtor de Jogo Recuado': 50 },
    'Líbero': { 'Líbero': 100, 'Zagueiro': 80, 'Volante': 70, 'Goleiro Líbero': 60 },
    'Lateral': { 'Lateral': 100, 'Ala': 90, 'Lateral Invertido': 80, 'Meia Aberto': 65, 'Zagueiro': 50 },
    'Ala': { 'Ala': 100, 'Lateral': 90, 'Meia Aberto': 80, 'Lateral Invertido': 70 },
    'Lateral Invertido': { 'Lateral Invertido': 100, 'Lateral': 85, 'Volante': 70, 'Meio-campista': 60, 'Ala': 70 },
    
    // MID Group
    'Volante': { 'Volante': 100, 'Construtor de Jogo Recuado': 85, 'Volante Ladrão de Bolas': 85, 'Meio-campista': 80, 'Zagueiro': 70 },
    'Meio-campista': { 'Meio-campista': 100, 'Meia Box-to-Box': 90, 'Mezzala': 85, 'Carrilero': 85, 'Meia Itinerante': 85, 'Volante': 80, 'Meia Atacante': 80 },
    'Volante Ladrão de Bolas': { 'Volante Ladrão de Bolas': 100, 'Volante': 90, 'Meio-campista': 85, 'Carrilero': 75 },
    'Meia Box-to-Box': { 'Meia Box-to-Box': 100, 'Meio-campista': 90, 'Meia Itinerante': 80, 'Mezzala': 75, 'Carrilero': 70 },
    'Construtor de Jogo Recuado': { 'Construtor de Jogo Recuado': 100, 'Volante': 90, 'Meio-campista': 80, 'Meia Itinerante': 70, 'Armador Avançado': 60 },
    'Meia Itinerante': { 'Meia Itinerante': 100, 'Meio-campista': 85, 'Mezzala': 80, 'Armador Avançado': 80, 'Meia Box-to-Box': 75 },
    'Mezzala': { 'Mezzala': 100, 'Meio-campista': 85, 'Meia Atacante': 80, 'Meia Itinerante': 80, 'Meia Aberto': 65 },
    'Carrilero': { 'Carrilero': 100, 'Meio-campista': 85, 'Volante Ladrão de Bolas': 80, 'Meia Box-to-Box': 75 },
    'Meia Aberto': { 'Meia Aberto': 100, 'Armador Aberto': 85, 'Ala': 75, 'Lateral': 65, 'Meia Atacante': 60 },
    'Armador Aberto': { 'Armador Aberto': 100, 'Meia Aberto': 85, 'Armador Avançado': 75, 'Meia Atacante': 70 },

    // FWD Group (incl. Attacking Mids)
    'Meia Atacante': { 'Meia Atacante': 100, 'Armador Avançado': 90, 'Atacante Sombra': 85, 'Trequartista': 80, 'Meio-campista': 80, 'Falso Nove': 75, 'Mezzala': 70 },
    'Armador Avançado': { 'Armador Avançado': 100, 'Meia Atacante': 90, 'Trequartista': 85, 'Construtor de Jogo Recuado': 70, 'Armador Aberto': 70, 'Meia Itinerante': 70 },
    'Atacante Sombra': { 'Atacante Sombra': 100, 'Meia Atacante': 85, 'Atacante Avançado': 80, 'Finalizador': 75, 'Atacante': 70 },
    'Trequartista': { 'Trequartista': 100, 'Armador Avançado': 85, 'Falso Nove': 80, 'Atacante Recuado': 75, 'Meia Atacante': 80 },
    'Falso Nove': { 'Falso Nove': 100, 'Atacante Recuado': 85, 'Trequartista': 80, 'Meia Atacante': 75, 'Atacante': 70 },
    'Atacante': { 'Atacante': 100, 'Atacante Avançado': 90, 'Atacante Completo': 90, 'Finalizador': 85, 'Atacante Recuado': 85 },
    'Atacante Avançado': { 'Atacante Avançado': 100, 'Atacante': 90, 'Finalizador': 85, 'Atacante Sombra': 75 },
    'Atacante Completo': { 'Atacante Completo': 100, 'Atacante': 90, 'Atacante Recuado': 85, 'Atacante Avançado': 80 },
    'Finalizador': { 'Finalizador': 100, 'Atacante': 85, 'Atacante Avançado': 85, 'Atacante Sombra': 70 },
    'Atacante Recuado': { 'Atacante Recuado': 100, 'Atacante': 85, 'Falso Nove': 85, 'Atacante Completo': 80, 'Trequartista': 70 },
};

const generateFamiliarity = (naturalRole: PlayerRole): Record<PlayerRole, number> => {
    const familiarity: Partial<Record<PlayerRole, number>> = {};
    for (const role of ALL_ROLES) {
        familiarity[role] = FAMILIARITY_MAP[naturalRole]?.[role] || 20; // Base familiarity is 20
    }
    return familiarity as Record<PlayerRole, number>;
};

export const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

const generatePlayerAttributes = (isYouth: boolean = false): PlayerAttributes => ({
    passing: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    dribbling: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    shooting: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    tackling: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    heading: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    crossing: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    aggression: randInt(30, 90),
    creativity: randInt(isYouth ? 20 : 30, isYouth ? 55 : 90),
    positioning: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    teamwork: randInt(isYouth ? 20 : 50, isYouth ? 60 : 95),
    workRate: randInt(isYouth ? 20 : 40, isYouth ? 60 : 95),
    pace: randInt(isYouth ? 30 : 50, isYouth ? 70 : 95),
    stamina: randInt(isYouth ? 30 : 50, isYouth ? 70 : 95),
    strength: randInt(isYouth ? 25 : 50, isYouth ? 65 : 95),
    naturalFitness: randInt(30, 95),
});

const calculateMarketValue = (player: Omit<Player, 'marketValue' | 'id' | 'clubId' | 'contractExpires' | 'history' | 'morale' | 'satisfaction' | 'matchFitness' | 'injury' | 'suspension' | 'seasonYellowCards' | 'individualTrainingFocus' | 'scoutedAttributes' | 'scoutedPotentialRange' | 'lastRenewalDate' | 'interactions' | 'attributeChanges'>): number => {
    const avgAttr = Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.values(player.attributes).length;
    let value = (avgAttr * 20000) + (player.potential * 15000);
    if (player.age < 22) value *= 1.5;
    if (player.age > 32) value *= 0.5;
    return Math.round(value / 1000) * 1000;
};

const defaultInstructions: PlayerInstructions = {
    shooting: ShootingInstruction.Normal,
    passing: PassingInstruction.Normal,
    dribbling: DribblingInstruction.Normal,
    crossing: CrossingInstruction.Normal,
    positioning: PositioningInstruction.Normal,
    tackling: TacklingInstruction.Normal,
    pressing: PressingInstruction.Normal,
    marking: MarkingInstruction.Normal,
};

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
const defaultPositions442: { position: { x: number, y: number }, role: PlayerRole }[] = [
    { position: { x: 50, y: 95 }, role: 'Goleiro' },
    { position: { x: 20, y: 75 }, role: 'Lateral' },
    { position: { x: 40, y: 78 }, role: 'Zagueiro' },
    { position: { x: 60, y: 78 }, role: 'Zagueiro' },
    { position: { x: 80, y: 75 }, role: 'Lateral' },
    { position: { x: 20, y: 50 }, role: 'Meia Aberto' },
    { position: { x: 40, y: 55 }, role: 'Meio-campista' },
    { position: { x: 60, y: 55 }, role: 'Meio-campista' },
    { position: { x: 80, y: 50 }, role: 'Meia Aberto' },
    { position: { x: 40, y: 25 }, role: 'Atacante' },
    { position: { x: 60, y: 25 }, role: 'Atacante' },
];

const generateStaffAttributes = (role: StaffRole): StaffAttributes => {
    switch (role) {
        case StaffRole.AssistantManager:
            return {
                tacticalKnowledge: randInt(50, 95),
                judgingPlayerAbility: randInt(50, 95),
                manManagement: randInt(50, 95),
            } as AssistantManagerAttributes;
        case StaffRole.HeadOfScouting:
            return {
                judgingPlayerAbility: randInt(50, 95),
                judgingPlayerPotential: randInt(50, 95),
                reach: randInt(1, 20),
            } as HeadOfScoutingAttributes;
        case StaffRole.HeadOfPhysiotherapy:
            return {
                physiotherapy: randInt(50, 95),
                injuryPrevention: randInt(50, 95),
                sportsScience: randInt(50, 95),
            } as HeadOfPhysiotherapyAttributes;
        case StaffRole.HeadOfPerformance:
            return {
                fitnessCoaching: randInt(50, 95),
                loadManagement: randInt(50, 95),
            } as HeadOfPerformanceAttributes;
    }
};

export const generateScheduleForCompetition = (clubsInCompetition: Club[], startDate: Date): Match[] => {
    const schedule: Match[] = [];
    let matchIdCounter = Date.now(); // Use timestamp to ensure unique IDs across seasons
    let currentDate = new Date(startDate);
    
    const clubIds: (number | null)[] = clubsInCompetition.map(c => c.id);

    if (clubIds.length % 2 !== 0) {
        clubIds.push(null); // Add a 'bye' team if odd number
    }
    
    const numTeams = clubIds.length;
    const numRounds = numTeams - 1;

    const rounds: { home: number; away: number }[][] = [];
    for (let round = 0; round < numRounds; round++) {
        const roundMatches: { home: number; away: number }[] = [];
        for (let i = 0; i < numTeams / 2; i++) {
            const home = clubIds[i];
            const away = clubIds[numTeams - 1 - i];

            if (home && away) {
                roundMatches.push({ home, away });
            }
        }
        rounds.push(roundMatches);

        // Rotate teams, keeping the first one fixed
        const lastTeam = clubIds.pop();
        if (lastTeam !== undefined) {
             clubIds.splice(1, 0, lastTeam);
        }
    }

    // Create first half of the season
    for (const roundMatches of rounds) {
        for (const match of roundMatches) {
             schedule.push({
                id: matchIdCounter++,
                homeTeamId: match.home,
                awayTeamId: match.away,
                date: new Date(currentDate),
            });
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }

    // Create second half of the season (reverse fixtures)
     for (const roundMatches of rounds) {
        for (const match of roundMatches) {
             schedule.push({
                id: matchIdCounter++,
                homeTeamId: match.away, // Reversed
                awayTeamId: match.home, // Reversed
                date: new Date(currentDate),
            });
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }
    
    schedule.sort((a,b) => a.date.getTime() - b.date.getTime());
    return schedule;
};

const getOverallRatingForDB = (attrs: PlayerAttributes): number => {
    const keyAttrs = attrs.shooting + attrs.passing + attrs.tackling + attrs.dribbling + attrs.pace + attrs.positioning + attrs.workRate + attrs.creativity + attrs.stamina;
    return keyAttrs / 9;
};

// FIX: Removed 'pressConference' from the Omit<> type as it is no longer part of the GameState.
export const generateInitialDatabase = (): Omit<GameState, 'playerClubId' | 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults' | 'matchStartError' | 'seasonReviewData' | 'transferNegotiations' | 'nextNegotiationId'> => {
    const clubs: Record<number, Club> = {};
    const players: Record<number, Player> = {};
    const staff: Record<number, Staff> = {};
    const competitions: Record<number, Competition> = {};
    const leagueTable: LeagueEntry[] = [];
    const sponsors: Record<number, Sponsor> = {};
    const sponsorshipDeals: SponsorshipDeal[] = [];
    const banks: Record<number, Bank> = {};
    let playerIdCounter = 1;
    let staffIdCounter = 1;
    const NUM_CLUBS = 20;
    const PLAYERS_PER_CLUB = 22;
    const NUM_STAFF_PER_ROLE = 20;

    // Create Competitions
    competitions[1] = { id: 1, name: 'Premier Division', level: 1 };
    competitions[2] = { id: 2, name: 'Championship', level: 2 };
    
    // Create Sponsors
    SPONSOR_DATA.forEach(s => sponsors[s.id] = s);

    // Create Banks
    BANK_DATA.forEach(b => banks[b.id] = b);

    // Generate Staff Pool
    const staffRolesToGenerate = [StaffRole.AssistantManager, StaffRole.HeadOfPerformance, StaffRole.HeadOfPhysiotherapy, StaffRole.HeadOfScouting];
    for (const role of staffRolesToGenerate) {
        for (let i = 0; i < NUM_STAFF_PER_ROLE; i++) {
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + randInt(1, 4));
            const newStaff: Staff = {
                id: staffIdCounter,
                clubId: null,
                name: `${pickRandom(STAFF_FIRST_NAMES)} ${pickRandom(STAFF_LAST_NAMES)}`,
                age: randInt(30, 65),
                nationality: pickRandom(COUNTRIES),
                role,
                wage: randInt(1000, 5000),
                contractExpires,
                attributes: generateStaffAttributes(role),
            };
            staff[staffIdCounter] = newStaff;
            staffIdCounter++;
        }
    }


    for (let i = 1; i <= NUM_CLUBS; i++) {
        const initialTactics: Tactics = {
            // FIX: Translated 'Balanced' to 'Equilibrada' to match Mentality type.
            mentality: 'Equilibrada',
            lineup: Array(11).fill(null),
            bench: Array(7).fill(null),
        };
        const competitionId = i <= 10 ? 1 : 2; // First 10 clubs in Premier Division
        const reputation = competitionId === 1 ? randInt(70, 90) : randInt(50, 69);
        const balance = randInt(5_000_000, 20_000_000);
        
        const philosophies: ClubPhilosophy[] = [];
        if (reputation > 75) {
            philosophies.push({ type: 'play_attacking_football', description: 'Play attacking, entertaining football.' });
            if (Math.random() < 0.5) {
                philosophies.push({ type: 'sign_high_reputation', description: 'Sign high-reputation players.', parameters: { minReputation: 80 } });
            }
        } else if (reputation < 65) {
            philosophies.push({ type: 'develop_youth', description: 'Develop players through the youth system.' });
            philosophies.push({ type: 'sign_young_players', description: 'Sign players aged 23 or younger for the first team.', parameters: { maxAge: 23 } });
        } else {
            if (Math.random() < 0.5) {
                philosophies.push({ type: 'play_attacking_football', description: 'Play attacking, entertaining football.' });
            }
            philosophies.push({ type: 'sign_young_players', description: 'Sign players aged 23 or younger for the first team.', parameters: { maxAge: 23 } });
        }

        const currentDate = new Date(2024, 7, 1);
        clubs[i] = {
            id: i,
            name: `${pickRandom(CITIES)} ${pickRandom(CLUB_NAMES)}`,
            country: pickRandom(COUNTRIES),
            reputation,
            balance: balance,
            transferBudget: Math.floor(balance * 0.4),
            wageBudget: 150000,
            tactics: initialTactics,
            // FIX: Translated 'Balanced' to 'Equilibrado' to match TeamTrainingFocus type.
            trainingFocus: 'Equilibrado',
            departments: {
                [DepartmentType.Coaching]: { level: 1, chiefId: null },
                [DepartmentType.Medical]: { level: 1, chiefId: null },
                [DepartmentType.Scouting]: { level: 1, chiefId: null },
                [DepartmentType.Performance]: { level: 1, chiefId: null },
            },
            competitionId,
            managerConfidence: 100,
            boardObjective: null,
            philosophies,
            creditScore: 50,
            loanHistory: [],
            boardRequestCooldowns: {},
            requestsThisMonth: { month: currentDate.getMonth(), year: currentDate.getFullYear(), count: 0 },
        };

        if (competitionId === 1) {
            leagueTable.push({
                clubId: i, played: 0, wins: 0, draws: 0, losses: 0, 
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
            });
        }
    }

    // Assign Sponsorship Deals
    Object.values(clubs).forEach(club => {
        const availableSponsors = Object.values(sponsors);
        
        // FIX: Translated Sponsor types from English to Portuguese.
        const findSponsor = (type: 'Camisa Principal' | 'Fornecedor de Material' | 'Direitos do Estádio') => {
            const candidates = availableSponsors.filter(s => {
                if (s.preferredType !== type) return false;
                // Check if already taken
                if (sponsorshipDeals.some(d => d.sponsorId === s.id && d.type === type)) return false;

                const rep = club.reputation;
                return s.guidelines.every(g => {
                    if (g.type === 'min_reputation') return rep >= g.value;
                    if (g.type === 'max_reputation') return rep <= g.value;
                    if (g.type === 'country') return club.country === g.value;
                    return true;
                });
            });
            return pickRandom(candidates);
        };

        const createDeal = (sponsor: Sponsor) => {
            const repModifier = (club.reputation - 50) / 50; // -1 to 1 based on 0-100 rep
            const valueRange = sponsor.baseAnnualValue[1] - sponsor.baseAnnualValue[0];
            const value = sponsor.baseAnnualValue[0] + valueRange * Math.max(0, Math.min(1, 0.5 + repModifier / 2));
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + randInt(2, 5));
            sponsorshipDeals.push({
                sponsorId: sponsor.id,
                clubId: club.id,
                type: sponsor.preferredType,
                annualValue: Math.round(value / 1000) * 1000,
                expires,
            });
        };

        // FIX: Translated Sponsor types from English to Portuguese.
        const shirtSponsor = findSponsor('Camisa Principal');
        if (shirtSponsor) createDeal(shirtSponsor);

        const kitSponsor = findSponsor('Fornecedor de Material');
        if (kitSponsor) createDeal(kitSponsor);

        if (club.reputation > 65) {
            const stadiumSponsor = findSponsor('Direitos do Estádio');
            if (stadiumSponsor) createDeal(stadiumSponsor);
        }
    });


    // Assign staff chiefs to AI clubs
    const availableStaff = (role: StaffRole) => Object.values(staff).find(s => s.role === role && s.clubId === null);
    for (let clubId = 1; clubId <= NUM_CLUBS; clubId++) {
        const club = clubs[clubId];
        const hireStaff = (role: StaffRole, department: DepartmentType) => {
            const staffToHire = availableStaff(role);
            if (staffToHire) {
                club.departments[department].chiefId = staffToHire.id;
                staffToHire.clubId = clubId;
            }
        };
        hireStaff(StaffRole.AssistantManager, DepartmentType.Coaching);
        hireStaff(StaffRole.HeadOfPhysiotherapy, DepartmentType.Medical);
        hireStaff(StaffRole.HeadOfScouting, DepartmentType.Scouting);
        hireStaff(StaffRole.HeadOfPerformance, DepartmentType.Performance);
    }

    // FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
    const GK_ROLES: PlayerRole[] = ['Goleiro', 'Goleiro Líbero'];
    const DEF_ROLES: PlayerRole[] = ['Zagueiro', 'Zagueiro com Passe', 'Lateral', 'Ala'];
    const MID_ROLES: PlayerRole[] = ['Volante', 'Meio-campista', 'Volante Ladrão de Bolas', 'Meia Box-to-Box', 'Meia Aberto'];
    const FWD_ROLES: PlayerRole[] = ['Meia Atacante', 'Atacante', 'Atacante Avançado', 'Finalizador'];

    for (let clubId = 1; clubId <= NUM_CLUBS; clubId++) {
        const clubPlayers: Player[] = [];
        for (let j = 0; j < PLAYERS_PER_CLUB; j++) {
            let naturalPos: PlayerRole;
            if (j < 2) naturalPos = pickRandom(GK_ROLES);
            else if (j < 8) naturalPos = pickRandom(DEF_ROLES);
            else if (j < 16) naturalPos = pickRandom(MID_ROLES);
            else naturalPos = pickRandom(FWD_ROLES);
            
            const age = randInt(18, 35);
            const contractDuration = randInt(1, 5);
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + contractDuration);

            const partialPlayer = {
                age,
                name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
                nationality: pickRandom(COUNTRIES),
                naturalPosition: naturalPos,
                wage: randInt(500, 10000),
                attributes: generatePlayerAttributes(),
                potential: randInt(60, 100),
            };

            const player: Player = {
                ...partialPlayer,
                id: playerIdCounter,
                clubId: clubId,
                contractExpires,
                marketValue: calculateMarketValue(partialPlayer as any),
                positionalFamiliarity: generateFamiliarity(naturalPos),
                morale: randInt(75, 95),
                satisfaction: randInt(70, 90),
                matchFitness: 100,
                injury: null,
                suspension: null,
                seasonYellowCards: 0,
                history: [],
                scoutedAttributes: {},
                scoutedPotentialRange: null,
                individualTrainingFocus: null,
                squadStatus: 'Rotação' as SquadStatus, // Temporary, will be overwritten
                isTransferListed: false,
                interactions: [],
                attributeChanges: [],
            };
            players[playerIdCounter] = player;
            clubPlayers.push(player);
            playerIdCounter++;
        }
        
        clubPlayers.sort((a, b) => getOverallRatingForDB(b.attributes) - getOverallRatingForDB(a.attributes));
        clubPlayers.forEach((p, index) => {
            let status: SquadStatus;
            if (index < 5) status = 'Titular';
            else if (index < 11) status = 'Rodízio';
            else if (index < 17) status = 'Rotação';
            else status = 'Jovem Promessa';
            players[p.id].squadStatus = status;
        });


        // Initial Youth Intake
        const clubRep = clubs[clubId].reputation;
        for (let k = 0; k < randInt(8, 15); k++) {
            let naturalPos: PlayerRole;
            const posRoll = Math.random();
            if (posRoll < 0.1) naturalPos = pickRandom(GK_ROLES);
            else if (posRoll < 0.4) naturalPos = pickRandom(DEF_ROLES);
            else if (posRoll < 0.8) naturalPos = pickRandom(MID_ROLES);
            else naturalPos = pickRandom(FWD_ROLES);

            const age = randInt(15, 18);
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + randInt(1, 3));
            
            const partialPlayer = {
                age,
                name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
                nationality: pickRandom(COUNTRIES),
                naturalPosition: naturalPos,
                wage: randInt(50, 250),
                attributes: generatePlayerAttributes(true),
                potential: randInt(Math.max(40, clubRep - 15), Math.min(100, clubRep + 15)),
            };

             const player: Player = {
                ...partialPlayer,
                id: playerIdCounter,
                clubId: clubId,
                contractExpires,
                marketValue: calculateMarketValue(partialPlayer as any),
                positionalFamiliarity: generateFamiliarity(naturalPos),
                morale: randInt(60, 80),
                satisfaction: randInt(70, 90),
                matchFitness: 50,
                injury: null,
                suspension: null,
                seasonYellowCards: 0,
                history: [],
                scoutedAttributes: {},
                scoutedPotentialRange: null,
                individualTrainingFocus: null,
                squadStatus: 'Base',
                isTransferListed: false,
                interactions: [],
                attributeChanges: [],
            };
            players[playerIdCounter] = player;
            playerIdCounter++;
        }


        const lineup: (LineupPlayer | null)[] = Array(11).fill(null);
        const assignedToLineup = new Set<number>();

        const positionsNeeded: {[key in 'GK' | 'DEF' | 'MID' | 'FWD']: number} = {'GK':1, 'DEF':4, 'MID':4, 'FWD':2};
        let lineupIndex = 0;

        for (const [pos, count] of Object.entries(positionsNeeded)) {
            const playersForPos = clubPlayers.filter(p => getRoleCategory(p.naturalPosition) === pos);
            for(let k=0; k<count && k < playersForPos.length; k++) {
                if(lineupIndex < 11) {
                    const player = playersForPos[k];
                    if (assignedToLineup.has(player.id)) continue;
                    lineup[lineupIndex] = {
                        playerId: player.id,
                        position: defaultPositions442[lineupIndex].position,
                        role: defaultPositions442[lineupIndex].role,
                        instructions: { ...defaultInstructions }
                    };
                    assignedToLineup.add(player.id);
                    lineupIndex++;
                }
            }
        }
        clubs[clubId].tactics.lineup = lineup;

        const benchPlayers = clubPlayers.filter(p => !assignedToLineup.has(p.id));
        const bench: (number | null)[] = Array(7).fill(null);
        for(let i=0; i<7 && i < benchPlayers.length; i++) {
            bench[i] = benchPlayers[i].id;
        }
        clubs[clubId].tactics.bench = bench;
    }

    const clubsInPremierDivision = Object.values(clubs).filter(c => c.competitionId === 1);
    const startDate = new Date(2024, 7, 10); // Season starts in August
    const schedule = generateScheduleForCompetition(clubsInPremierDivision, startDate);
    
    return { clubs, players, staff, competitions, schedule, leagueTable, scoutingAssignments: [], nextScoutAssignmentId: 1, sponsors, sponsorshipDeals, banks, loans: [], nextLoanId: 1 };
};