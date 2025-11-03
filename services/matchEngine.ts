
import { GameState, LiveMatchState, MatchDayInfo, Club, Player, LivePlayer, MatchEvent, Mentality, MatchStats, PlayerMatchStats, PlayerRole, LineupPlayer, TacklingInstruction, ShootingInstruction, DribblingInstruction, PassingInstruction, PressingInstruction, PositioningInstruction, CrossingInstruction, MarkingInstruction, PlayerAttributes } from '../types';
import { commentary } from './commentary';
import { getRoleCategory } from './database';
import { createDefaultInstructions } from './aiTacticsService';

// Helper function to convert a Player to a LivePlayer
const createLivePlayer = (player: Player, lineupPlayer: LineupPlayer): LivePlayer => {
    return {
        id: player.id,
        name: player.name,
        attributes: player.attributes,
        stamina: 100, // Starts fresh
        yellowCardCount: 0,
        isSentOff: false,
        isInjured: false,
        stats: {
            shots: 0, goals: 0, assists: 0, keyPasses: 0, passes: 0,
            tackles: 0, dribbles: 0, rating: 6.0,
        },
        role: lineupPlayer.role,
        instructions: lineupPlayer.instructions,
        currentPosition: lineupPlayer.position,
        positionalFamiliarity: player.positionalFamiliarity,
        morale: player.morale,
        matchFitness: player.matchFitness,
    };
};

export const createLiveMatchState = (
    matchDayInfo: MatchDayInfo,
    clubs: Record<number, Club>,
    players: Record<number, Player>,
    playerClubId: number
): LiveMatchState => {
    const { match, homeTeam, awayTeam } = matchDayInfo;

    const createTeamLineup = (lineup: (LineupPlayer | null)[]): LivePlayer[] => {
        return lineup
            .filter((lp): lp is LineupPlayer => lp !== null)
            .map(lp => createLivePlayer(players[lp.playerId], lp));
    };
    
    const createTeamBench = (bench: (number | null)[]): LivePlayer[] => {
        return bench
            .filter((pId): pId is number => pId !== null)
            .map(pId => {
                const player = players[pId];
                // Create a dummy LineupPlayer for bench players
                const dummyLineupPlayer: LineupPlayer = {
                    playerId: pId,
                    position: { x: -1, y: -1 }, // Not on pitch
                    role: player.naturalPosition,
                    instructions: createDefaultInstructions(),
                };
                return createLivePlayer(player, dummyLineupPlayer);
            });
    };

    const homeLineup = createTeamLineup(homeTeam.tactics.lineup);
    const awayLineup = createTeamLineup(awayTeam.tactics.lineup);
    const homeBench = createTeamBench(homeTeam.tactics.bench);
    const awayBench = createTeamBench(awayTeam.tactics.bench);

    const initialStats: MatchStats = {
        shots: 0, shotsOnTarget: 0, possession: 0, tackles: 0, passes: 0,
        passAccuracy: 0, fouls: 0, corners: 0, offsides: 0, xG: 0, bigChances: 0,
    };

    return {
        matchId: match.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        minute: 0,
        homeScore: 0,
        awayScore: 0,
        homeLineup,
        awayLineup,
        homeBench,
        awayBench,
        homeSubsMade: 0,
        awaySubsMade: 0,
        log: [],
        isPaused: true, // Start paused for pre-match screen
        status: 'pre-match',
        homeMentality: homeTeam.tactics.mentality,
        awayMentality: awayTeam.tactics.mentality,
        refereeStrictness: Math.random(),
        homeStats: { ...initialStats },
        awayStats: { ...initialStats },
        attackingTeamId: homeTeam.id, // Home team starts with possession
        ballCarrierId: null,
        ballZone: 4, // Midfield
        playerTeamId: playerClubId,
        isKeyPassOpportunity: false,
        homePossessionMinutes: 0,
        awayPossessionMinutes: 0,
        initialHomeLineupIds: homeTeam.tactics.lineup.filter(Boolean).map(lp => lp!.playerId),
        initialAwayLineupIds: awayTeam.tactics.lineup.filter(Boolean).map(lp => lp!.playerId),
        initialHomeLineup: homeTeam.tactics.lineup,
        initialAwayLineup: awayTeam.tactics.lineup,
        lastPasser: null,
        forcedSubstitution: null,
        injuredPlayerIds: [],
        homeCohesion: homeTeam.teamCohesion,
        awayCohesion: awayTeam.teamCohesion,
    };
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const formatCommentary = (template: string, replacements: Record<string, string>): string => {
    let result = template;
    for (const key in replacements) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacements[key]);
    }
    return result;
}

const getPlayerByRole = (players: LivePlayer[], roles: PlayerRole[]): LivePlayer | null => {
    const candidates = players.filter(p => !p.isSentOff && !p.isInjured && roles.includes(p.role));
    return pickRandom(candidates) || null;
}

const getNearestOpponent = (player: LivePlayer, zone: number, opponents: LivePlayer[]): LivePlayer | null => {
    const activeOpponents = opponents.filter(p => !p.isSentOff && !p.isInjured);
    if (activeOpponents.length === 0) return null;

    const playerRoleCat = getRoleCategory(player.role);
    let opponentCandidates: LivePlayer[] = [];

    // Find direct positional opponents first
    if (playerRoleCat === 'FWD') {
        opponentCandidates = activeOpponents.filter(p => getRoleCategory(p.role) === 'DEF');
    }
    return null;
}

// A helper to determine action success based on stats and randomness
const getActionSuccess = (attackerStat: number, defenderStat: number, baseChance: number, staminaModifier: number): boolean => {
    const statDifference = attackerStat - defenderStat;
    // Each point of difference is 0.5% chance change. Stamina modifier is small.
    const chance = baseChance + (statDifference / 200) + staminaModifier;
    return Math.random() < Math.max(0.05, Math.min(0.95, chance));
};

export const runMinute = (state: LiveMatchState): { newState: LiveMatchState; newEvents: MatchEvent[] } => {
    const newState: LiveMatchState = JSON.parse(JSON.stringify(state));
    const newEvents: MatchEvent[] = [];

    // --- 1. MINUTE AND STATUS UPDATE ---
    newState.minute++;

    if (newState.status === 'first-half' && newState.minute >= 45) {
        newState.status = 'half-time';
        newState.isPaused = true;
        newEvents.push({ minute: newState.minute, text: "The referee blows for half-time.", type: 'Info' });
        return { newState, newEvents };
    }
    if (newState.status === 'second-half' && newState.minute >= 90 + (newState.log.length / 10)) { // Simple stoppage time
        newState.status = 'full-time';
        newState.isPaused = true;
        newEvents.push({ minute: newState.minute, text: "Full time! The referee ends the match.", type: 'Info' });
        return { newState, newEvents };
    }
    if (newState.status === 'half-time' && !newState.isPaused) {
        newState.status = 'second-half';
        newState.attackingTeamId = newState.awayTeamId; // Away team starts second half
        newState.ballCarrierId = null;
        newState.ballZone = 2; // Midfield kickoff
    }
     // Handle kickoff at start
    if (newState.status === 'pre-match' && !newState.isPaused) {
        newState.status = 'first-half';
    }


    // --- 2. STAMINA DRAIN ---
    [...newState.homeLineup, ...newState.awayLineup].forEach(p => {
        if (!p.isSentOff) {
            p.stamina = Math.max(0, p.stamina - (0.3 / (p.attributes.naturalFitness / 100)));
        }
    });

    // --- 3. TEAM POSSESSION ---
    let attackingTeam = newState.attackingTeamId === newState.homeTeamId ? newState.homeLineup : newState.awayLineup;
    let defendingTeam = newState.attackingTeamId === newState.homeTeamId ? newState.awayLineup : newState.homeLineup;
    let attackingTeamName = newState.attackingTeamId === newState.homeTeamId ? newState.homeTeamName : newState.awayTeamName;
    let attackingStats = newState.attackingTeamId === newState.homeTeamId ? newState.homeStats : newState.awayStats;

    const turnover = (interceptor?: LivePlayer) => {
        newState.attackingTeamId = (newState.attackingTeamId === newState.homeTeamId) ? newState.awayTeamId : newState.homeTeamId;
        newState.ballCarrierId = interceptor ? interceptor.id : null;
        if (newState.ballZone === 1) newState.ballZone = 3;
        else if (newState.ballZone === 3) newState.ballZone = 1;
    };
    
    if (!newState.ballCarrierId) {
        const teamForKickoff = newState.attackingTeamId === newState.homeTeamId ? newState.homeLineup : newState.awayLineup;
        const midfielders = teamForKickoff.filter(p => getRoleCategory(p.role) === 'MID' && !p.isSentOff);
        const carrier = pickRandom(midfielders.length > 0 ? midfielders : teamForKickoff.filter(p=>!p.isSentOff));
        if (carrier) newState.ballCarrierId = carrier.id;
        else return { newState, newEvents }; // No players left
    }

    let carrier = attackingTeam.find(p => p.id === newState.ballCarrierId);
    if (!carrier) {
        turnover();
        return { newState, newEvents };
    }
    carrier.stamina = Math.max(0, carrier.stamina - 0.2); // Extra drain for carrier
    const staminaMod = (carrier.stamina - 50) / 1000;

    const opponent = getNearestOpponent(carrier, newState.ballZone, defendingTeam);

    // --- 4. ACTION SIMULATION ---
    if (newState.ballZone === 1) { // Defensive Zone
        // FIX: Replaced non-existent 'pressing' attribute with 'aggression'.
        if (getActionSuccess(carrier.attributes.passing, opponent?.attributes.aggression || 40, 0.8, staminaMod)) {
            newState.ballZone = 2;
            const target = getPlayerByRole(attackingTeam, ['Volante', 'Meio-campista', 'Construtor de Jogo Recuado']);
            if (target) { newState.ballCarrierId = target.id; newEvents.push({ minute: newState.minute, text: `${carrier.name} brings the ball out from the back.`, type: 'Info' }); }
        } else { newEvents.push({ minute: newState.minute, text: `${opponent?.name || 'An attacker'} presses high and forces a turnover!`, type: 'Tackle' }); turnover(opponent); }
    } 
    else if (newState.ballZone === 2) { // Midfield Zone
        const actionRoll = Math.random();
        if (actionRoll < 0.65) { // Pass
            if (getActionSuccess(carrier.attributes.passing, opponent?.attributes.tackling || 40, 0.75, staminaMod)) {
                newState.ballZone = 3;
                const target = getPlayerByRole(attackingTeam, ['Meia Atacante', 'Atacante Sombra', 'Falso Nove', 'Atacante']);
                if (target) { newState.ballCarrierId = target.id; newEvents.push({ minute: newState.minute, text: `${carrier.name} plays a through ball to ${target.name}!`, type: 'Highlight' }); }
            } else { newEvents.push({ minute: newState.minute, text: `${opponent?.name || 'A midfielder'} intercepts a pass from ${carrier.name}.`, type: 'Tackle' }); turnover(opponent); }
        } else { // Dribble
            if (getActionSuccess(carrier.attributes.dribbling, opponent?.attributes.tackling || 40, 0.45, staminaMod)) {
                newState.ballZone = 3;
                newEvents.push({ minute: newState.minute, text: `${carrier.name} goes on a surging run into the final third.`, type: 'Highlight' });
            } else { newEvents.push({ minute: newState.minute, text: `A strong tackle from ${opponent?.name || 'a defender'} stops ${carrier.name}.`, type: 'Tackle' }); turnover(opponent); }
        }
    } 
    else if (newState.ballZone === 3) { // Attacking Zone
        if (getActionSuccess(carrier.attributes.creativity, opponent?.attributes.positioning || 40, 0.5, staminaMod)) { // Chance for a key pass/shot
            attackingStats.shots++;
            carrier.stats.shots++;
            const keeper = getPlayerByRole(defendingTeam, ['Goleiro', 'Goleiro Líbero']);
            if (!keeper) { // Automatic goal if no keeper
                 if (newState.attackingTeamId === newState.homeTeamId) newState.homeScore++; else newState.awayScore++;
                 carrier.stats.goals++;
                 newEvents.push({ minute: newState.minute, text: `GOAL! ${carrier.name} scores for ${attackingTeamName}!`, type: 'Goal', primaryPlayerId: carrier.id });
                 newState.ballCarrierId = null; 
            } else {
                if (!getActionSuccess(keeper.attributes.positioning, carrier.attributes.shooting, 0.75, (keeper.stamina - 50) / 1000)) { // GOAL
                    attackingStats.shotsOnTarget++;
                    if (newState.attackingTeamId === newState.homeTeamId) newState.homeScore++; else newState.awayScore++;
                    carrier.stats.goals++;
                    const lastPasserName = newState.lastPasser?.playerId ? (attackingTeam.find(p=>p.id === newState.lastPasser?.playerId)?.name || 'a teammate') : 'a teammate';
                    newEvents.push({ minute: newState.minute, text: formatCommentary(commentary.goal[0], {attackerName: carrier.name, assistMaker: lastPasserName}), type: 'Goal', primaryPlayerId: carrier.id, secondaryPlayerId: newState.lastPasser?.playerId });
                    newState.ballCarrierId = null;
                } else { // SAVE
                    attackingStats.shotsOnTarget++;
                    newEvents.push({ minute: newState.minute, text: `Save! ${keeper.name} denies ${carrier.name}!`, type: 'Info' });
                    turnover(keeper);
                }
            }
        } else {
            newEvents.push({ minute: newState.minute, text: `The attack breaks down as ${carrier.name} is closed down.`, type: 'Info' });
            turnover(opponent);
        }
    }
    
    // Update possession
    if (newState.attackingTeamId === newState.homeTeamId) newState.homePossessionMinutes++;
    else newState.awayPossessionMinutes++;

    return { newState, newEvents };
};