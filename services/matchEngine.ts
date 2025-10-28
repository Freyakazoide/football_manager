import { GameState, LiveMatchState, MatchDayInfo, Club, Player, LivePlayer, MatchEvent, Mentality, MatchStats, PlayerMatchStats, PlayerRole, Formation } from '../types';
import { commentary } from './commentary';

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const formatCommentary = (template: string, replacements: Record<string, string>): string => {
    let result = template;
    for (const key in replacements) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacements[key]);
    }
    return result;
}

const formationRoleMappings: Record<Formation, PlayerRole[]> = {
    '4-4-2': ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
    '4-3-3': ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'RW', 'ST', 'LW'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'CM', 'LM', 'ST', 'ST'],
    '5-3-2': ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'ST', 'ST'],
};

const getPlayerByRole = (players: LivePlayer[], roles: PlayerRole[]): LivePlayer | null => {
    const candidates = players.filter(p => !p.isSentOff && roles.includes(p.role));
    return pickRandom(candidates) || null;
}

const getNearestOpponent = (player: LivePlayer, zone: number, opponents: LivePlayer[]): LivePlayer | null => {
    // This is a simplified logic, a real engine would be more complex
    const opponentRoles: Record<PlayerRole, PlayerRole[]> = {
        'ST': ['CB', 'GK'], 'RW': ['LB', 'CB'], 'LW': ['RB', 'CB'],
        'AM': ['DM', 'CB'], 'CM': ['CM', 'DM'], 'RM': ['LM', 'LB'], 'LM': ['RM', 'RB'],
        'DM': ['AM', 'ST'], 'RB': ['LW', 'LM'], 'LB': ['RW', 'RM'], 'CB': ['ST'], 'GK': ['ST']
    };
    return getPlayerByRole(opponents, opponentRoles[player.role]) || getPlayerByRole(opponents, ['CB', 'DM', 'CM']);
}

const initialPlayerStats: PlayerMatchStats = { shots: 0, goals: 0, assists: 0, passes: 0, keyPasses: 0, tackles: 0, dribbles: 0, rating: 6.0 };

export const createLiveMatchState = (matchInfo: MatchDayInfo, clubs: Record<number, Club>, players: Record<number, Player>): LiveMatchState => {
    const { match, homeTeam, awayTeam } = matchInfo;
    const homeRoles = formationRoleMappings[homeTeam.tactics.formation];
    const awayRoles = formationRoleMappings[awayTeam.tactics.formation];

    const toLivePlayer = (pId: number | null, index: number, roles: PlayerRole[]): LivePlayer | null => {
        if (!pId) return null;
        const p = players[pId];
        return { 
            id: p.id, name: p.name, position: p.position, role: roles[index],
            attributes: p.attributes, stamina: 100, yellowCards: 0, isSentOff: false,
            stats: { ...initialPlayerStats }
        };
    };

    const homeLineup = homeTeam.tactics.lineup.map((pId, i) => toLivePlayer(pId, i, homeRoles)).filter(p => p) as LivePlayer[];
    const homeBench = homeTeam.tactics.bench.map((pId, i) => toLivePlayer(pId, i + 11, [])).filter(p => p) as LivePlayer[]; // Bench roles are less strict
    const awayLineup = awayTeam.tactics.lineup.map((pId, i) => toLivePlayer(pId, i, awayRoles)).filter(p => p) as LivePlayer[];
    const awayBench = awayTeam.tactics.bench.map((pId, i) => toLivePlayer(pId, i + 11, [])).filter(p => p) as LivePlayer[];
    
    const initialStats: MatchStats = { shots: 0, shotsOnTarget: 0, possession: 0, tackles: 0, passes: 0, passAccuracy: 0, fouls: 0, corners: 0, offsides: 0, xG: 0, bigChances: 0 };

    return {
        matchId: match.id,
        homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name, awayTeamName: awayTeam.name,
        minute: 0, homeScore: 0, awayScore: 0,
        homeLineup, awayLineup, homeBench, awayBench,
        homeSubsMade: 0, awaySubsMade: 0,
        log: [{ minute: 0, text: "The match is about to begin!", type: 'Info' }],
        isPaused: true,
        status: 'pre-match',
        homeMentality: homeTeam.tactics.mentality,
        awayMentality: awayTeam.tactics.mentality,
        refereeStrictness: 0.8 + Math.random() * 0.4,
        homeStats: { ...initialStats },
        awayStats: { ...initialStats },
        attackingTeamId: homeTeam.id,
        ballCarrierId: null,
        ballZone: 5, // Kick-off in the center circle
    };
};

const fatigueMod = (stamina: number) => (stamina / 100) * 0.75 + 0.25;

export const runMinute = (state: LiveMatchState): { newState: LiveMatchState, newEvents: MatchEvent[] } => {
    const newState = JSON.parse(JSON.stringify(state)) as LiveMatchState;
    const newEvents: MatchEvent[] = [];
    newState.minute++;

    if (newState.minute === 1) { newState.status = 'first-half'; newEvents.push({ minute: 1, text: "The first half kicks off!", type: 'Info' }); }
    if (newState.minute === 45) {
        newState.status = 'half-time'; newState.isPaused = true;
        newEvents.push({ minute: 45, text: "Half-time. The players head to the tunnel for a rest.", type: 'Info' });
        [...newState.homeLineup, ...newState.awayLineup].forEach(p => {
            p.stamina = Math.min(100, p.stamina + (100 - p.stamina) * (p.attributes.naturalFitness / 500));
        });
    }
    if (newState.minute === 46) { newState.status = 'second-half'; newEvents.push({ minute: 46, text: "The second half begins!", type: 'Info' }); }
    if (newState.minute >= 90) {
        newState.status = 'full-time'; newState.isPaused = true;
        newEvents.push({ minute: 90, text: "Full-time. The referee blows the final whistle.", type: 'Info' });
    }

    [...newState.homeLineup, ...newState.awayLineup].forEach(p => {
        if(!p.isSentOff) p.stamina = Math.max(0, p.stamina - (0.3 * (p.attributes.workRate / 70) / (1 + p.attributes.stamina / 150)));
    });

    if (newState.status !== 'first-half' && newState.status !== 'second-half') {
        newState.log.push(...newEvents);
        return { newState, newEvents };
    }

    // Determine who has the ball if it's a reset (kickoff, goal kick)
    if (!newState.ballCarrierId) {
        const startingPlayer = getPlayerByRole(newState.homeLineup, ['CM', 'ST']);
        if(startingPlayer) {
            newState.ballCarrierId = startingPlayer.id;
            newState.attackingTeamId = newState.homeTeamId;
            newState.ballZone = 5;
        } else { // No one to start with, something is wrong
            newState.log.push(...newEvents);
            return { newState, newEvents };
        }
    }

    const isHomeAttacking = newState.attackingTeamId === newState.homeTeamId;
    const attackingTeam = isHomeAttacking ? newState.homeLineup : newState.awayLineup;
    const defendingTeam = isHomeAttacking ? newState.awayLineup : newState.homeLineup;
    const attackingMentality = isHomeAttacking ? newState.homeMentality : newState.awayMentality;
    const attackingStats = isHomeAttacking ? newState.homeStats : newState.awayStats;
    const defendingStats = isHomeAttacking ? newState.awayStats : newState.homeStats;

    const ballCarrier = attackingTeam.find(p => p.id === newState.ballCarrierId);
    if (!ballCarrier || ballCarrier.isSentOff) { // Ball carrier sent off or doesn't exist
        const newCarrier = getPlayerByRole(defendingTeam, ['CB', 'DM']);
        if(newCarrier) {
             newState.ballCarrierId = newCarrier.id;
             newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
             newEvents.push({minute: newState.minute, text: `The ball is loose, and ${newCarrier.name} picks it up.`, type: 'Info'});
        }
        newState.log.push(...newEvents);
        return {newState, newEvents};
    }
    
    const opponent = getNearestOpponent(ballCarrier, newState.ballZone, defendingTeam);
    if (!opponent) { newState.log.push(...newEvents); return {newState, newEvents}; }

    const commentaryContext = { ballCarrier: ballCarrier.name, opponent: opponent.name };

    // Player action decision logic
    const willPass = (ballCarrier.attributes.passing + ballCarrier.attributes.teamwork) > (ballCarrier.attributes.dribbling * (attackingMentality === 'Offensive' ? 1.2 : 0.9));
    const isInShootingZone = (isHomeAttacking && newState.ballZone >= 7) || (!isHomeAttacking && newState.ballZone <= 3);

    if (isInShootingZone && Math.random() < ballCarrier.attributes.shooting / 150) {
        // --- SHOT ---
        const shotPower = (ballCarrier.attributes.shooting * 1.5) * fatigueMod(ballCarrier.stamina);
        const pressure = opponent.attributes.positioning * 0.5 * fatigueMod(opponent.stamina);
        const keeper = getPlayerByRole(defendingTeam, ['GK'])!;
        const keeperPower = (keeper.attributes.positioning * 1.2) * fatigueMod(keeper.stamina);
        
        attackingStats.shots++;
        ballCarrier.stats.shots++;

        newEvents.push({minute: newState.minute, text: formatCommentary(pickRandom(commentary.highlight), {creatorName: ballCarrier.name, attackerName: ballCarrier.name}), type: 'Highlight'});
        attackingStats.bigChances++;
        attackingStats.xG += 0.40;

        if (shotPower * Math.random() > (keeperPower + pressure) * Math.random()) {
            // GOAL
            newEvents.push({ minute: newState.minute, text: formatCommentary(pickRandom(commentary.goal), { attackerName: ballCarrier.name, assistMaker: '' }), type: 'Goal' });
            attackingStats.shotsOnTarget++;
            ballCarrier.stats.goals++;
            ballCarrier.stats.rating = Math.min(10, ballCarrier.stats.rating + 1.5);
            if (isHomeAttacking) newState.homeScore++; else newState.awayScore++;
            newState.ballCarrierId = null; // Reset for kickoff
        } else {
             newEvents.push({ minute: newState.minute, text: formatCommentary(pickRandom(commentary.save), { keeperName: keeper.name, attackerName: ballCarrier.name }), type: 'Chance' });
             attackingStats.shotsOnTarget++;
             if (Math.random() < 0.4) {
                 newEvents.push({ minute: newState.minute, text: `Corner kick for ${isHomeAttacking ? newState.homeTeamName : newState.awayTeamName}.`, type: 'Corner'});
                 attackingStats.corners++;
             }
        }

    } else if (willPass) {
        // --- PASS ---
        const passTarget = getPlayerByRole(attackingTeam, ['ST', 'CM', 'AM', 'LW', 'RW']);
        if (passTarget) {
            const passQuality = (ballCarrier.attributes.passing + ballCarrier.attributes.creativity) * fatigueMod(ballCarrier.stamina);
            const interceptionQuality = (opponent.attributes.positioning + opponent.attributes.workRate) * fatigueMod(opponent.stamina);

            if (passQuality * Math.random() > interceptionQuality * Math.random()) {
                ballCarrier.stats.passes++;
                attackingStats.passes++;
                newState.ballCarrierId = passTarget.id;
                // Move ball zone logically
                if (isHomeAttacking) newState.ballZone = Math.min(9, newState.ballZone + 1 + Math.floor(Math.random()*2));
                else newState.ballZone = Math.max(1, newState.ballZone - 1 - Math.floor(Math.random()*2));
            } else { // Interception
                newEvents.push({minute: newState.minute, text: formatCommentary(commentary.interception[0], {interceptor: opponent.name, intendedTarget: passTarget.name}), type: 'Tackle'});
                defendingStats.tackles++;
                opponent.stats.tackles++;
                opponent.stats.rating = Math.min(10, opponent.stats.rating + 0.2);
                newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
                newState.ballCarrierId = opponent.id;
            }
        }
    } else {
        // --- DRIBBLE ---
        const dribblePower = (ballCarrier.attributes.dribbling + ballCarrier.attributes.pace) * fatigueMod(ballCarrier.stamina);
        const tacklePower = (opponent.attributes.tackling + opponent.attributes.pace) * fatigueMod(opponent.stamina);
        
        if (dribblePower * Math.random() > tacklePower * Math.random()) {
             ballCarrier.stats.dribbles++;
             if (isHomeAttacking) newState.ballZone = Math.min(9, newState.ballZone + 1);
             else newState.ballZone = Math.max(1, newState.ballZone - 1);
        } else { // Tackled
             newEvents.push({minute: newState.minute, text: formatCommentary(pickRandom(commentary.tackle), {defenderName: opponent.name, creatorName: ballCarrier.name}), type: 'Tackle'});
             defendingStats.tackles++;
             opponent.stats.tackles++;
             opponent.stats.rating = Math.min(10, opponent.stats.rating + 0.2);
             newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
             newState.ballCarrierId = opponent.id;
        }
    }

    if (attackingStats.passes > 10) {
        const successfulPasses = attackingStats.passes - (attackingStats.passes * (Math.random() * 0.2 + 0.1)); // 10-30% inaccuracy
        attackingStats.passAccuracy = (successfulPasses / attackingStats.passes) * 100;
    }

    newState.log.push(...newEvents);
    return { newState, newEvents };
};