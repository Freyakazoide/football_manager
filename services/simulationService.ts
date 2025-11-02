import { Match, Club, Player, GameState, PlayerAttributes, MatchStats, Mentality, LineupPlayer, PlayerRole, MatchEvent, PlayerMatchStats, TeamTrainingFocus, Staff, LeagueEntry, PlayerSeasonStats, DepartmentType, HeadOfPerformanceAttributes, StaffDepartment, HeadOfScoutingAttributes, SponsorshipDeal, NewsItem, Loan, SquadStatus } from '../types';
import { getRoleCategory, ALL_ROLES } from './database';
import { generateInjury } from './injuryService';
import { getSeason } from './playerStatsService';

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const ATTRIBUTE_KEYS: (keyof PlayerAttributes)[] = [
    'passing', 'dribbling', 'shooting', 'tackling', 'heading', 'crossing',
    'aggression', 'creativity', 'positioning', 'teamwork', 'workRate',
    'pace', 'stamina', 'strength', 'naturalFitness'
];

export const getOverallRating = (p: Player): number => {
    const attrs = p.attributes;
    const keyAttrs = attrs.shooting + attrs.passing + attrs.tackling + attrs.dribbling + attrs.pace + attrs.positioning + attrs.workRate + attrs.creativity + attrs.stamina;
    return keyAttrs / 9;
};

const getAttributesForRole = (role: PlayerRole): (keyof PlayerAttributes)[] => {
    const category = getRoleCategory(role);
    switch(category) {
        case 'GK': return ['positioning', 'strength', 'pace'];
        case 'DEF': return ['tackling', 'heading', 'positioning', 'strength', 'pace'];
        case 'MID': return ['passing', 'creativity', 'teamwork', 'dribbling', 'workRate', 'positioning', 'tackling'];
        case 'FWD': return ['shooting', 'dribbling', 'pace', 'creativity', 'positioning', 'heading', 'strength'];
        default: return [];
    }
};

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
        // FIX: Translated mentality strings to match Mentality type.
        if (mentality === 'Defensiva') return unit === 'def' ? 1.1 : (unit === 'fwd' ? 0.85 : 1.0);
        if (mentality === 'Ofensiva') return unit === 'fwd' ? 1.15 : (unit === 'def' ? 0.9 : 1.0);
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
    // FIX: Translated mentality strings to match Mentality type.
    if (homeMentality === 'Ofensiva' && awayMentality === 'Ofensiva') totalPossessions = 150;
    if (homeMentality === 'Defensiva' && awayMentality === 'Defensiva') totalPossessions = 90;

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

    // Simplified event simulation for cards
    const disciplinaryEvents: { playerId: number, type: 'yellow' | 'red' }[] = [];
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

    // New Injury Simulation for AI Matches
    const injuryEvents: { playerId: number, type: string, returnDate: Date }[] = [];
    const allStarters = [...homeLineup, ...awayLineup].filter(Boolean);
    const injuredPlayerIds = new Set<number>();

    for (const lineupPlayer of allStarters) {
        const player = players[lineupPlayer.playerId];
        if (!player) continue;

        // Base 10% chance per match, modified by fitness. Aims for ~2.2 injuries per match.
        const playerInjuryChance = 0.10 * (1.3 - (player.attributes.naturalFitness / 100));

        if (Math.random() < playerInjuryChance) {
            const injury = generateInjury(match.date, player);
            if (injury && !injuredPlayerIds.has(player.id)) {
                injuryEvents.push({ playerId: player.id, ...injury });
                log.push({ minute: randInt(1, 90), type: 'Injury', text: `${player.name} has picked up an injury.` });
                injuredPlayerIds.add(player.id);
            }
        }
    }

    log.sort((a, b) => a.minute - b.minute);

    return { ...match, homeScore, awayScore, homeStats, awayStats, log, playerStats, homeLineup, awayLineup, disciplinaryEvents, injuryEvents };
};

// FIX: Translated training focus strings to match TeamTrainingFocus type.
const getTrainingFocusAttributes = (focus: TeamTrainingFocus): (keyof PlayerAttributes)[] => {
    switch (focus) {
        case 'Ofensivo': return ['shooting', 'dribbling', 'crossing', 'creativity'];
        case 'Defensivo': return ['tackling', 'heading', 'positioning', 'strength'];
        case 'Físico': return ['pace', 'stamina', 'strength', 'naturalFitness'];
        case 'Tático': return ['positioning', 'teamwork', 'workRate'];
        default: return [];
    }
};

export const processPlayerDevelopment = (players: Record<number, Player>, clubs: Record<number, Club>, staff: Record<number, Staff>, currentDate: Date): Record<number, Player> => {
    const newPlayersState: Record<number, Player> = {};
    const season = getSeason(currentDate);

    for (const pId in players) {
        // Clone player and attributes for safe modification
        const player = {
            ...players[pId],
            attributes: { ...players[pId].attributes },
            positionalFamiliarity: { ...players[pId].positionalFamiliarity },
            attributeChanges: [...players[pId].attributeChanges],
        };

        const club = clubs[player.clubId];
        if (!club) {
            newPlayersState[pId] = player;
            continue;
        }

        const performanceChiefId = club.departments[DepartmentType.Performance].chiefId;
        const performanceChief = performanceChiefId ? staff[performanceChiefId] as Staff & { attributes: HeadOfPerformanceAttributes } : null;

        // --- 1. Get Match Performance ---
        const seasonStats = player.history.find(h => h.season === season);
        const avgRating = (seasonStats && seasonStats.apps > 0) ? (seasonStats.ratingPoints / seasonStats.apps) : 6.8; // Assume average if no games played

        // --- 2. Positional Familiarity ---
        if (player.individualTrainingFocus?.type === 'role' && Math.random() < 0.6) { // Increased chance
            const roleToTrain = player.individualTrainingFocus.role;
            if (player.positionalFamiliarity[roleToTrain] < 100) {
                player.positionalFamiliarity[roleToTrain] = Math.min(100, player.positionalFamiliarity[roleToTrain] + randInt(2, 4));
            }
        }
        
        // --- 3. Attribute Development ---
        const age = player.age;
        let developmentChance = 0;
        if (age < 20) developmentChance = 0.35;      // 35% base chance for multiple improvements for teens
        else if (age < 24) developmentChance = 0.25; // 25% for young adults
        else if (age < 29) developmentChance = 0.15; // 15% for peak age players

        if (Math.random() < developmentChance) {
            const potentialGap = Math.max(0, player.potential - getOverallRating(player));
            const numImprovements = randInt(1, 3); // 1-3 attribute improvements per development tick

            for (let i = 0; i < numImprovements; i++) {
                if (potentialGap <= 0) break; // Stop if player has reached potential

                // Determine which attributes to improve
                let weightedAttributes: (keyof PlayerAttributes)[] = [];
                
                // Add attributes from individual focus (highest weight)
                if (player.individualTrainingFocus?.type === 'attribute') {
                    weightedAttributes.push(...Array(10).fill(player.individualTrainingFocus.attribute));
                } else if (player.individualTrainingFocus?.type === 'role') {
                    weightedAttributes.push(...getAttributesForRole(player.individualTrainingFocus.role));
                }

                // Add attributes from team focus (medium weight)
                weightedAttributes.push(...getTrainingFocusAttributes(club.trainingFocus));
                
                // Add some random attributes (low weight)
                weightedAttributes.push(ATTRIBUTE_KEYS[randInt(0, ATTRIBUTE_KEYS.length - 1)]);
                
                const attrToImprove = pickRandom(weightedAttributes);

                let improvementModifier = 1.0;
                // Performance bonus
                if (avgRating > 7.2) improvementModifier *= 1.5;
                if (avgRating < 6.5) improvementModifier *= 0.7;
                // Staff bonus
                if (performanceChief) improvementModifier *= (1 + (performanceChief.attributes.fitnessCoaching / 200));

                if (Math.random() < improvementModifier && player.attributes[attrToImprove] < 99) {
                    player.attributes[attrToImprove] += 1;
                    player.attributeChanges.push({ date: new Date(currentDate), attr: attrToImprove, change: 1 });
                }
            }
        }

        // --- 4. Attribute Decline ---
        if (age > 28) {
            const declineChance = (age - 28) * 0.02; // Starts at 2% at age 29, increases
            if (Math.random() < declineChance) {
                const physicalAttrs: (keyof PlayerAttributes)[] = ['pace', 'stamina', 'strength', 'naturalFitness'];
                const mentalAttrs: (keyof PlayerAttributes)[] = ['workRate', 'aggression'];

                const declinePool = Math.random() < 0.8 ? physicalAttrs : mentalAttrs; // 80% chance of physical decline
                const attrToDecline = pickRandom(declinePool);

                const naturalFitnessModifier = 1 - (player.attributes.naturalFitness / 200); // High fitness reduces chance
                
                if (Math.random() < naturalFitnessModifier && player.attributes[attrToDecline] > 30) {
                     player.attributes[attrToDecline] -= 1;
                     player.attributeChanges.push({ date: new Date(currentDate), attr: attrToDecline, change: -1 });
                }
            }
        }

        newPlayersState[pId] = player;
    }
    return newPlayersState;
};


export const processPlayerAging = (players: Record<number, Player>) => {
    const newPlayers: Record<number, Player> = {};
    const retiredPlayers: Player[] = [];

    for (const pId in players) {
        const originalPlayer = players[pId];
        const updatedPlayer = {
            ...originalPlayer,
            age: originalPlayer.age + 1,
        };
        updatedPlayer.marketValue = recalculateMarketValue(updatedPlayer);

        // Retirement logic
        if (updatedPlayer.age > 33) {
            const retirementChance = (updatedPlayer.age - 33) * 5 + (50 - updatedPlayer.attributes.naturalFitness) / 2;
            if (Math.random() * 100 < retirementChance) {
                retiredPlayers.push(updatedPlayer);
                continue; // Skip adding to newPlayers
            }
        }
        newPlayers[pId] = updatedPlayer;
    }
    return { players: newPlayers, retiredPlayers };
};

export const generateRegens = (clubs: Record<number, Club>, retiredPlayerCount: number, existingPlayers: Record<number, Player>, playerClubId: number, staff: Record<number, Staff>): Player[] => {
    const playerClub = clubs[playerClubId];
    const scoutingDept = playerClub.departments[DepartmentType.Scouting];
    const scoutingLevel = scoutingDept.level;
    const scout = scoutingDept.chiefId ? staff[scoutingDept.chiefId] as Staff & { attributes: HeadOfScoutingAttributes } : null;
    
    // Determine player intake quality and quantity based on scouting level and head scout ability
    const baseIntake = 2 + Math.floor(scoutingLevel / 2);
    const abilityBonus = scout ? Math.floor(scout.attributes.judgingPlayerPotential / 25) : 0;
    const numPlayerIntake = baseIntake + abilityBonus;
    const potentialBoost = (scoutingLevel - 1) * 3 + (scout ? scout.attributes.judgingPlayerPotential / 15 : 0);

    const newPlayers: Player[] = [];
    const highestId = Math.max(0, ...Object.keys(existingPlayers).map(Number));
    let newIdCounter = highestId + 1;
    const totalToGenerate = retiredPlayerCount + 20; // Generate a larger pool

    for (let i = 0; i < totalToGenerate; i++) {
        const age = randInt(15, 18);
        const naturalPosition = pickRandom(ALL_ROLES);
        const isPlayerIntake = i < numPlayerIntake;
        const potential = randInt(isPlayerIntake ? 50 + potentialBoost : 40, isPlayerIntake ? Math.min(100, 80 + potentialBoost) : 85);
        
        const newPlayer: Player = {
            id: newIdCounter++,
            clubId: 0, // Will be assigned later
            name: `Regen ${newIdCounter}`, // Placeholder name
            age,
            nationality: pickRandom(Object.values(clubs).map(c => c.country)),
            naturalPosition,
            positionalFamiliarity: { [naturalPosition]: 100 } as any, // Simplified
            wage: randInt(100, 500),
            contractExpires: new Date(new Date().getFullYear() + randInt(2, 5), 6, 30),
            marketValue: 0,
            potential,
            attributes: {
                passing: randInt(20, 50), dribbling: randInt(20, 50), shooting: randInt(20, 50),
                tackling: randInt(20, 50), heading: randInt(20, 50), crossing: randInt(20, 50),
                aggression: randInt(20, 50), creativity: randInt(20, 50), positioning: randInt(20, 50),
                teamwork: randInt(20, 50), workRate: randInt(20, 50), pace: randInt(30, 60),
                stamina: randInt(30, 60), strength: randInt(30, 60), naturalFitness: randInt(40, 70),
            },
            scoutedAttributes: {},
            scoutedPotentialRange: null,
            history: [],
            morale: 75,
            satisfaction: 75,
            matchFitness: 70,
            injury: null,
            suspension: null,
            seasonYellowCards: 0,
            individualTrainingFocus: null,
            squadStatus: 'Base',
            interactions: [],
            attributeChanges: [],
        };
        newPlayer.marketValue = recalculateMarketValue(newPlayer);
        newPlayers.push(newPlayer);
    }
    
    // Assign best players to player's club
    newPlayers.sort((a,b) => b.potential - a.potential);
    const playerIntake = newPlayers.slice(0, numPlayerIntake);
    playerIntake.forEach(p => p.clubId = playerClubId);
    
    // Distribute the rest randomly
    const remainingPlayers = newPlayers.slice(numPlayerIntake);
    remainingPlayers.forEach(p => {
        p.clubId = pickRandom(Object.values(clubs)).id;
    });

    return [...playerIntake, ...remainingPlayers];
};

const getDepartmentMaintenanceCost = (level: number) => {
    return [0, 1000, 3000, 7500, 15000, 25000][level] || 0;
}

const getMonthlyIncome = (club: Club, players: Player[], sponsorshipDeals: SponsorshipDeal[]): number => {
    // 1. Sponsorship Money from active deals
    const monthlySponsorIncome = sponsorshipDeals
        .filter(d => d.clubId === club.id)
        .reduce((sum, deal) => sum + (deal.annualValue / 12), 0);

    // 2. Ticket Sales based on reputation and average player morale
    const avgPlayerMorale = players.length > 0
        ? players.reduce((sum, p) => sum + p.morale, 0) / players.length
        : 50; // Default morale if no players
    // Assume 2 home games a month for a simple calculation
    const ticketSalesPerMatch = (club.reputation * 200) + (avgPlayerMorale * 100);
    const ticketSales = ticketSalesPerMatch * 2; 

    return monthlySponsorIncome + ticketSales;
};

export const processMonthlyFinances = (state: GameState): Partial<GameState> => {
    const { clubs, players, staff, sponsorshipDeals, loans, news, nextNewsId } = state;
    const newClubs: Record<number, Club> = JSON.parse(JSON.stringify(clubs));
    const newLoans: Loan[] = [];
    const newNews: NewsItem[] = [];
    let tempNextNewsId = nextNewsId;

    // Process expenses and income for all clubs
    Object.values(newClubs).forEach(club => {
        const clubPlayers = Object.values(players).filter(p => p.clubId === club.id);
        const playerWages = clubPlayers.reduce((sum, p) => sum + p.wage, 0) * 4;
        const staffWages = Object.values(staff).filter(s => s.clubId === club.id).reduce((sum, s) => sum + s.wage, 0) * 4;
        const maintenanceCost = Object.values(club.departments).reduce((sum, d) => sum + getDepartmentMaintenanceCost(d.level), 0);
        const income = getMonthlyIncome(club, clubPlayers, sponsorshipDeals);
        
        club.balance += income - (playerWages + staffWages + maintenanceCost);
    });
    
    // Process loan repayments
    loans.forEach(loan => {
        const club = newClubs[loan.clubId];
        if (!club) return;
        
        if (club.balance >= loan.monthlyRepayment) {
            club.balance -= loan.monthlyRepayment;
            const interestPayment = loan.remainingBalance * (loan.interestRate / 100 / 12);
            const principalPayment = loan.monthlyRepayment - interestPayment;
            
            const updatedLoan: Loan = {
                ...loan,
                remainingBalance: loan.remainingBalance - principalPayment,
                monthsRemaining: loan.monthsRemaining - 1,
            };

            if (updatedLoan.monthsRemaining <= 0) {
                // Loan paid off
                club.creditScore = Math.min(100, club.creditScore + 10);
                club.loanHistory.push({ bankId: loan.bankId, outcome: 'paid_off', amount: loan.principal, date: new Date(state.currentDate) });
                if (club.id === state.playerClubId) {
                    newNews.push({ id: tempNextNewsId++, date: new Date(state.currentDate), headline: "Loan Repaid", content: `You have successfully repaid your loan of ${loan.principal.toLocaleString()}. Your club's credit score has improved.`, type: 'loan_update', isRead: false });
                }
            } else {
                newLoans.push(updatedLoan);
            }
        } else {
            // Loan defaulted
            club.creditScore = Math.max(0, club.creditScore - 25);
            club.loanHistory.push({ bankId: loan.bankId, outcome: 'defaulted', amount: loan.principal, date: new Date(state.currentDate) });
            if (club.id === state.playerClubId) {
                newNews.push({ id: tempNextNewsId++, date: new Date(state.currentDate), headline: "Loan Defaulted!", content: `The club has failed to make the monthly repayment for its loan from ${state.banks[loan.bankId].name}. Your credit score has been severely damaged.`, type: 'loan_update', isRead: false });
            }
        }
    });

    return { clubs: newClubs, loans: newLoans, news: [...newNews, ...news], nextNewsId: tempNextNewsId };
};

export const awardPrizeMoney = (clubs: Record<number, Club>, leagueTable: LeagueEntry[]): Record<number, Club> => {
    const prizePool = 50_000_000;
    
    const prizeMoneyByClubId = leagueTable.reduce((acc, entry, index) => {
        const prizeMoney = prizePool / (index + 1);
        acc[entry.clubId] = Math.round(prizeMoney);
        return acc;
    }, {} as Record<number, number>);

    return Object.keys(clubs).reduce((acc, clubIdStr) => {
        const clubId = Number(clubIdStr);
        const club = clubs[clubId];
        const prize = prizeMoneyByClubId[clubId] || 0;
        
        if (prize > 0) {
            acc[clubId] = {
                ...club,
                balance: club.balance + prize
            };
        } else {
            acc[clubId] = club; // No change, return original object
        }
        return acc;
    }, {} as Record<number, Club>);
};

export const processPromotionsAndRelegations = (
    clubs: Record<number, Club>, 
    premierLeagueTable: LeagueEntry[]
): { updatedClubs: Record<number, Club>, promoted: number[], relegated: number[] } => {
    const newClubs = { ...clubs };
    const numToRelegate = 2;
    const numToPromote = 2;

    const relegatedEntries = premierLeagueTable.slice(-numToRelegate);
    const relegatedClubIds = relegatedEntries.map(e => e.clubId);

    const championshipClubs = Object.values(newClubs)
        .filter(c => c.competitionId === 2)
        .sort((a, b) => b.reputation - a.reputation);
    
    const promotedClubIds = championshipClubs.slice(0, numToPromote).map(c => c.id);

    relegatedClubIds.forEach(id => {
        if(newClubs[id]) newClubs[id].competitionId = 2;
    });
    promotedClubIds.forEach(id => {
        if(newClubs[id]) newClubs[id].competitionId = 1;
    });

    return { updatedClubs: newClubs, promoted: promotedClubIds, relegated: relegatedClubIds };
};


export const recalculateMarketValue = (player: Player): number => {
    const avgAttr = Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.values(player.attributes).length;
    let value = (avgAttr * 20000) + (player.potential * 15000);
    if (player.age < 22) value *= 1.5;
    if (player.age > 32) value *= 0.5;
    return Math.max(0, Math.round(value / 1000) * 1000);
};

export const processPhilosophyReview = (
    club: Club,
    gameState: GameState,
    season: string
): { confidenceChange: number; report: string[] } => {
    let confidenceChange = 0;
    const report: string[] = [];
    const { players, news, schedule } = gameState;
    const seasonStartDate = new Date(season.split('/')[0]);

    for (const philosophy of club.philosophies) {
        switch (philosophy.type) {
            case 'play_attacking_football': {
                const matchesPlayed = schedule.filter(m => (m.homeTeamId === club.id || m.awayTeamId === club.id) && m.homeScore !== undefined);
                if (matchesPlayed.length > 0) {
                    const goalsScored = matchesPlayed.reduce((sum, match) => {
                        return sum + (match.homeTeamId === club.id ? match.homeScore! : match.awayScore!);
                    }, 0);
                    const avgGoals = goalsScored / matchesPlayed.length;
                    if (avgGoals > 1.8) {
                        confidenceChange += 5;
                        report.push(`✅ The board is pleased with the team's attacking style, averaging ${avgGoals.toFixed(2)} goals per game.`);
                    } else if (avgGoals < 1.2) {
                        confidenceChange -= 5;
                        report.push(`❌ The board is concerned by the lack of goals, with the team only averaging ${avgGoals.toFixed(2)} per game.`);
                    } else {
                        report.push(`- The team's attacking output was satisfactory.`);
                    }
                }
                break;
            }
            case 'sign_young_players': {
                const newSigningsNews = news.filter(n =>
                    n.type === 'transfer_completed' &&
                    n.content.includes(`joins ${club.name}`) &&
                    new Date(n.date) > seasonStartDate
                );
                let youngSignings = 0;
                const totalSignings = newSigningsNews.length;

                newSigningsNews.forEach(item => {
                    const player = players[item.relatedEntityId!];
                    if (player && player.age <= philosophy.parameters.maxAge) {
                        youngSignings++;
                    }
                });

                if (totalSignings > 0) {
                    const ratio = youngSignings / totalSignings;
                    if (ratio >= 0.75) {
                        confidenceChange += 5;
                        report.push(`✅ The board is delighted with the focus on signing young players (${youngSignings}/${totalSignings}).`);
                    } else if (ratio < 0.25) {
                        confidenceChange -= 5;
                        report.push(`❌ The board feels the club has strayed from its philosophy of signing young talent (${youngSignings}/${totalSignings}).`);
                    } else {
                        report.push(`- The club's transfer business included a mix of ages.`);
                    }
                } else {
                    report.push(`- No new players were signed this season.`);
                }
                break;
            }
            case 'develop_youth': {
                const promotionsNews = news.filter(n =>
                    n.type === 'youth_player_promoted' &&
                    new Date(n.date) > seasonStartDate
                );
                const promotionsCount = promotionsNews.length;
                if (promotionsCount >= 2) {
                    confidenceChange += 5;
                    report.push(`✅ The board is happy to see ${promotionsCount} players promoted from the academy this season.`);
                } else {
                    confidenceChange -= 3;
                    report.push(`❌ The board would like to see more players given a chance from the youth academy.`);
                }
                break;
            }
        }
    }

    return { confidenceChange: Math.min(20, Math.max(-20, confidenceChange)), report };
};