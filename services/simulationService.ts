import { Match, Club, Player, GameState, PlayerAttributes, MatchStats } from '../types';

// Simplified overall team rating based on starting lineup for non-player matches
const getTeamRating = (teamId: number, clubs: Record<number, Club>, players: Record<number, Player>): number => {
    const club = clubs[teamId];
    if (!club) return 50;

    const lineupPlayers = club.tactics.lineup
        .map(playerId => playerId ? players[playerId] : null)
        .filter(p => p !== null) as Player[];

    if (lineupPlayers.length === 0) return 50;

    const totalRating = lineupPlayers.reduce((sum, player) => {
        const attrs = Object.values(player.attributes);
        const avgAttr = attrs.reduce((a, b) => a + b, 0) / attrs.length;
        return sum + avgAttr;
    }, 0);

    return totalRating / lineupPlayers.length;
};

// This function now simulates non-player matches and generates estimated stats.
export const runMatch = (match: Match, clubs: Record<number, Club>, players: Record<number, Player>): Match => {
    const homeRating = getTeamRating(match.homeTeamId, clubs, players);
    const awayRating = getTeamRating(match.awayTeamId, clubs, players);
    const homeAdvantage = 1.05;
    const ratingDiff = (homeRating * homeAdvantage) - awayRating;
    
    let homeScore = 0;
    let awayScore = 0;

    const homeStats: MatchStats = { shots: 0, shotsOnTarget: 0, possession: 0, tackles: 0 };
    const awayStats: MatchStats = { shots: 0, shotsOnTarget: 0, possession: 0, tackles: 0 };

    const totalChances = 10 + Math.floor(Math.random() * 5); // 10-14 total chances in a match

    for (let i = 0; i < totalChances; i++) {
        const homeChanceProb = (50 + ratingDiff) / 100;
        if (Math.random() < homeChanceProb) {
            // Home chance
            homeStats.shots++;
            if (Math.random() < 0.4) { // 40% of shots are on target
                homeStats.shotsOnTarget++;
                if (Math.random() < 0.3) { // 30% of shots on target are goals
                    homeScore++;
                }
            }
        } else {
            // Away chance
            awayStats.shots++;
            if (Math.random() < 0.4) {
                awayStats.shotsOnTarget++;
                if (Math.random() < 0.3) {
                    awayScore++;
                }
            }
        }
    }

    homeStats.tackles = 8 + Math.floor(Math.random() * 10);
    awayStats.tackles = 8 + Math.floor(Math.random() * 10);
    
    const basePossession = 50 + (ratingDiff * 1.5);
    homeStats.possession = Math.max(25, Math.min(75, Math.round(basePossession)));
    awayStats.possession = 100 - homeStats.possession;

    return { ...match, homeScore, awayScore, homeStats, awayStats };
};

export const processPlayerDevelopment = (players: Record<number, Player>): Record<number, Player> => {
    const newPlayers = { ...players };
    for (const player of Object.values(newPlayers)) {
        if (player.age < 29 && Math.random() < 0.2) { // 20% chance of development per month
            const potentialFactor = player.potential / 100;
            if (Math.random() < potentialFactor) {
                const attrs = Object.keys(player.attributes) as (keyof PlayerAttributes)[];
                const attrToImprove = attrs[Math.floor(Math.random() * attrs.length)];
                if (player.attributes[attrToImprove] < 99) {
                    player.attributes[attrToImprove] += 1;
                }
            }
        }
         if (player.age > 30 && Math.random() < 0.2) { // 20% chance of decline per month
            const ageFactor = (player.age - 30) / 10;
             if (Math.random() < ageFactor) {
                const physicalAttrs: (keyof PlayerAttributes)[] = ['pace', 'stamina', 'strength'];
                const attrToDecline = physicalAttrs[Math.floor(Math.random() * physicalAttrs.length)];
                if (player.attributes[attrToDecline] > 30) {
                    player.attributes[attrToDecline] -= 1;
                }
             }
        }
    }
    return newPlayers;
};

export const processPlayerAging = (players: Record<number, Player>) => {
    const newPlayers = { ...players };
    for (const player of Object.values(newPlayers)) {
        player.age += 1;
        player.marketValue = recalculateMarketValue(player);
    }
    return { players: newPlayers };
}

export const processWages = (clubs: Record<number, Club>, players: Record<number, Player>): Record<number, Club> => {
    const newClubs = { ...clubs };
    for (const club of Object.values(newClubs)) {
        const clubPlayers = Object.values(players).filter(p => p.clubId === club.id);
        const totalWages = clubPlayers.reduce((sum, p) => sum + p.wage, 0);
        club.balance -= totalWages * 4; // Monthly wage bill
    }
    return newClubs;
};


export const recalculateMarketValue = (player: Player): number => {
    const avgAttr = Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.values(player.attributes).length;
    let value = (avgAttr * 20000) + (player.potential * 15000);
    if (player.age < 22) value *= 1.5;
    if (player.age > 32) value *= 0.5;
    return Math.max(0, Math.round(value / 1000) * 1000);
};