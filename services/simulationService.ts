import { Match, Club, Player, GameState, PlayerAttributes, MatchStats, Mentality, LineupPlayer, PlayerRole, MatchEvent, PlayerMatchStats } from '../types';
import { getRoleCategory } from './database';

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getPositionalModifier = (familiarity: number): number => 0.5 + (familiarity / 200);

// Simplified overall team rating based on starting lineup for non-player matches
export const getUnitRatings = (teamId: number, clubs: Record<number, Club>, players: Record<number, Player>) => {
    const club = clubs[teamId];
    if (!club) return { def: 50, mid: 50, fwd: 50, gk: 50 };

    const lineupWithRoles = club.tactics.lineup.filter(lp => lp).map(lp => ({
        player: players[lp!.playerId],
        role: lp!.role
    })).filter(item => item.player) as { player: Player, role: PlayerRole }[];
    
    if (lineupWithRoles.length < 11) return { def: 50, mid: 50, fwd: 50, gk: 50 };

    const calculateAverage = (playersWithRoles: {player: Player, role: PlayerRole}[], attributes: (keyof PlayerAttributes)[]) => {
        if (playersWithRoles.length === 0) return 50;
        let totalAttributeSum = 0;
        for (const {player, role} of playersWithRoles) {
            const familiarity = player.positionalFamiliarity[role] || 20;
            const modifier = getPositionalModifier(familiarity);
            const playerAttributeSum = attributes.reduce((sum, attr) => sum + (player.attributes[attr] * modifier), 0);
            totalAttributeSum += playerAttributeSum / attributes.length;
        }
        return totalAttributeSum / playersWithRoles.length;
    }

    const gkPlayers = lineupWithRoles.filter(p => getRoleCategory(p.role) === 'GK');
    const defPlayers = lineupWithRoles.filter(p => getRoleCategory(p.role) === 'DEF');
    const midPlayers = lineupWithRoles.filter(p => getRoleCategory(p.role) === 'MID');
    const fwdPlayers = lineupWithRoles.filter(p => getRoleCategory(p.role) === 'FWD');

    const gkRating = calculateAverage(gkPlayers, ['positioning', 'strength']);
    const defRating = calculateAverage(defPlayers, ['tackling', 'positioning', 'strength', 'heading']);
    const midRating = calculateAverage(midPlayers, ['passing', 'creativity', 'teamwork', 'dribbling', 'workRate']);
    const fwdRating = calculateAverage(fwdPlayers, ['shooting', 'dribbling', 'pace', 'creativity', 'positioning']);

    return { def: defRating, mid: midRating, fwd: fwdRating, gk: gkRating };
}


// This function simulates non-player matches using an abstracted possession-based model.
export const runMatch = (match: Match, clubs: Record<number, Club>, players: Record<number, Player>): Match => {
    const homeRatings = getUnitRatings(match.homeTeamId, clubs, players);
    const awayRatings = getUnitRatings(match.awayTeamId, clubs, players);
    
    const homeMentality = clubs[match.homeTeamId].tactics.mentality;
    const awayMentality = clubs[match.awayTeamId].tactics.mentality;
    const mentalityMod = (mentality: Mentality, unit: 'def' | 'mid' | 'fwd') => {
        if (mentality === 'Defensive') return unit === 'def' ? 1.1 : (unit === 'fwd' ? 0.85 : 1.0);
        if (mentality === 'Offensive') return unit === 'fwd' ? 1.15 : (unit === 'def' ? 0.9 : 1.0);
        return 1.0;
    };

    const homeLineup = clubs[match.homeTeamId].tactics.lineup.filter(lp => lp) as LineupPlayer[];
    const awayLineup = clubs[match.awayTeamId].tactics.lineup.filter(lp => lp) as LineupPlayer[];
    const log: MatchEvent[] = [];
    const playerStats: Record<number, PlayerMatchStats> = {};

    [...homeLineup, ...awayLineup].forEach(p => {
        if (p) {
            playerStats[p.playerId] = { shots: 0, goals: 0, assists: 0, passes: 0, keyPasses: 0, tackles: 0, dribbles: 0, rating: 6.0 };
        }
    });

    // Possession simulation
    const homeMidfieldStrength = homeRatings.mid * mentalityMod(homeMentality, 'mid');
    const awayMidfieldStrength = awayRatings.mid * mentalityMod(awayMentality, 'mid');
    const totalMidfield = homeMidfieldStrength + awayMidfieldStrength;
    const homePossession = Math.round((homeMidfieldStrength / totalMidfield) * 100);

    // Game Volume simulation - total number of possessions in a game
    let totalPossessions = 120; // Average number of possessions
    if (homeMentality === 'Offensive' && awayMentality === 'Offensive') totalPossessions = 150;
    if (homeMentality === 'Defensive' && awayMentality === 'Defensive') totalPossessions = 90;

    let homeScore = 0;
    let awayScore = 0;
    const homeStats: MatchStats = { shots: 0, shotsOnTarget: 0, possession: homePossession, tackles: 0, passes: 0, passAccuracy: 0, fouls: 0, corners: 0, offsides: 0, xG: 0, bigChances: 0 };
    const awayStats: MatchStats = { shots: 0, shotsOnTarget: 0, possession: 100 - homePossession, tackles: 0, passes: 0, passAccuracy: 0, fouls: 0, corners: 0, offsides: 0, xG: 0, bigChances: 0 };

    for (let i = 0; i < totalPossessions; i++) {
        const hasPossession = Math.random() * 100 < homePossession ? 'home' : 'away';
        
        const attackRatings = hasPossession === 'home' ? homeRatings : awayRatings;
        const defenseRatings = hasPossession === 'home' ? awayRatings : homeRatings;
        const attackMentality = hasPossession === 'home' ? homeMentality : awayMentality;
        const defenseMentality = hasPossession === 'home' ? awayMentality : homeMentality;
        const attackStats = hasPossession === 'home' ? homeStats : awayStats;
        const defenseStats = hasPossession === 'home' ? awayStats : homeStats;
        const attackingLineup = hasPossession === 'home' ? homeLineup : awayLineup;

        // Progress from Midfield to Attack
        const midToFwdChance = (attackRatings.mid * mentalityMod(attackMentality, 'mid')) / (defenseRatings.mid * mentalityMod(defenseMentality, 'mid'));
        if (Math.random() < Math.max(0.1, Math.min(0.7, midToFwdChance * 0.4))) {
            // Ball is in attacking third, chance to shoot
            const fwdToShotChance = (attackRatings.fwd * mentalityMod(attackMentality, 'fwd')) / (defenseRatings.def * mentalityMod(defenseMentality, 'def'));
            if (Math.random() < Math.max(0.1, Math.min(0.8, fwdToShotChance * 0.5))) {
                // SHOT
                attackStats.shots++;
                const isBigChance = Math.random() < 0.2;
                const xG_value = isBigChance ? 0.4 : 0.12;
                attackStats.xG += xG_value;
                if(isBigChance) attackStats.bigChances++;

                const shootingTeamLineup = hasPossession === 'home' ? homeLineup : awayLineup;
                // FIX: Use getRoleCategory to correctly identify forwards.
                const potentialShooters = shootingTeamLineup.filter(p => p && getRoleCategory(p.role) === 'FWD');
                const shooter = pickRandom(potentialShooters.length > 0 ? potentialShooters : shootingTeamLineup);
                if (shooter) {
                    playerStats[shooter.playerId].shots++;
                    playerStats[shooter.playerId].rating = Math.min(10, playerStats[shooter.playerId].rating + 0.1);
                }

                // On target?
                if (Math.random() < 0.45) {
                    attackStats.shotsOnTarget++;
                    // Goal?
                    const goalProb = (attackRatings.fwd / (attackRatings.fwd + defenseRatings.gk)) * 0.8;
                    if (Math.random() < Math.max(0.05, goalProb)) {
                        if(hasPossession === 'home') homeScore++; else awayScore++;
                        if (shooter) {
                            playerStats[shooter.playerId].goals++;
                            playerStats[shooter.playerId].rating = Math.min(10, playerStats[shooter.playerId].rating + 1.2);
                            const minute = Math.floor(i / totalPossessions * 90) + 1;
                            log.push({ minute, type: 'Goal', text: `Goal for ${(hasPossession === 'home' ? clubs[match.homeTeamId].name : clubs[match.awayTeamId].name)}! Scored by ${players[shooter.playerId].name}.` });
                        }
                    }
                }
            } else {
                defenseStats.tackles++;
            }
        } else {
            defenseStats.tackles++;
            if (Math.random() < 0.2) { // Chance for a dribble on failed progression
                // FIX: Use getRoleCategory to correctly identify midfielders.
                const dribbler = pickRandom(attackingLineup.filter(p => p && getRoleCategory(p.role) === 'MID'));
                if (dribbler) playerStats[dribbler.playerId].dribbles++;
            }
        }
    }
    
    // Fill in other stats with plausible random numbers for flavour
    homeStats.passes = 300 + Math.floor(homePossession * 3.5);
    awayStats.passes = 300 + Math.floor((100 - homePossession) * 3.5);
    homeStats.passAccuracy = 75 + Math.floor(Math.random() * 15);
    awayStats.passAccuracy = 75 + Math.floor(Math.random() * 15);
    homeStats.fouls = Math.floor(Math.random() * 8) + 2;
    awayStats.fouls = Math.floor(Math.random() * 8) + 2;
    homeStats.corners = Math.floor(homeStats.shots / 5);
    awayStats.corners = Math.floor(awayStats.shots / 5);

    // Simplified event simulation for cards and injuries in AI matches
    const disciplinaryEvents: { playerId: number, type: 'yellow' | 'red' }[] = [];
    const injuryEvents: { playerId: number, returnDate: Date }[] = [];
    const yellowCards: Record<number, number> = {};

    const totalFouls = homeStats.fouls + awayStats.fouls;
    for(let i=0; i<totalFouls; i++) {
        const cardChance = 0.25; 
        if (Math.random() < cardChance) {
            const isHomeFoul = Math.random() < 0.5;
            const lineup = isHomeFoul ? homeLineup : awayLineup;
            const playerEntry = pickRandom(lineup.filter(Boolean));
            if (playerEntry) {
                const playerId = playerEntry.playerId;
                yellowCards[playerId] = (yellowCards[playerId] || 0) + 1;
                if (yellowCards[playerId] === 2) {
                    disciplinaryEvents.push({ playerId, type: 'red' });
                } else {
                    disciplinaryEvents.push({ playerId, type: 'yellow' });
                }
            }
        }
    }

    const injuryChancePerMatch = 0.40; 
    if (Math.random() < injuryChancePerMatch) {
        const isHomeInjury = Math.random() < 0.5;
        const lineup = isHomeInjury ? homeLineup : awayLineup;
        const playerEntry = pickRandom(lineup.filter(Boolean));
        if (playerEntry) {
            const returnDate = new Date(match.date);
            returnDate.setDate(returnDate.getDate() + Math.floor(Math.random() * 21) + 7); // 7-28 days
            injuryEvents.push({ playerId: playerEntry.playerId, returnDate });
        }
    }


    log.sort((a, b) => a.minute - b.minute);

    return { ...match, homeScore, awayScore, homeStats, awayStats, log, playerStats, homeLineup, awayLineup, disciplinaryEvents, injuryEvents };
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