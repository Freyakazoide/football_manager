import { GameState, Club, Player, PlayerAttributes, Match, LeagueEntry, LineupPlayer, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, CrossingInstruction, PositioningInstruction, TacklingInstruction, PressingInstruction, MarkingInstruction, PlayerRole, Tactics } from '../types';

const FIRST_NAMES = ['John', 'Paul', 'Mike', 'Leo', 'Chris', 'David', 'Alex', 'Ben', 'Sam', 'Tom', 'Dan', 'Matt'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Martin'];
const COUNTRIES = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Brazil', 'Argentina'];
const CLUB_NAMES = ['United', 'Rovers', 'City', 'Wanderers', 'Athletic', 'FC', 'Albion', 'Town'];
const CITIES = ['Northwood', 'Southglen', 'Easton', 'Westfield', 'Oakhaven', 'Riverdale', 'Mountview', 'Portsmith'];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- NEW POSITIONAL FAMILIARITY LOGIC ---

export const ALL_ROLES: PlayerRole[] = [
    'Goalkeeper', 'Sweeper Keeper', 'Central Defender', 'Ball-Playing Defender', 'Full-Back', 'Wing-Back', 'Inverted Wing-Back', 'Libero',
    'Defensive Midfielder', 'Central Midfielder', 'Ball Winning Midfielder', 'Box-To-Box Midfielder', 'Deep Lying Playmaker', 'Roaming Playmaker',
    'Mezzala', 'Carrilero', 'Wide Midfielder', 'Wide Playmaker', 'Attacking Midfielder', 'Advanced Playmaker', 'Shadow Striker',
    'Trequartista', 'False Nine', 'Striker', 'Advanced Forward', 'Complete Forward', 'Poacher', 'Deep-Lying Forward'
];

export const ROLE_DEFINITIONS: Record<PlayerRole, { category: 'GK' | 'DEF' | 'MID' | 'FWD' }> = {
    'Goalkeeper': { category: 'GK' }, 'Sweeper Keeper': { category: 'GK' },
    'Central Defender': { category: 'DEF' }, 'Ball-Playing Defender': { category: 'DEF' }, 'Libero': { category: 'DEF' },
    'Full-Back': { category: 'DEF' }, 'Wing-Back': { category: 'DEF' }, 'Inverted Wing-Back': { category: 'DEF' },
    'Defensive Midfielder': { category: 'MID' }, 'Central Midfielder': { category: 'MID' }, 'Ball Winning Midfielder': { category: 'MID' },
    'Box-To-Box Midfielder': { category: 'MID' }, 'Deep Lying Playmaker': { category: 'MID' }, 'Roaming Playmaker': { category: 'MID' },
    'Mezzala': { category: 'MID' }, 'Carrilero': { category: 'MID' }, 'Wide Midfielder': { category: 'MID' }, 'Wide Playmaker': { category: 'MID' },
    'Attacking Midfielder': { category: 'FWD' }, 'Advanced Playmaker': { category: 'FWD' }, 'Shadow Striker': { category: 'FWD' },
    'Trequartista': { category: 'FWD' }, 'False Nine': { category: 'FWD' },
    'Striker': { category: 'FWD' }, 'Advanced Forward': { category: 'FWD' }, 'Complete Forward': { category: 'FWD' },
    'Poacher': { category: 'FWD' }, 'Deep-Lying Forward': { category: 'FWD' },
};

export const ROLE_TO_POSITION_MAP: Record<PlayerRole, { x: number; y: number }> = {
    // GK
    'Goalkeeper': { x: 50, y: 95 }, 'Sweeper Keeper': { x: 50, y: 90 },
    // DEF
    'Libero': { x: 50, y: 82 }, 'Central Defender': { x: 50, y: 78 }, 'Ball-Playing Defender': { x: 50, y: 78 },
    'Full-Back': { x: 18, y: 75 },
    'Wing-Back': { x: 15, y: 65 },
    'Inverted Wing-Back': { x: 25, y: 68 },
    // MID
    'Defensive Midfielder': { x: 50, y: 65 },
    'Deep Lying Playmaker': { x: 50, y: 62 },
    'Ball Winning Midfielder': { x: 50, y: 58 },
    'Carrilero': { x: 35, y: 55 },
    'Central Midfielder': { x: 50, y: 55 },
    'Box-To-Box Midfielder': { x: 50, y: 50 },
    'Roaming Playmaker': { x: 50, y: 48 },
    'Mezzala': { x: 35, y: 45 },
    'Wide Midfielder': { x: 15, y: 50 },
    'Wide Playmaker': { x: 20, y: 45 },
    // AM
    'Attacking Midfielder': { x: 50, y: 38 },
    'Advanced Playmaker': { x: 50, y: 35 },
    'Trequartista': { x: 50, y: 30 },
    'Shadow Striker': { x: 50, y: 25 },
    // FWD
    'False Nine': { x: 50, y: 22 },
    'Deep-Lying Forward': { x: 50, y: 18 },
    'Poacher': { x: 50, y: 12 },
    'Advanced Forward': { x: 50, y: 10 },
    'Striker': { x: 50, y: 15 },
    'Complete Forward': { x: 50, y: 15 },
};


const FAMILIARITY_MAP: Record<PlayerRole, Partial<Record<PlayerRole, number>>> = {
    // GK Group
    'Goalkeeper': { 'Goalkeeper': 100, 'Sweeper Keeper': 85 },
    'Sweeper Keeper': { 'Sweeper Keeper': 100, 'Goalkeeper': 85, 'Libero': 50 },

    // DEF Group
    'Central Defender': { 'Central Defender': 100, 'Ball-Playing Defender': 90, 'Libero': 70, 'Defensive Midfielder': 60, 'Full-Back': 50 },
    'Ball-Playing Defender': { 'Ball-Playing Defender': 100, 'Central Defender': 90, 'Libero': 75, 'Defensive Midfielder': 65, 'Deep Lying Playmaker': 50 },
    'Libero': { 'Libero': 100, 'Central Defender': 80, 'Defensive Midfielder': 70, 'Sweeper Keeper': 60 },
    'Full-Back': { 'Full-Back': 100, 'Wing-Back': 90, 'Inverted Wing-Back': 80, 'Wide Midfielder': 65, 'Central Defender': 50 },
    'Wing-Back': { 'Wing-Back': 100, 'Full-Back': 90, 'Wide Midfielder': 80, 'Inverted Wing-Back': 70 },
    'Inverted Wing-Back': { 'Inverted Wing-Back': 100, 'Full-Back': 85, 'Defensive Midfielder': 70, 'Central Midfielder': 60, 'Wing-Back': 70 },
    
    // MID Group
    'Defensive Midfielder': { 'Defensive Midfielder': 100, 'Deep Lying Playmaker': 85, 'Ball Winning Midfielder': 85, 'Central Midfielder': 80, 'Central Defender': 70 },
    'Central Midfielder': { 'Central Midfielder': 100, 'Box-To-Box Midfielder': 90, 'Mezzala': 85, 'Carrilero': 85, 'Roaming Playmaker': 85, 'Defensive Midfielder': 80, 'Attacking Midfielder': 80 },
    'Ball Winning Midfielder': { 'Ball Winning Midfielder': 100, 'Defensive Midfielder': 90, 'Central Midfielder': 85, 'Carrilero': 75 },
    'Box-To-Box Midfielder': { 'Box-To-Box Midfielder': 100, 'Central Midfielder': 90, 'Roaming Playmaker': 80, 'Mezzala': 75, 'Carrilero': 70 },
    'Deep Lying Playmaker': { 'Deep Lying Playmaker': 100, 'Defensive Midfielder': 90, 'Central Midfielder': 80, 'Roaming Playmaker': 70, 'Advanced Playmaker': 60 },
    'Roaming Playmaker': { 'Roaming Playmaker': 100, 'Central Midfielder': 85, 'Mezzala': 80, 'Advanced Playmaker': 80, 'Box-To-Box Midfielder': 75 },
    'Mezzala': { 'Mezzala': 100, 'Central Midfielder': 85, 'Attacking Midfielder': 80, 'Roaming Playmaker': 80, 'Wide Midfielder': 65 },
    'Carrilero': { 'Carrilero': 100, 'Central Midfielder': 85, 'Ball Winning Midfielder': 80, 'Box-To-Box Midfielder': 75 },
    'Wide Midfielder': { 'Wide Midfielder': 100, 'Wide Playmaker': 85, 'Wing-Back': 75, 'Full-Back': 65, 'Attacking Midfielder': 60 },
    'Wide Playmaker': { 'Wide Playmaker': 100, 'Wide Midfielder': 85, 'Advanced Playmaker': 75, 'Attacking Midfielder': 70 },

    // FWD Group (incl. Attacking Mids)
    'Attacking Midfielder': { 'Attacking Midfielder': 100, 'Advanced Playmaker': 90, 'Shadow Striker': 85, 'Trequartista': 80, 'Central Midfielder': 80, 'False Nine': 75, 'Mezzala': 70 },
    'Advanced Playmaker': { 'Advanced Playmaker': 100, 'Attacking Midfielder': 90, 'Trequartista': 85, 'Deep Lying Playmaker': 70, 'Wide Playmaker': 70, 'Roaming Playmaker': 70 },
    'Shadow Striker': { 'Shadow Striker': 100, 'Attacking Midfielder': 85, 'Advanced Forward': 80, 'Poacher': 75, 'Striker': 70 },
    'Trequartista': { 'Trequartista': 100, 'Advanced Playmaker': 85, 'False Nine': 80, 'Deep-Lying Forward': 75, 'Attacking Midfielder': 80 },
    'False Nine': { 'False Nine': 100, 'Deep-Lying Forward': 85, 'Trequartista': 80, 'Attacking Midfielder': 75, 'Striker': 70 },
    'Striker': { 'Striker': 100, 'Advanced Forward': 90, 'Complete Forward': 90, 'Poacher': 85, 'Deep-Lying Forward': 85 },
    'Advanced Forward': { 'Advanced Forward': 100, 'Striker': 90, 'Poacher': 85, 'Shadow Striker': 75 },
    'Complete Forward': { 'Complete Forward': 100, 'Striker': 90, 'Deep-Lying Forward': 85, 'Advanced Forward': 80 },
    'Poacher': { 'Poacher': 100, 'Striker': 85, 'Advanced Forward': 85, 'Shadow Striker': 70 },
    'Deep-Lying Forward': { 'Deep-Lying Forward': 100, 'Striker': 85, 'False Nine': 85, 'Complete Forward': 80, 'Trequartista': 70 },
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

// --- END NEW LOGIC ---

const generatePlayerAttributes = (): PlayerAttributes => ({
    passing: randInt(40, 90),
    dribbling: randInt(40, 90),
    shooting: randInt(40, 90),
    tackling: randInt(40, 90),
    heading: randInt(40, 90),
    // FIX: Initialize the 'crossing' attribute for generated players.
    crossing: randInt(40, 90),
    aggression: randInt(30, 90),
    creativity: randInt(30, 90),
    positioning: randInt(40, 90),
    teamwork: randInt(50, 95),
    workRate: randInt(40, 95),
    pace: randInt(50, 95),
    stamina: randInt(50, 95),
    strength: randInt(50, 95),
    naturalFitness: randInt(30, 95),
});

const calculateMarketValue = (player: Omit<Player, 'marketValue' | 'id' | 'clubId' | 'contractExpires' | 'history' | 'morale' | 'satisfaction' | 'matchFitness' | 'injury' | 'suspension' | 'seasonYellowCards'>): number => {
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

const defaultPositions442: { position: { x: number, y: number }, role: PlayerRole }[] = [
    { position: { x: 50, y: 95 }, role: 'Goalkeeper' },
    { position: { x: 20, y: 75 }, role: 'Full-Back' },
    { position: { x: 40, y: 78 }, role: 'Central Defender' },
    { position: { x: 60, y: 78 }, role: 'Central Defender' },
    { position: { x: 80, y: 75 }, role: 'Full-Back' },
    { position: { x: 20, y: 50 }, role: 'Wide Midfielder' },
    { position: { x: 40, y: 55 }, role: 'Central Midfielder' },
    { position: { x: 60, y: 55 }, role: 'Central Midfielder' },
    { position: { x: 80, y: 50 }, role: 'Wide Midfielder' },
    { position: { x: 40, y: 25 }, role: 'Striker' },
    { position: { x: 60, y: 25 }, role: 'Striker' },
];

export const generateInitialDatabase = (): Omit<GameState, 'playerClubId' | 'transferResult' | 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults'> => {
    const clubs: Record<number, Club> = {};
    const players: Record<number, Player> = {};
    const leagueTable: LeagueEntry[] = [];
    let playerIdCounter = 1;
    const NUM_CLUBS = 10;
    const PLAYERS_PER_CLUB = 22;

    for (let i = 1; i <= NUM_CLUBS; i++) {
        const initialTactics: Tactics = {
            mentality: 'Balanced',
            lineup: Array(11).fill(null),
            bench: Array(7).fill(null),
        };
        clubs[i] = {
            id: i,
            name: `${pickRandom(CITIES)} ${pickRandom(CLUB_NAMES)}`,
            country: pickRandom(COUNTRIES),
            reputation: randInt(50, 90),
            balance: randInt(5_000_000, 20_000_000),
            tactics: initialTactics,
        };
        leagueTable.push({
            clubId: i, played: 0, wins: 0, draws: 0, losses: 0, 
            goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        });
    }

    const GK_ROLES: PlayerRole[] = ['Goalkeeper', 'Sweeper Keeper'];
    const DEF_ROLES: PlayerRole[] = ['Central Defender', 'Ball-Playing Defender', 'Full-Back', 'Wing-Back'];
    const MID_ROLES: PlayerRole[] = ['Defensive Midfielder', 'Central Midfielder', 'Ball Winning Midfielder', 'Box-To-Box Midfielder', 'Wide Midfielder'];
    const FWD_ROLES: PlayerRole[] = ['Attacking Midfielder', 'Striker', 'Advanced Forward', 'Poacher'];

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
            };
            players[playerIdCounter] = player;
            clubPlayers.push(player);
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

    const schedule: Match[] = [];
    const clubIds: (number | null)[] = Object.keys(clubs).map(Number);
    let matchIdCounter = 1;
    let startDate = new Date(2024, 7, 10); // Season starts in August

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
                date: new Date(startDate),
            });
        }
        startDate.setDate(startDate.getDate() + 7);
    }

    // Create second half of the season (reverse fixtures)
     for (const roundMatches of rounds) {
        for (const match of roundMatches) {
             schedule.push({
                id: matchIdCounter++,
                homeTeamId: match.away, // Reversed
                awayTeamId: match.home, // Reversed
                date: new Date(startDate),
            });
        }
        startDate.setDate(startDate.getDate() + 7);
    }
    
    schedule.sort((a,b) => a.date.getTime() - b.date.getTime());

    return { clubs, players, schedule, leagueTable, matchStartError: null };
};