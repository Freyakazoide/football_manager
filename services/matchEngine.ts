import { GameState, LiveMatchState, MatchDayInfo, Club, Player, LivePlayer, MatchEvent, Mentality, MatchStats, PlayerMatchStats, PlayerRole, LineupPlayer, TacklingInstruction, ShootingInstruction, DribblingInstruction, PassingInstruction, PressingInstruction, PositioningInstruction, CrossingInstruction, MarkingInstruction } from '../types';
import { commentary } from './commentary';
import { getRoleCategory } from './database';

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
    } else if (playerRoleCat === 'MID') {
        opponentCandidates = activeOpponents.filter(p => getRoleCategory(p.role) === 'MID');
    } else if (playerRoleCat === 'DEF') {
        opponentCandidates = activeOpponents.filter(p => getRoleCategory(p.role) === 'FWD');
    }
    
    // If no direct opponents, broaden the search
    if (opponentCandidates.length === 0) {
        if (playerRoleCat === 'FWD') {
            opponentCandidates = activeOpponents.filter(p => getRoleCategory(p.role) === 'MID');
        } else if (playerRoleCat === 'MID') {
            opponentCandidates = activeOpponents.filter(p => ['DEF', 'FWD'].includes(getRoleCategory(p.role)));
        } else { // DEF or GK
            opponentCandidates = activeOpponents.filter(p => getRoleCategory(p.role) === 'MID');
        }
    }

    // If still no one, just pick anyone
    if (opponentCandidates.length === 0) {
        return pickRandom(activeOpponents);
    }
    
    return pickRandom(opponentCandidates);
};


const initialPlayerStats: PlayerMatchStats = { shots: 0, goals: 0, assists: 0, passes: 0, keyPasses: 0, tackles: 0, dribbles: 0, rating: 6.0 };

export const createLiveMatchState = (matchInfo: MatchDayInfo, clubs: Record<number, Club>, players: Record<number, Player>, playerTeamId: number): LiveMatchState => {
    const { match, homeTeam, awayTeam } = matchInfo;

    const toLivePlayer = (lineupPlayer: LineupPlayer | null, isBench: boolean, benchPlayerId?: number | null): LivePlayer | null => {
        const pId = isBench ? benchPlayerId : lineupPlayer?.playerId;
        if (!pId) return null;
        const p = players[pId];
        return { 
            id: p.id, name: p.name,
            attributes: p.attributes, stamina: 100, yellowCardCount: 0, isSentOff: false, isInjured: false,
            stats: { ...initialPlayerStats },
            role: lineupPlayer?.role || p.naturalPosition,
            instructions: lineupPlayer?.instructions || ({} as any),
            currentPosition: lineupPlayer?.position || {x:0, y:0},
            positionalFamiliarity: p.positionalFamiliarity,
            morale: p.morale,
            matchFitness: p.matchFitness,
        };
    };

    const homeLineup = homeTeam.tactics.lineup.map((lp) => toLivePlayer(lp, false)).filter(p => p) as LivePlayer[];
    const homeBench = homeTeam.tactics.bench.map((pId) => toLivePlayer(null, true, pId)).filter(p => p) as LivePlayer[];
    const awayLineup = awayTeam.tactics.lineup.map((lp) => toLivePlayer(lp, false)).filter(p => p) as LivePlayer[];
    const awayBench = awayTeam.tactics.bench.map((pId) => toLivePlayer(null, true, pId)).filter(p => p) as LivePlayer[];
    
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
        playerTeamId,
        isKeyPassOpportunity: false,
        homePossessionMinutes: 0,
        awayPossessionMinutes: 0,
        initialHomeLineupIds: homeLineup.map(p => p.id),
        initialAwayLineupIds: awayLineup.map(p => p.id),
        initialHomeLineup: homeTeam.tactics.lineup,
        initialAwayLineup: awayTeam.tactics.lineup,
        lastPasser: null,
        forcedSubstitution: null,
        injuredPlayerIds: [],
    };
};

const fatigueMod = (stamina: number) => (stamina / 100) * 0.75 + 0.25;
const fitnessMod = (matchFitness: number) => 0.5 + (matchFitness / 200);
const moraleMod = (morale: number) => 0.75 + (morale / 400);
const getPositionalModifier = (familiarity: number): number => 0.5 + (familiarity / 200);

export const runMinute = (state: LiveMatchState): { newState: LiveMatchState, newEvents: MatchEvent[] } => {
    const newState = JSON.parse(JSON.stringify(state)) as LiveMatchState;
    const newEvents: MatchEvent[] = [];
    newState.minute++;

    // --- DYNAMIC AI TACTICS ---
    const isAITeamHome = newState.homeTeamId !== newState.playerTeamId;
    const aiTeam = isAITeamHome ? newState.homeLineup : newState.awayLineup;
    const aiTeamMentality = isAITeamHome ? newState.homeMentality : newState.awayMentality;
    const aiScore = isAITeamHome ? newState.homeScore : newState.awayScore;
    const playerScore = isAITeamHome ? newState.awayScore : newState.homeScore;

    if (newState.minute > 75) {
        if (aiScore < playerScore && aiTeamMentality !== 'Offensive') {
            if (isAITeamHome) newState.homeMentality = 'Offensive';
            else newState.awayMentality = 'Offensive';
            newEvents.push({ minute: newState.minute, text: `${isAITeamHome ? newState.homeTeamName : newState.awayTeamName} are going all out attack!`, type: 'Info' });
        } else if (aiScore > playerScore && aiTeamMentality !== 'Defensive') {
            if (isAITeamHome) newState.homeMentality = 'Defensive';
            else newState.awayMentality = 'Defensive';
            newEvents.push({ minute: newState.minute, text: `${isAITeamHome ? newState.homeTeamName : newState.awayTeamName} are looking to shut up shop.`, type: 'Info' });
        }
    }


    const homePlayerCount = newState.homeLineup.filter(p => !p.isSentOff).length;
    const awayPlayerCount = newState.awayLineup.filter(p => !p.isSentOff).length;
    let homeMod = 1.0;
    let awayMod = 1.0;
    if (homePlayerCount > awayPlayerCount) {
        homeMod = 1.10; // 10% bonus
        awayMod = 0.85; // 15% penalty
    } else if (awayPlayerCount > homePlayerCount) {
        homeMod = 0.85; // 15% penalty
        awayMod = 1.10; // 10% bonus
    }

    const updateRating = (player: LivePlayer | undefined, change: number) => {
        if (player) {
            player.stats.rating = Math.max(3.0, Math.min(10, player.stats.rating + change));
        }
    };

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
    // Stamina drain based on work rate and instructions
    [...newState.homeLineup, ...newState.awayLineup].forEach(p => {
        if(!p.isSentOff) {
            let drain = 0.3 * (p.attributes.workRate / 70) / (1 + p.attributes.stamina / 150);
            if (p.instructions.pressing === PressingInstruction.Urgent) drain *= 1.3;
            if (p.instructions.positioning === PositioningInstruction.GetForward) drain *= 1.2;
            if (p.instructions.dribbling === DribblingInstruction.DribbleMore) drain *= 1.1;
            p.stamina = Math.max(0, p.stamina - drain);
        }
    });

    if (newState.status === 'first-half' || newState.status === 'second-half') {
        if (newState.attackingTeamId === newState.homeTeamId) {
            newState.homePossessionMinutes++;
        } else {
            newState.awayPossessionMinutes++;
        }
    }

    if (newState.status !== 'first-half' && newState.status !== 'second-half') {
        newState.log.push(...newEvents);
        return { newState, newEvents };
    }

    if (!newState.ballCarrierId) {
        const activePlayers = newState.homeLineup.filter(p => !p.isSentOff && !p.isInjured);
        let startingPlayer = pickRandom(activePlayers.filter(p => getRoleCategory(p.role) === 'FWD'));
        if (!startingPlayer) {
            startingPlayer = pickRandom(activePlayers.filter(p => getRoleCategory(p.role) === 'MID'));
        }
        
        if (startingPlayer) {
            newState.ballCarrierId = startingPlayer.id;
            newState.attackingTeamId = newState.homeTeamId;
            newState.ballZone = 5;
        } else {
            const anyPlayer = pickRandom(activePlayers);
            if(anyPlayer) {
                 newState.ballCarrierId = anyPlayer.id;
                 newState.attackingTeamId = newState.homeTeamId;
                 newState.ballZone = 5;
            } else {
                newState.log.push(...newEvents);
                return { newState, newEvents };
            }
        }
    }

    const isHomeAttacking = newState.attackingTeamId === newState.homeTeamId;
    const attackingTeam = isHomeAttacking ? newState.homeLineup : newState.awayLineup;
    const defendingTeam = isHomeAttacking ? newState.awayLineup : newState.homeLineup;
    const attackingMentality = isHomeAttacking ? newState.homeMentality : newState.awayMentality;
    const attackingStats = isHomeAttacking ? newState.homeStats : newState.awayStats;
    const defendingStats = isHomeAttacking ? newState.awayStats : newState.homeStats;

    const ballCarrier = attackingTeam.find(p => p.id === newState.ballCarrierId && !p.isSentOff && !p.isInjured);
    if (!ballCarrier) {
        const newCarrier = getPlayerByRole(defendingTeam, ['Central Defender', 'Defensive Midfielder']);
        if(newCarrier) {
             newState.ballCarrierId = newCarrier.id;
             newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
             newEvents.push({minute: newState.minute, text: `The ball is loose, and ${newCarrier.name} picks it up.`, type: 'Info', primaryPlayerId: newCarrier.id});
             newState.lastPasser = null;
        }
        newState.log.push(...newEvents);
        return {newState, newEvents};
    }
    
    const opponent = getNearestOpponent(ballCarrier, newState.ballZone, defendingTeam);
    if (!opponent) { newState.log.push(...newEvents); return {newState, newEvents}; }
    
    const carrierFamiliarity = ballCarrier.positionalFamiliarity[ballCarrier.role] || 20;
    const carrierMod = getPositionalModifier(carrierFamiliarity);
    const opponentFamiliarity = opponent.positionalFamiliarity[opponent.role] || 20;
    const opponentMod = getPositionalModifier(opponentFamiliarity);

    const inst = ballCarrier.instructions;
    const basePassDesire = (ballCarrier.attributes.passing + ballCarrier.attributes.teamwork) * carrierMod;
    const baseDribbleDesire = ballCarrier.attributes.dribbling * (attackingMentality === 'Offensive' ? 1.2 : 0.9) * carrierMod;
    
    const passMod = inst.passing === PassingInstruction.Shorter ? 1.2 : (inst.passing === PassingInstruction.Risky ? 0.8 : 1.0);
    const dribbleMod = inst.dribbling === DribblingInstruction.DribbleMore ? 1.3 : (inst.dribbling === DribblingInstruction.DribbleLess ? 0.7 : 1.0);
    const shootMod = inst.shooting === ShootingInstruction.ShootMoreOften ? 1.4 : (inst.shooting === ShootingInstruction.ShootLessOften ? 0.6 : 1.0);
    const crossMod = inst.crossing === CrossingInstruction.CrossMore ? 1.3 : inst.crossing === CrossingInstruction.CrossLess ? 0.7 : 1.0;
    
    const currentFitnessMod = fitnessMod(ballCarrier.matchFitness);
    const currentMoraleMod = moraleMod(ballCarrier.morale);

    const isInShootingZone = (isHomeAttacking && newState.ballZone >= 7) || (!isHomeAttacking && newState.ballZone <= 3);
    const isInCrossingZone = (((isHomeAttacking && newState.ballZone >= 6) || (!isHomeAttacking && newState.ballZone <= 4))) && (ballCarrier.currentPosition.x < 25 || ballCarrier.currentPosition.x > 75);

    const passScore = basePassDesire * passMod;
    const dribbleScore = baseDribbleDesire * dribbleMod;
    const crossScore = isInCrossingZone ? ballCarrier.attributes.crossing * crossMod * carrierMod : 0;
    
    const totalDesire = passScore + dribbleScore + crossScore;
    const randAction = Math.random() * totalDesire;
    let action: 'pass' | 'dribble' | 'cross' = 'dribble';
    if (randAction < passScore) action = 'pass';
    else if (randAction < passScore + crossScore) action = 'cross';


    if (isInShootingZone && Math.random() < (ballCarrier.attributes.shooting / 150) * shootMod * carrierMod) {
        // --- SHOT ---
        let shotPower = (ballCarrier.attributes.shooting * 1.5) * fatigueMod(ballCarrier.stamina) * carrierMod * currentFitnessMod * currentMoraleMod * (isHomeAttacking ? homeMod : awayMod);
        if (newState.isKeyPassOpportunity) {
            shotPower *= 1.5;
        }
        const pressure = opponent.attributes.positioning * 0.5 * fatigueMod(opponent.stamina) * opponentMod;
        const keeper = getPlayerByRole(defendingTeam, ['Goalkeeper', 'Sweeper Keeper'])!;
        const keeperMod = getPositionalModifier(keeper.positionalFamiliarity[keeper.role] || 20);
        const keeperPower = (keeper.attributes.positioning * 1.2) * fatigueMod(keeper.stamina) * keeperMod * fitnessMod(keeper.matchFitness) * moraleMod(keeper.morale) * (isHomeAttacking ? awayMod : homeMod);
        
        attackingStats.shots++;
        ballCarrier.stats.shots++;
        
        const isBigChance = newState.isKeyPassOpportunity || Math.random() < 0.2;
        const xG_value = isBigChance ? 0.4 : 0.12;
        attackingStats.xG += xG_value;
        if(isBigChance) attackingStats.bigChances++;

        const onTargetChance = (ballCarrier.attributes.shooting / (ballCarrier.attributes.shooting + 30)) * 0.9;
        if (Math.random() < onTargetChance) {
             attackingStats.shotsOnTarget++;
             newEvents.push({minute: newState.minute, text: formatCommentary(pickRandom(commentary.highlight), {creatorName: ballCarrier.name, attackerName: ballCarrier.name}), type: 'Highlight', primaryPlayerId: ballCarrier.id});
            
             if (shotPower * Math.random() > (keeperPower + pressure) * Math.random()) {
                 // GOAL
                 updateRating(ballCarrier, 1.5);
                 ballCarrier.stats.goals++;
                 if (isHomeAttacking) newState.homeScore++; else newState.awayScore++;

                 let assister: LivePlayer | undefined;
                 if (newState.lastPasser && newState.lastPasser.teamId === newState.attackingTeamId) {
                     assister = attackingTeam.find(p => p.id === newState.lastPasser!.playerId);
                     if (assister) {
                         updateRating(assister, 1.0);
                         assister.stats.assists++;
                     }
                 }
                 newEvents.push({ minute: newState.minute, text: formatCommentary(pickRandom(commentary.goal), { attackerName: ballCarrier.name, assistMaker: assister?.name || '' }), type: 'Goal', primaryPlayerId: ballCarrier.id, secondaryPlayerId: assister?.id });

                attackingTeam.forEach(p => p.morale = Math.min(100, p.morale + 5));
                defendingTeam.forEach(p => p.morale = Math.max(0, p.morale - 5));

                 defendingTeam.forEach(p => {
                     const isDefenderOrGk = ['Goalkeeper', 'Sweeper Keeper', 'Central Defender', 'Ball-Playing Defender', 'Full-Back', 'Wing-Back', 'Libero', 'Defensive Midfielder'].includes(p.role);
                     updateRating(p, isDefenderOrGk ? -0.3 : -0.15);
                 });
                 newState.ballCarrierId = null; // Reset for kickoff
             } else {
                 newEvents.push({ minute: newState.minute, text: formatCommentary(pickRandom(commentary.save), { keeperName: keeper.name, attackerName: ballCarrier.name }), type: 'Chance', primaryPlayerId: keeper.id, secondaryPlayerId: ballCarrier.id });
                 updateRating(ballCarrier, 0.2);
                 updateRating(keeper, 0.3);
                 if (Math.random() < 0.4) {
                     newEvents.push({ minute: newState.minute, text: `Corner kick for ${isHomeAttacking ? newState.homeTeamName : newState.awayTeamName}.`, type: 'Corner'});
                     attackingStats.corners++;
                 }
             }
        } else {
             newEvents.push({ minute: newState.minute, text: `${ballCarrier.name} shoots, but it's wide of the mark!`, type: 'Chance', primaryPlayerId: ballCarrier.id });
             updateRating(ballCarrier, -0.15);
        }
        
        newState.lastPasser = null;
        newState.isKeyPassOpportunity = false;
    } else if (action === 'cross') {
        const crossQuality = (ballCarrier.attributes.crossing * 1.2 + ballCarrier.attributes.creativity * 0.8) * fatigueMod(ballCarrier.stamina) * carrierMod * currentFitnessMod * currentMoraleMod * (isHomeAttacking ? homeMod : awayMod);
        const defensiveHeader = (opponent.attributes.heading + opponent.attributes.positioning) * fatigueMod(opponent.stamina) * opponentMod * (isHomeAttacking ? awayMod : homeMod);
        
        newEvents.push({ minute: newState.minute, text: `${ballCarrier.name} looks to cross the ball.`, type: 'Info', primaryPlayerId: ballCarrier.id });

        if (crossQuality * Math.random() > defensiveHeader * Math.random()) {
            const targetPlayer = getPlayerByRole(attackingTeam, ['Striker', 'Poacher', 'Advanced Forward', 'Shadow Striker']);
            if (targetPlayer) {
                newEvents.push({ minute: newState.minute, text: `A great cross from ${ballCarrier.name} finds ${targetPlayer.name} in the box!`, type: 'Highlight', primaryPlayerId: ballCarrier.id, secondaryPlayerId: targetPlayer.id });
                newState.isKeyPassOpportunity = true;
                newState.ballCarrierId = targetPlayer.id;
                ballCarrier.stats.keyPasses++;
                updateRating(ballCarrier, 0.3);
            }
        } else {
            newEvents.push({ minute: newState.minute, text: `${opponent.name} clears the danger.`, type: 'Tackle', primaryPlayerId: opponent.id, secondaryPlayerId: ballCarrier.id });
            updateRating(opponent, 0.2);
            newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
            newState.ballCarrierId = opponent.id;
        }
        newState.lastPasser = null;

    } else if (action === 'pass') {
        // --- PASS ---
        const passTarget = getPlayerByRole(attackingTeam, ['Striker', 'Advanced Forward', 'Central Midfielder', 'Attacking Midfielder', 'Wide Midfielder']);
        if (passTarget) {
            let passQuality = (ballCarrier.attributes.passing + ballCarrier.attributes.creativity) * fatigueMod(ballCarrier.stamina) * carrierMod * currentFitnessMod * currentMoraleMod * (isHomeAttacking ? homeMod : awayMod);
            let interceptionQuality = (opponent.attributes.positioning + opponent.attributes.workRate) * fatigueMod(opponent.stamina) * opponentMod * (isHomeAttacking ? awayMod : homeMod);
            
            const markMod = opponent.instructions.marking === MarkingInstruction.ManMarking ? 1.15 : opponent.instructions.marking === MarkingInstruction.Zonal ? 1.05 : 1.0;
            interceptionQuality *= markMod;

            if (inst.passing === PassingInstruction.Risky) {
                passQuality *= 1.1;
                interceptionQuality *= 1.2;
            } else if (inst.passing === PassingInstruction.Shorter) {
                passQuality *= 1.1; // Safer passes are higher quality
                interceptionQuality *= 0.8; // Harder to intercept
            }


            if (passQuality * Math.random() > interceptionQuality * Math.random()) {
                ballCarrier.stats.passes++;
                attackingStats.passes++;
                updateRating(ballCarrier, 0.01);
                updateRating(passTarget, 0.01);
                newState.ballCarrierId = passTarget.id;
                newState.lastPasser = { teamId: newState.attackingTeamId, playerId: ballCarrier.id };
                if (isHomeAttacking) newState.ballZone = Math.min(9, newState.ballZone + 1 + Math.floor(Math.random()*2));
                else newState.ballZone = Math.max(1, newState.ballZone - 1 - Math.floor(Math.random()*2));
                
                if (inst.passing === PassingInstruction.Risky && Math.random() < 0.2) {
                     newEvents.push({ minute: newState.minute, text: `A killer pass from ${ballCarrier.name} splits the defense!`, type: 'Highlight', primaryPlayerId: ballCarrier.id, secondaryPlayerId: passTarget.id });
                     newState.isKeyPassOpportunity = true;
                     ballCarrier.stats.keyPasses++;
                     updateRating(ballCarrier, 0.4);
                }

            } else { // Interception
                newEvents.push({minute: newState.minute, text: formatCommentary(commentary.interception[0], {interceptor: opponent.name, intendedTarget: passTarget.name}), type: 'Tackle', primaryPlayerId: opponent.id, secondaryPlayerId: ballCarrier.id});
                defendingStats.tackles++;
                opponent.stats.tackles++;
                updateRating(ballCarrier, -0.1);
                updateRating(opponent, 0.2);
                newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
                newState.ballCarrierId = opponent.id;
                newState.lastPasser = null;
                newState.isKeyPassOpportunity = false;
            }
        }
    } else {
        // --- DRIBBLE ---
        newState.lastPasser = null;
        newState.isKeyPassOpportunity = false;
        const dribblePower = (ballCarrier.attributes.dribbling + ballCarrier.attributes.pace) * fatigueMod(ballCarrier.stamina) * carrierMod * currentFitnessMod * currentMoraleMod * (isHomeAttacking ? homeMod : awayMod);
        let tacklePower = (opponent.attributes.tackling + opponent.attributes.pace) * fatigueMod(opponent.stamina) * opponentMod * (isHomeAttacking ? awayMod : homeMod);
        const tackleMod = opponent.instructions.tackling === TacklingInstruction.Harder ? 1.2 : (opponent.instructions.tackling === TacklingInstruction.Cautious ? 0.8 : 1.0);
        const markMod = opponent.instructions.marking === MarkingInstruction.ManMarking ? 1.1 : 1.0;
        tacklePower *= markMod;

        
        if (dribblePower * Math.random() > (tacklePower * tackleMod) * Math.random()) {
             ballCarrier.stats.dribbles++;
             updateRating(ballCarrier, 0.05);
             if (isHomeAttacking) newState.ballZone = Math.min(9, newState.ballZone + 1);
             else newState.ballZone = Math.max(1, newState.ballZone - 1);
        } else { // Tackled
             const foulChance = (opponent.attributes.aggression / 150) * (1.1 - (opponent.attributes.tackling / 200)) * (opponent.instructions.tackling === TacklingInstruction.Harder ? 1.8 : 1.0) / newState.refereeStrictness;
             if (Math.random() < foulChance) {
                 // FOUL
                 newEvents.push({minute: newState.minute, text: formatCommentary(pickRandom(commentary.foul), {defenderName: opponent.name, creatorName: ballCarrier.name}), type: 'Foul', primaryPlayerId: opponent.id, secondaryPlayerId: ballCarrier.id});
                 defendingStats.fouls++;
                 updateRating(opponent, -0.1);
                 const cardChance = (opponent.attributes.aggression / 130) * newState.refereeStrictness;
                 if (Math.random() < cardChance) {
                    opponent.yellowCardCount++;
                    if (opponent.yellowCardCount === 2) {
                         opponent.isSentOff = true;
                         updateRating(opponent, -2.0);
                         newEvents.push({minute: newState.minute, text: `Second yellow! ${opponent.name} is sent off!`, type: 'RedCard', primaryPlayerId: opponent.id});
                         newEvents.push({minute: newState.minute, text: `The match is paused for tactical changes.`, type: 'Info'});
                         newState.isPaused = true;
                    } else {
                         updateRating(opponent, -0.5);
                         newEvents.push({minute: newState.minute, text: `${opponent.name} receives a yellow card.`, type: 'YellowCard', primaryPlayerId: opponent.id});
                    }
                 }
             } else {
                 newEvents.push({minute: newState.minute, text: formatCommentary(pickRandom(commentary.tackle), {defenderName: opponent.name, creatorName: ballCarrier.name}), type: 'Tackle', primaryPlayerId: opponent.id, secondaryPlayerId: ballCarrier.id});
                 defendingStats.tackles++;
                 opponent.stats.tackles++;
                 updateRating(ballCarrier, -0.05);
                 updateRating(opponent, 0.2);
                 newState.attackingTeamId = isHomeAttacking ? newState.awayTeamId : newState.homeTeamId;
                 newState.ballCarrierId = opponent.id;
                 
                 const injuryChance = 0.015 * (opponent.attributes.aggression / 60) * (opponent.instructions.tackling === TacklingInstruction.Harder ? 1.8 : 1.0) * (1.3 - (ballCarrier.attributes.naturalFitness / 100));
                 if (Math.random() < injuryChance) {
                     ballCarrier.isInjured = true;
                     if (!newState.injuredPlayerIds.includes(ballCarrier.id)) {
                         newState.injuredPlayerIds.push(ballCarrier.id);
                     }
                     const eventText = `${ballCarrier.name} has picked up an injury from that challenge and has to come off!`;
                     newEvents.push({ minute: newState.minute, text: eventText, type: 'Injury', primaryPlayerId: ballCarrier.id });
                     const injuredTeamId = isHomeAttacking ? newState.homeTeamId : newState.awayTeamId;
                     newState.forcedSubstitution = { teamId: injuredTeamId, playerOutId: ballCarrier.id, reason: 'injury' };
                     newState.isPaused = true;
                 }
             }
        }
    }

    if (attackingStats.passes > 10) {
        const successfulPasses = attackingStats.passes - (attackingStats.passes * (Math.random() * 0.2 + 0.1)); // 10-30% inaccuracy
        attackingStats.passAccuracy = (successfulPasses / attackingStats.passes) * 100;
    }

    newState.log.push(...newEvents);
    return { newState, newEvents };
};