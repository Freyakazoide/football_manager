import { GameState, LiveMatchState, MatchDayInfo, Club, Player, LivePlayer, MatchEvent, Mentality, MatchStats } from '../types';

const pickPlayer = (players: LivePlayer[], position?: 'GK' | 'DEF' | 'MID' | 'FWD'): LivePlayer => {
    const candidates = players.filter(p => !p.isSentOff && (position ? p.position === position : true));
    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
    const availablePlayers = players.filter(p => !p.isSentOff);
    return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
};


const getTeamRatings = (lineup: LivePlayer[]) => {
    const activePlayers = lineup.filter(p => !p.isSentOff);
    if (activePlayers.length === 0) return { def: 0, mid: 0, fwd: 0, overall: 0 };

    const ratings = { def: 0, mid: 0, fwd: 0, overall: 0 };
    const positions = {
        def: activePlayers.filter(p => p.position === 'DEF' || p.position === 'GK'),
        mid: activePlayers.filter(p => p.position === 'MID'),
        fwd: activePlayers.filter(p => p.position === 'FWD'),
    };
    if (positions.def.length) ratings.def = positions.def.reduce((sum, p) => sum + p.attributes.tackling + p.attributes.positioning, 0) / (positions.def.length * 2);
    if (positions.mid.length) ratings.mid = positions.mid.reduce((sum, p) => sum + p.attributes.passing + p.attributes.creativity, 0) / (positions.mid.length * 2);
    if (positions.fwd.length) ratings.fwd = positions.fwd.reduce((sum, p) => sum + p.attributes.shooting + p.attributes.dribbling, 0) / (positions.fwd.length * 2);
    
    ratings.overall = (ratings.def + ratings.mid + ratings.fwd) / 3;
    return ratings;
};

export const createLiveMatchState = (matchInfo: MatchDayInfo, clubs: Record<number, Club>, players: Record<number, Player>): LiveMatchState => {
    const { match, homeTeam, awayTeam } = matchInfo;

    const toLivePlayer = (pId: number | null): LivePlayer | null => {
        if (!pId) return null;
        const p = players[pId];
        return { id: p.id, name: p.name, position: p.position, attributes: p.attributes, stamina: 100, yellowCards: 0, isSentOff: false };
    };

    const homeLineup = homeTeam.tactics.lineup.map(toLivePlayer).filter(p => p) as LivePlayer[];
    const homeBench = homeTeam.tactics.bench.map(toLivePlayer).filter(p => p) as LivePlayer[];
    const awayLineup = awayTeam.tactics.lineup.map(toLivePlayer).filter(p => p) as LivePlayer[];
    const awayBench = awayTeam.tactics.bench.map(toLivePlayer).filter(p => p) as LivePlayer[];
    
    const initialStats: MatchStats = { shots: 0, shotsOnTarget: 0, possession: 0, tackles: 0 };

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
        refereeStrictness: 0.8 + Math.random() * 0.4, // Between 0.8 and 1.2
        homeStats: { ...initialStats },
        awayStats: { ...initialStats },
        homePossessionMinutes: 0,
        awayPossessionMinutes: 0,
    };
};

// Performance penalty from fatigue
const fatigueMod = (stamina: number) => (stamina / 100) * 0.75 + 0.25; // Modifier from 0.25 (drained) to 1.0 (fresh)

export const runMinute = (state: LiveMatchState): { newState: LiveMatchState, newEvents: MatchEvent[] } => {
    const newState = JSON.parse(JSON.stringify(state)) as LiveMatchState;
    const newEvents: MatchEvent[] = [];
    newState.minute++;

    // Update status
    if (newState.minute === 1) { newState.status = 'first-half'; newEvents.push({ minute: 1, text: "The first half kicks off!", type: 'Info' }); }
    if (newState.minute === 45) {
        newState.status = 'half-time';
        newState.isPaused = true;
        newEvents.push({ minute: 45, text: "Half-time. The players head to the tunnel for a rest.", type: 'Info' });
        
        // Half-time stamina recovery
        [...newState.homeLineup, ...newState.awayLineup].forEach(p => {
            const staminaLost = 100 - p.stamina;
            const recoveryFactor = p.attributes.naturalFitness / 500; // e.g., 80 NF recovers 16% of lost stamina
            const recoveredStamina = staminaLost * recoveryFactor;
            p.stamina = Math.min(100, p.stamina + recoveredStamina);
        });
    }
    if (newState.minute === 46) { newState.status = 'second-half'; newEvents.push({ minute: 46, text: "The second half begins!", type: 'Info' }); }
    if (newState.minute >= 90) {
        newState.status = 'full-time';
        newState.isPaused = true;
        newEvents.push({ minute: 90, text: "Full-time. The referee blows the final whistle.", type: 'Info' });
    }

    // Gradual Stamina Drain
    const drainPlayerStamina = (p: LivePlayer, mentality: Mentality) => {
        if(p.isSentOff) return;
        const mentalityModifier = { 'Defensive': 0.9, 'Balanced': 1.0, 'Offensive': 1.15 }[mentality];
        const baseDrain = 0.3; 
        const staminaResistance = p.attributes.stamina / 150;
        const workRateFactor = p.attributes.workRate / 70;
        const drain = baseDrain * workRateFactor * mentalityModifier / (1 + staminaResistance);
        p.stamina = Math.max(0, p.stamina - drain);
    };

    newState.homeLineup.forEach(p => drainPlayerStamina(p, newState.homeMentality));
    newState.awayLineup.forEach(p => drainPlayerStamina(p, newState.awayMentality));

    if (newState.status !== 'first-half' && newState.status !== 'second-half') {
        newState.log.push(...newEvents);
        return { newState, newEvents };
    }
    
    const homeRatings = getTeamRatings(newState.homeLineup);
    const awayRatings = getTeamRatings(newState.awayLineup);

    const mentalityMod = (mentality: Mentality) => ({ 'Defensive': 0.8, 'Balanced': 1.0, 'Offensive': 1.25 }[mentality]);

    const homeMidfield = homeRatings.mid * mentalityMod(newState.homeMentality);
    const awayMidfield = awayRatings.mid * mentalityMod(newState.awayMentality);
    const homeAdvantage = 1.05;

    const initiativeRoll = Math.random() * (homeMidfield * homeAdvantage + awayMidfield);
    const hasInitiative: 'home' | 'away' = initiativeRoll < (homeMidfield * homeAdvantage) ? 'home' : 'away';
    
    if (hasInitiative === 'home') newState.homePossessionMinutes++; else newState.awayPossessionMinutes++;

    const attackingTeam = hasInitiative === 'home' ? newState.homeLineup : newState.awayLineup;
    const defendingTeam = hasInitiative === 'home' ? newState.awayLineup : newState.homeLineup;
    const attackingMentality = hasInitiative === 'home' ? newState.homeMentality : newState.awayMentality;
    const attackingStats = hasInitiative === 'home' ? newState.homeStats : newState.awayStats;
    const defendingStats = hasInitiative === 'home' ? newState.awayStats : newState.homeStats;

    if (Math.random() < 0.25) { // 25% chance of an event each minute
        const creator = pickPlayer(attackingTeam, 'MID');
        const attacker = pickPlayer(attackingTeam, 'FWD');
        const defender = pickPlayer(defendingTeam, 'DEF');
        const keeper = pickPlayer(defendingTeam, 'GK');

        // Event: Tackle
        const tackleChance = (defender.attributes.tackling * fatigueMod(defender.stamina) + defender.attributes.positioning * fatigueMod(defender.stamina));
        const dribbleChance = (creator.attributes.dribbling * fatigueMod(creator.stamina) + creator.attributes.pace * fatigueMod(creator.stamina));

        if (tackleChance * Math.random() > dribbleChance * Math.random() * 0.9) {
            newEvents.push({ minute: newState.minute, text: `Key Tackle! ${defender.name} dispossesses ${creator.name} cleanly.`, type: 'Tackle'});
            defendingStats.tackles++;
        } else if (Math.random() < creator.attributes.aggression / 300 * newState.refereeStrictness) {
            // Event: Foul
            newEvents.push({ minute: newState.minute, text: `Foul! ${defender.name} brings down ${creator.name}.`, type: 'Foul'});
            // Event: Card
            const cardChance = (defender.attributes.aggression / 150) * newState.refereeStrictness;
            if (Math.random() < cardChance) {
                if (defender.yellowCards === 1) {
                    defender.yellowCards++;
                    defender.isSentOff = true;
                    newEvents.push({ minute: newState.minute, text: `RED CARD! It's a second yellow for ${defender.name} and he's off!`, type: 'RedCard'});
                } else {
                    defender.yellowCards++;
                    newEvents.push({ minute: newState.minute, text: `Yellow Card! ${defender.name} is booked for the challenge.`, type: 'YellowCard'});
                }
            }
        } else {
            // Event: Chance creation
            const attackScore = (creator.attributes.creativity * fatigueMod(creator.stamina) + attacker.attributes.positioning * fatigueMod(attacker.stamina)) * mentalityMod(attackingMentality);
            const defenseScore = (defender.attributes.positioning * fatigueMod(defender.stamina) + keeper.attributes.positioning * fatigueMod(keeper.stamina));
            
            if (attackScore * Math.random() > defenseScore * Math.random() * 0.7) {
                newEvents.push({ minute: newState.minute, text: `${creator.name} plays a clever pass through to ${attacker.name}...`, type: 'Highlight'});
                
                // Event: Shot resolution
                const shotPower = (attacker.attributes.shooting * 1.5 + attacker.attributes.strength / 10) * fatigueMod(attacker.stamina);
                const keeperPower = (keeper.attributes.positioning + keeper.attributes.strength) * fatigueMod(keeper.stamina);
                const shotOutcomeRoll = Math.random();
                attackingStats.shots++;

                if (shotPower * Math.random() > keeperPower * Math.random() * 0.6) {
                    // GOAL
                    newEvents.push({ minute: newState.minute, text: `GOAL! ${attacker.name} finds the back of the net!`, type: 'Goal' });
                    attackingStats.shotsOnTarget++;
                    if (hasInitiative === 'home') newState.homeScore++; else newState.awayScore++;
                } else if (shotOutcomeRoll < 0.6) {
                    // SAVE
                    newEvents.push({ minute: newState.minute, text: `A great save by ${keeper.name} denies ${attacker.name}!`, type: 'Chance' });
                    attackingStats.shotsOnTarget++;
                } else {
                    // NEAR MISS
                    const missType = shotOutcomeRoll < 0.8 ? 'just wide' : 'off the post';
                    newEvents.push({ minute: newState.minute, text: `Near Miss! ${attacker.name}'s shot goes ${missType}!`, type: 'NearMiss' });
                }
            }
        }
    }

    newState.log.push(...newEvents);
    return { newState, newEvents };
};