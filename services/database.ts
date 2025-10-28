import { GameState, Club, Player, PlayerAttributes, Match, LeagueEntry } from '../types';

const FIRST_NAMES = ['John', 'Paul', 'Mike', 'Leo', 'Chris', 'David', 'Alex', 'Ben', 'Sam', 'Tom', 'Dan', 'Matt'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Martin'];
const COUNTRIES = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Brazil', 'Argentina'];
const CLUB_NAMES = ['United', 'Rovers', 'City', 'Wanderers', 'Athletic', 'FC', 'Albion', 'Town'];
const CITIES = ['Northwood', 'Southglen', 'Easton', 'Westfield', 'Oakhaven', 'Riverdale', 'Mountview', 'Portsmith'];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generatePlayerAttributes = (): PlayerAttributes => ({
    passing: randInt(40, 90),
    dribbling: randInt(40, 90),
    shooting: randInt(40, 90),
    tackling: randInt(40, 90),
    heading: randInt(40, 90),
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

const calculateMarketValue = (player: Omit<Player, 'marketValue' | 'id' | 'clubId' | 'contractExpires'>): number => {
    const avgAttr = Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.values(player.attributes).length;
    let value = (avgAttr * 20000) + (player.potential * 15000);
    if (player.age < 22) value *= 1.5;
    if (player.age > 32) value *= 0.5;
    return Math.round(value / 1000) * 1000;
};

export const generateInitialDatabase = (): Omit<GameState, 'playerClubId' | 'transferResult' | 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults'> => {
    const clubs: Record<number, Club> = {};
    const players: Record<number, Player> = {};
    const leagueTable: LeagueEntry[] = [];
    let playerIdCounter = 1;
    const NUM_CLUBS = 10;
    const PLAYERS_PER_CLUB = 22;

    for (let i = 1; i <= NUM_CLUBS; i++) {
        clubs[i] = {
            id: i,
            name: `${pickRandom(CITIES)} ${pickRandom(CLUB_NAMES)}`,
            country: pickRandom(COUNTRIES),
            reputation: randInt(50, 90),
            balance: randInt(5_000_000, 20_000_000),
            tactics: {
                formation: '4-4-2',
                mentality: 'Balanced',
                lineup: Array(11).fill(null),
                bench: Array(7).fill(null),
            },
        };
        leagueTable.push({
            clubId: i, played: 0, wins: 0, draws: 0, losses: 0, 
            goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        });
    }

    for (let clubId = 1; clubId <= NUM_CLUBS; clubId++) {
        const clubPlayers: Player[] = [];
        for (let j = 0; j < PLAYERS_PER_CLUB; j++) {
            const pos: Player['position'] = j < 2 ? 'GK' : j < 8 ? 'DEF' : j < 16 ? 'MID' : 'FWD';
            const age = randInt(18, 35);
            const contractDuration = randInt(1, 5);
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + contractDuration);

            const partialPlayer = {
                age,
                name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
                nationality: pickRandom(COUNTRIES),
                position: pos,
                wage: randInt(500, 10000),
                attributes: generatePlayerAttributes(),
                potential: randInt(60, 100),
            };

            const player: Player = {
                ...partialPlayer,
                id: playerIdCounter,
                clubId: clubId,
                contractExpires,
                marketValue: calculateMarketValue(partialPlayer),
            };
            players[playerIdCounter] = player;
            clubPlayers.push(player);
            playerIdCounter++;
        }
        
        // Basic lineup and bench setting
        const formation = clubs[clubId].tactics.formation;
        const positionsNeeded = {'4-4-2': {GK:1, DEF:4, MID:4, FWD:2}, '4-3-3': {GK:1, DEF:4, MID:3, FWD:3}, '3-5-2': {GK:1, DEF:3, MID:5, FWD:2}, '5-3-2': {GK:1, DEF:5, MID:3, FWD:2}}[formation];
        const lineup: (number | null)[] = Array(11).fill(null);
        let lineupIndex = 0;
        const assignedToLineup = new Set<number>();

        for (const [pos, count] of Object.entries(positionsNeeded)) {
            const playersForPos = clubPlayers.filter(p => p.position === pos);
            for(let k=0; k<count && k < playersForPos.length; k++) {
                if(lineupIndex < 11) {
                    const playerId = playersForPos[k].id;
                    lineup[lineupIndex] = playerId;
                    assignedToLineup.add(playerId);
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

    return { clubs, players, schedule, leagueTable };
};