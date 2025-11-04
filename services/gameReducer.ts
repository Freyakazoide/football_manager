import { GameState, LivePlayer, Player, Club, Match, NewsItem, MatchDayInfo, PlayerMatchStats, LineupPlayer, PressingInstruction, PositioningInstruction, CrossingInstruction, DribblingInstruction, PassingInstruction, PlayerAttributes, ScoutingAssignment, Staff, HeadOfPhysiotherapyAttributes, StaffRole, HeadOfScoutingAttributes, SeasonReviewData, LeagueEntry, TransferNegotiation, DepartmentType, SponsorshipDeal, Loan, TransferOffer, LoanOffer, BoardRequestType, SquadStatus, ContractOffer, PromiseType, SecondaryTrainingFocus, TeamTrainingFocus } from '../types';
import { Action } from './reducerTypes';
import { runMatch, processPlayerDevelopment, processPlayerAging, processMonthlyFinances, recalculateMarketValue, awardPrizeMoney, processPromotionsAndRelegations, generateRegens, getUnitRatings, processPhilosophyReview, processPlayerConcerns, processTeamCohesion } from './simulationService';
import { createLiveMatchState } from './matchEngine';
import { generateNarrativeReport } from './newsGenerator';
import { generateAITactics } from './aiTacticsService';
import { updatePlayerStatsFromMatchResult, getSeason } from './playerStatsService';
import { generateInjury } from './injuryService';
import { getRoleCategory, generateScheduleForCompetition, CONCERN_DEFINITIONS } from './database';
import { processAITransfers, generateOffersForPlayer } from './AITransferService';
import { BOARD_REQUESTS } from './boardRequests';

// FIX: Added missing updateLeagueTableForMatch function to resolve 'Cannot find name' error.
const updateLeagueTableForMatch = (currentTable: LeagueEntry[], match: Match): LeagueEntry[] => {
    const newTable = [...currentTable];
    const homeEntryIndex = newTable.findIndex(e => e.clubId === match.homeTeamId);
    const awayEntryIndex = newTable.findIndex(e => e.clubId === match.awayTeamId);

    if (homeEntryIndex === -1 || awayEntryIndex === -1 || match.homeScore === undefined || match.awayScore === undefined) {
        return currentTable; // Don't update if a team isn't in the league or match isn't played
    }

    const homeEntry = { ...newTable[homeEntryIndex] };
    const awayEntry = { ...newTable[awayEntryIndex] };

    homeEntry.played++;
    awayEntry.played++;

    homeEntry.goalsFor += match.homeScore;
    homeEntry.goalsAgainst += match.awayScore;
    awayEntry.goalsFor += match.awayScore;
    awayEntry.goalsAgainst += match.homeScore;

    homeEntry.goalDifference = homeEntry.goalsFor - homeEntry.goalsAgainst;
    awayEntry.goalDifference = awayEntry.goalsFor - awayEntry.goalsAgainst;

    if (match.homeScore > match.awayScore) {
        homeEntry.wins++;
        homeEntry.points += 3;
        awayEntry.losses++;
    } else if (match.awayScore > match.homeScore) {
        awayEntry.wins++;
        awayEntry.points += 3;
        homeEntry.losses++;
    } else {
        homeEntry.draws++;
        awayEntry.draws++;
        homeEntry.points += 1;
        awayEntry.points += 1;
    }

    newTable[homeEntryIndex] = homeEntry;
    newTable[awayEntryIndex] = awayEntry;

    return newTable;
};

export const initialState: GameState = {
    currentDate: new Date(2024, 7, 1), // July 1st, 2024
    playerClubId: null,
    clubs: {},
    players: {},
    staff: {},
    competitions: {},
    schedule: [],
    leagueTable: [],
    liveMatch: null,
    news: [],
    nextNewsId: 1,
    matchDayFixtures: null,
    matchDayResults: null,
    matchStartError: null,
    scoutingAssignments: [],
    nextScoutAssignmentId: 1,
    seasonReviewData: null,
    transferNegotiations: {},
    nextNegotiationId: 1,
    sponsors: {},
    sponsorshipDeals: [],
    shortlist: [],
    banks: {},
    loans: [],
    nextLoanId: 1,
};

const getDepartmentUpgradeCost = (level: number) => {
    return [0, 25000, 75000, 200000, 500000, Infinity][level] || Infinity;
};

const rehydratePlayers = (players: Record<number, Player>): Record<number, Player> => {
    for (const pId in players) {
        const player = players[pId];
        if (player.contractExpires) player.contractExpires = new Date(player.contractExpires);
        if (player.injury?.returnDate) player.injury.returnDate = new Date(player.injury.returnDate);
        if (player.injury?.startDate) player.injury.startDate = new Date(player.injury.startDate);
        if (player.suspension?.returnDate) player.suspension.returnDate = new Date(player.suspension.returnDate);
        if (player.promise?.deadline) player.promise.deadline = new Date(player.promise.deadline);
        if (player.lastRenewalDate) player.lastRenewalDate = new Date(player.lastRenewalDate);
        if (player.concern?.startDate) player.concern.startDate = new Date(player.concern.startDate);
        player.interactions.forEach(i => i.date = new Date(i.date));
        player.attributeChanges.forEach(c => c.date = new Date(c.date));
    }
    return players;
}

const rehydrateSponsorshipDeals = (deals: SponsorshipDeal[]): SponsorshipDeal[] => {
    deals.forEach(d => {
        if (d.expires) d.expires = new Date(d.expires);
    });
    return deals;
};

const rehydrateAssignments = (assignments: ScoutingAssignment[]): ScoutingAssignment[] => {
    assignments.forEach(a => {
        if (a.completionDate) a.completionDate = new Date(a.completionDate);
    });
    return assignments;
};

const rehydrateLoans = (loans: Loan[]): Loan[] => {
    loans.forEach(l => {
        if (l.startDate) l.startDate = new Date(l.startDate);
    });
    return loans;
};

const addNewsItem = (state: GameState, headline: string, content: string, type: NewsItem['type'], relatedEntityId?: number, matchStatsSummary?: Match): GameState => {
    const newNewsItem: NewsItem = {
        id: state.nextNewsId,
        date: new Date(state.currentDate),
        headline,
        content,
        type,
        relatedEntityId,
        isRead: false,
        matchStatsSummary,
    };
    return {
        ...state,
        news: [newNewsItem, ...state.news],
        nextNewsId: state.nextNewsId + 1,
    };
};

const processNegotiations = (state: GameState): GameState => {
    let newState = { ...state };
    for (const negId in newState.transferNegotiations) {
        const negotiation = newState.transferNegotiations[negId];
        if (negotiation.status === 'ai_turn') {
            newState = gameReducer(newState, { type: 'PROCESS_AI_NEGOTIATION_RESPONSE', payload: { negotiationId: negotiation.id } });
        }
    }
    return newState;
}

const processSquadStatusSatisfaction = (state: GameState): GameState => {
    if (!state.playerClubId) return state;

    const lastMonth = new Date(state.currentDate);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const matchesLastMonth = state.schedule.filter(m => 
        (m.homeTeamId === state.playerClubId || m.awayTeamId === state.playerClubId) &&
        m.homeScore !== undefined &&
        new Date(m.date) >= lastMonth &&
        new Date(m.date) < state.currentDate
    );

    if (matchesLastMonth.length < 2) return state; // Don't run on too few matches

    const newPlayers = JSON.parse(JSON.stringify(state.players));
    let newState = { ...state };
    let playerChanged = false;

    Object.values(newPlayers).forEach((p: Player) => {
        if (p.clubId !== state.playerClubId || p.squadStatus === 'Base' || p.squadStatus === 'Excedente') {
            return;
        }

        let starts = 0;
        let subIns = 0;

        matchesLastMonth.forEach(match => {
            const playerTeamLineup = match.homeTeamId === p.clubId ? match.homeLineup : match.awayLineup;
            if (playerTeamLineup?.some(lp => lp?.playerId === p.id)) {
                starts++;
            }
            if (match.log?.some(event => event.type === 'Sub' && event.primaryPlayerId === p.id)) {
                subIns++;
            }
        });
        
        const appearances = starts + subIns;
        const appearanceRatio = appearances / matchesLastMonth.length;
        const startRatio = starts / matchesLastMonth.length;
        
        const expectations: Record<string, {startRatio?: number, appearanceRatio?: number, msg: string}> = {
            'Titular': { startRatio: 0.70, msg: "espera ser titular na maioria dos jogos" },
            'Rodízio': { appearanceRatio: 0.50, msg: "espera jogar regularmente" },
            'Rotação': { appearanceRatio: 0.25, msg: "espera ter algumas oportunidades" },
            'Jovem Promessa': { appearanceRatio: 0.10, msg: "está ansioso por algumas chances no time principal" },
        };

        let satisfactionChange = 0;
        const status = p.squadStatus as Exclude<SquadStatus, 'Base' | 'Excedente'>;
        const expectation = expectations[status];

        if (expectation) {
            if (expectation.startRatio !== undefined) {
                if (startRatio < expectation.startRatio) satisfactionChange = -15;
                else satisfactionChange = 3;
            } else if (expectation.appearanceRatio !== undefined) {
                if (appearanceRatio < expectation.appearanceRatio) {
                     if (status === 'Rodízio') satisfactionChange = -10;
                     else if (status === 'Rotação') satisfactionChange = -5;
                     else if (status === 'Jovem Promessa' && p.age < 23) satisfactionChange = -3;
                } else {
                    satisfactionChange = 3;
                }
            }
        }
        
        if (p.injury || p.suspension) {
            const unavailableDate = p.injury?.returnDate || p.suspension?.returnDate;
            if (unavailableDate && new Date(unavailableDate) > lastMonth) {
                satisfactionChange = 0;
            }
        }


        if (satisfactionChange !== 0) {
            const playerToUpdate = newPlayers[p.id];
            playerToUpdate.satisfaction = Math.max(0, Math.min(100, playerToUpdate.satisfaction + satisfactionChange));
            playerToUpdate.morale = Math.max(0, Math.min(100, playerToUpdate.morale + Math.round(satisfactionChange / 2)));
            playerChanged = true;

            if (satisfactionChange < -5) {
                const expectationMsg = expectations[p.squadStatus as keyof typeof expectations].msg;
                newState = addNewsItem(newState, `Jogador Insatisfeito: ${p.name}`, `${p.name} está infeliz com seu tempo de jogo no último mês. Com o status de '${p.squadStatus}', ele ${expectationMsg}.`, 'promise_broken', p.id);
            }
        }
    });

    if (playerChanged) {
        newState.players = rehydratePlayers(newPlayers);
    }
    
    return newState;
};

const handleMonthlyUpdates = (state: GameState): GameState => {
    let newState = { ...state };
    
    // 1. Process Player Development and get changes
    const previousPlayersState = JSON.parse(JSON.stringify(newState.players));
    const developedPlayers = processPlayerDevelopment(newState.players, newState.clubs, newState.staff, newState.currentDate);
    newState.players = developedPlayers;
    
    // 2. Generate Training Report
    const improvedPlayers: string[] = [];
    const declinedPlayers: string[] = [];

    (Object.values(newState.players) as Player[]).forEach(player => {
        if (player.clubId !== newState.playerClubId) return;
        const oldPlayer = previousPlayersState[player.id];
        if (player.attributeChanges.length > oldPlayer.attributeChanges.length) {
            const latestChange = player.attributeChanges[player.attributeChanges.length - 1];
            if (latestChange.change > 0) {
                improvedPlayers.push(`${player.name} (+${latestChange.change} ${latestChange.attr})`);
            } else {
                declinedPlayers.push(`${player.name} (${latestChange.change} ${latestChange.attr})`);
            }
        }
    });

    if (improvedPlayers.length > 0 || declinedPlayers.length > 0) {
        let content = "Here is the summary of player attribute changes from last month's training:\n\n";
        if (improvedPlayers.length > 0) {
            content += "IMPROVEMENTS:\n" + improvedPlayers.join('\n') + "\n\n";
        }
        if (declinedPlayers.length > 0) {
            content += "DECLINES:\n" + declinedPlayers.join('\n');
        }
        newState = addNewsItem(newState, "Monthly Training Report", content, 'training_report');
    }

    // 3. Process Monthly Finances (Income & Expenses)
    const financialUpdates = processMonthlyFinances(newState);
    newState = { ...newState, ...financialUpdates };

    // 4. Process Squad Status Satisfaction
    newState = processSquadStatusSatisfaction(newState);

    // 5. NEW: Process Player Concerns
    const concernResults = processPlayerConcerns(newState);
    newState.players = concernResults.players;
    concernResults.newNewsItems.forEach(news => {
        newState = addNewsItem(newState, news.headline, news.content, news.type, news.relatedEntityId);
    });

    // 6. Process Team Cohesion
    newState.clubs = processTeamCohesion(newState.clubs);


    // 7. Handle yearly aging
    if (newState.currentDate.getMonth() === 0) { // New year
        const { players } = processPlayerAging(newState.players);
        newState.players = players;
    } else if (newState.currentDate.getMonth() === 6 && newState.currentDate.getDate() === 1) { // New season start
        (Object.values(newState.players) as Player[]).forEach(p => p.seasonYellowCards = 0);
    }
    
    return newState;
};

const isLoanOffer = (offer: TransferOffer | LoanOffer | undefined): offer is LoanOffer => {
    return !!offer && 'loanFee' in offer;
};


export const gameReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'INITIALIZE_GAME': {
            return {
                ...initialState,
                ...action.payload,
            };
        }
        case 'SELECT_PLAYER_CLUB': {
            const playerClubId = action.payload;
            const newPlayers = JSON.parse(JSON.stringify(state.players));
            // Reveal all attributes for the player's own team
            for (const pId in newPlayers) {
                if (newPlayers[pId].clubId === playerClubId) {
                    newPlayers[pId].scoutedAttributes = newPlayers[pId].attributes;
                }
            }
            return {
                ...state,
                playerClubId: playerClubId,
                players: rehydratePlayers(newPlayers),
                sponsorshipDeals: rehydrateSponsorshipDeals(state.sponsorshipDeals),
                loans: rehydrateLoans(state.loans),
            };
        }
        case 'ADVANCE_DAY': {
            if (state.liveMatch || state.seasonReviewData) return state;

            const isSeasonOver = state.schedule.length > 0 && state.schedule.every(m => m.homeScore !== undefined);
            if (isSeasonOver) {
                const season = getSeason(state.currentDate);
                const finalTable = [...state.leagueTable].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
                const leagueWinnerId = finalTable[0].clubId;
                const { promoted, relegated } = processPromotionsAndRelegations(state.clubs, finalTable);

                const playerClub = state.clubs[state.playerClubId!];
                const playerClubPlayers = (Object.values(state.players) as Player[]).filter(p => p.clubId === state.playerClubId);
                
                const getPlayerSeasonStats = (p: Player) => p.history.find(s => s.season === season);

                const awards = {
                    playerOfTheSeason: playerClubPlayers.sort((a,b) => (getPlayerSeasonStats(b)?.ratingPoints || 0) / (getPlayerSeasonStats(b)?.apps || 1) - (getPlayerSeasonStats(a)?.ratingPoints || 0) / (getPlayerSeasonStats(a)?.apps || 1))[0],
                    topScorer: playerClubPlayers.map(p => ({ ...p, goals: getPlayerSeasonStats(p)?.goals || 0 })).sort((a,b) => b.goals - a.goals)[0],
                    youngPlayer: playerClubPlayers.filter(p => p.age <= 21).sort((a,b) => (getPlayerSeasonStats(b)?.ratingPoints || 0) / (getPlayerSeasonStats(b)?.apps || 1) - (getPlayerSeasonStats(a)?.ratingPoints || 0) / (getPlayerSeasonStats(a)?.apps || 1))[0]
                };
                const playerClubPosition = finalTable.findIndex(e => e.clubId === state.playerClubId!) + 1;
                const prizeMoney = 50_000_000 / playerClubPosition;
                
                const seasonReviewData: SeasonReviewData = {
                    season,
                    finalTable,
                    leagueWinnerId,
                    promotedClubIds: promoted,
                    relegatedClubIds: relegated,
                    awards,
                    prizeMoney,
                };
                return { ...state, seasonReviewData };
            }

            const newDate = new Date(state.currentDate);
            newDate.setDate(newDate.getDate() + 1);

            let newState = { ...state, currentDate: newDate };
            
            if (newDate.getDay() === 0) { // 0 is Sunday
                newState = processAITransfers(newState);
                newState = processNegotiations(newState);
            }


            // Process scouting assignments
            const clonedAssignments = JSON.parse(JSON.stringify(newState.scoutingAssignments)) as ScoutingAssignment[];
            clonedAssignments.forEach(assignment => {
                if (!assignment.isComplete && newDate >= new Date(assignment.completionDate)) {
                    assignment.isComplete = true;
                    const { filters, scoutId } = assignment;
                    const scout = newState.staff[scoutId] as Staff & { attributes: HeadOfScoutingAttributes };
                    const { judgingPlayerAbility, judgingPlayerPotential } = scout.attributes;
                    
                    const currentDate = new Date();
                    const oneYearFromNow = new Date();
                    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);

                    const foundPlayers = (Object.values(newState.players) as Player[]).filter(p => {
                        if (p.clubId === newState.playerClubId) return false;
                        if (filters.minAge && p.age < filters.minAge) return false;
                        if (filters.maxAge && p.age > filters.maxAge) return false;
                        if (filters.position && getRoleCategory(p.naturalPosition) !== filters.position) return false;
                        if (filters.minPotential && p.potential < filters.minPotential) return false;
                        if (filters.contractExpiresInYears === 1 && new Date(p.contractExpires) > oneYearFromNow) return false;

                        if (filters.attributes) {
                            for (const attr in filters.attributes) {
                                const key = attr as keyof PlayerAttributes;
                                const filterValue = filters.attributes[key]!;
                                if ((p.attributes[key] < filterValue) || (p.scoutedAttributes?.[key] && p.scoutedAttributes[key]! < filterValue)) return false;
                            }
                        }
                        return true;
                    });

                    assignment.reportPlayerIds = foundPlayers.map(p => p.id);
                    
                    const clonedPlayersForScouting = JSON.parse(JSON.stringify(newState.players));
                    assignment.reportPlayerIds.forEach(pId => {
                        const playerToScout = clonedPlayersForScouting[pId];
                        const potentialErrorMargin = Math.round((100 - judgingPlayerPotential) / 3);
                        playerToScout.scoutedPotentialRange = [
                            Math.max(1, playerToScout.potential - potentialErrorMargin),
                            Math.min(100, playerToScout.potential + potentialErrorMargin)
                        ];

                        const attrsToRevealCount = Math.floor(Object.keys(playerToScout.attributes).length * (judgingPlayerAbility / 100));
                        const allAttrs = Object.keys(playerToScout.attributes) as (keyof PlayerAttributes)[];
                        allAttrs.sort(() => 0.5 - Math.random()); // Shuffle
                        const revealedAttrs = allAttrs.slice(0, attrsToRevealCount);
                        
                        playerToScout.scoutedAttributes = {};
                        revealedAttrs.forEach(attr => {
                            playerToScout.scoutedAttributes[attr] = playerToScout.attributes[attr];
                        });
                    });
                    newState.players = rehydratePlayers(clonedPlayersForScouting);

                    newState = addNewsItem(newState, "Scouting Report Ready", `Your scouting assignment "${assignment.description}" is complete. ${foundPlayers.length} players were found matching your criteria.`, 'scouting_report_ready', assignment.id);
                }
            });
            newState.scoutingAssignments = rehydrateAssignments(clonedAssignments);


            // Process player status updates (injuries, suspensions, fitness decay)
            const clonedPlayersForStatus: Record<number, Player> = JSON.parse(JSON.stringify(newState.players));
            const updatedPlayers = rehydratePlayers(clonedPlayersForStatus);
            let playerDidChange = false;
            for (const pId in updatedPlayers) {
                const player = updatedPlayers[pId];
                let hasChanged = false;

                if (player.injury && newDate >= player.injury.returnDate) {
                    player.injury = null; hasChanged = true;
                }
                if (player.suspension && newDate >= player.suspension.returnDate) {
                    player.suspension = null; hasChanged = true;
                }
                
                if (player.promise && newDate >= player.promise.deadline) {
                    player.satisfaction = Math.max(0, player.satisfaction - 25);
                    player.morale = Math.max(0, player.morale - 15);
                    player.promise = null;
                    hasChanged = true;
                    if (player.clubId === newState.playerClubId) {
                        newState = addNewsItem(newState, `Promise Broken: ${player.name}`, `${player.name} is unhappy that you did not keep your promise.`, 'promise_broken', player.id);
                    }
                }

                if (hasChanged) playerDidChange = true;
            }
            if(playerDidChange) newState.players = updatedPlayers;

            const matchesToday = newState.schedule.filter(m =>
                new Date(m.date).toDateString() === newDate.toDateString() && m.homeScore === undefined
            );

            // Decrease fitness for players NOT playing today
            const playersPlayingToday = new Set<number>();
            matchesToday.forEach(m => {
                [m.homeTeamId, m.awayTeamId].forEach(clubId => {
                    const club = newState.clubs[clubId];
                    club.tactics.lineup.forEach(p => p && playersPlayingToday.add(p.playerId));
                    club.tactics.bench.forEach(pId => pId && playersPlayingToday.add(pId));
                });
            });
            const clonedPlayersForFitness: Record<number, Player> = JSON.parse(JSON.stringify(newState.players));
            const playersToUpdateFitness = rehydratePlayers(clonedPlayersForFitness);

            let fitnessDidChange = false;
            for (const pId in playersToUpdateFitness) {
                if (!playersPlayingToday.has(Number(pId))) {
                    const player = playersToUpdateFitness[pId];
                    player.matchFitness = Math.max(70, player.matchFitness - 1);
                    fitnessDidChange = true;
                }
            }
            if(fitnessDidChange) newState.players = playersToUpdateFitness;

            if (matchesToday.length === 0) {
                 if (newDate.getDate() === 1) {
                    return handleMonthlyUpdates(newState);
                }
                return newState;
            }

            const playerClubId = newState.playerClubId;
            const aiMatches: Match[] = [];
            let playerMatchToday: Match | undefined = undefined;

            for (const match of matchesToday) {
                if (match.homeTeamId === playerClubId || match.awayTeamId === playerClubId) {
                    playerMatchToday = match;
                } else {
                    aiMatches.push(match);
                }
            }
            
            if (aiMatches.length > 0) {
                const roundResults: Match[] = [];
                const season = getSeason(newState.currentDate);
                for (const aiMatch of aiMatches) {
                    const result = runMatch(aiMatch, newState.clubs, newState.players);
                    roundResults.push(result);
            
                    const matchIndex = newState.schedule.findIndex(m => m.id === result.id);
                    if (matchIndex !== -1) newState.schedule[matchIndex] = result;
            
                    newState.leagueTable = updateLeagueTableForMatch(newState.leagueTable, result);
                    newState.players = updatePlayerStatsFromMatchResult(newState.players, result, season);

                    // Process injuries and suspensions from AI matches
                    if (result.injuryEvents) {
                        result.injuryEvents.forEach(injury => {
                            const player = newState.players[injury.playerId];
                            if (player) {
                                // Apply medical department effect
                                const club = newState.clubs[player.clubId];
                                const medicalChiefId = club.departments[DepartmentType.Medical].chiefId;
                                const medicalChief = medicalChiefId ? newState.staff[medicalChiefId] as Staff & { attributes: HeadOfPhysiotherapyAttributes } : null;
                                const medicalLevel = club.departments[DepartmentType.Medical].level;
                                
                                const chiefSkill = medicalChief ? medicalChief.attributes.physiotherapy : 50;
                                const levelBonus = (medicalLevel - 1) * 5; // Up to 20% bonus from level
                                const totalMedicalSkill = chiefSkill + levelBonus;

                                const durationModifier = 1 - (totalMedicalSkill / 400); // 120 skill = 30% reduction
                                const originalDuration = new Date(injury.returnDate).getTime() - result.date.getTime();
                                const newDuration = originalDuration * durationModifier;
                                const newReturnDate = new Date(result.date.getTime() + newDuration);
                                
                                player.injury = { type: injury.type, returnDate: newReturnDate, startDate: injury.startDate };

                                if (player.clubId === playerClubId) {
                                    const diffDays = Math.ceil(newDuration / (1000 * 60 * 60 * 24));
                                    const durationText = diffDays > 10 ? `approx. ${Math.round(diffDays/7)} weeks` : `approx. ${diffDays} days`;
                                    newState = addNewsItem(newState, `Player Injured: ${player.name}`, `${player.name} picked up an injury in the match against ${player.clubId === result.homeTeamId ? newState.clubs[result.awayTeamId].name : newState.clubs[result.homeTeamId].name}.\n\nHe is expected to be out for ${durationText}. The diagnosis is: ${injury.type}.`, 'injury_report_player', player.id);
                                }
                            }
                        });
                    }
                    if (result.disciplinaryEvents) {
                        result.disciplinaryEvents.forEach(card => {
                            const player = newState.players[card.playerId];
                            if (!player) return;

                            if (card.type === 'red') {
                                const returnDate = new Date(result.date);
                                returnDate.setDate(returnDate.getDate() + 8);
                                player.suspension = { returnDate };
                                if (player.clubId === playerClubId) {
                                     newState = addNewsItem(newState, `Player Suspended: ${player.name}`, `${player.name} received a red card and will be suspended for the next match.`, 'suspension_report_player', player.id);
                                }
                            } else if (card.type === 'yellow') {
                                player.seasonYellowCards = (player.seasonYellowCards || 0) + 1;
                                if (player.seasonYellowCards >= 3) {
                                    const returnDate = new Date(result.date);
                                    returnDate.setDate(returnDate.getDate() + 8);
                                    player.suspension = { returnDate };
                                    player.seasonYellowCards = 0;
                                    if (player.clubId === playerClubId) {
                                         newState = addNewsItem(newState, `Player Suspended: ${player.name}`, `${player.name} has accumulated 3 yellow cards and will be suspended for the next match.`, 'suspension_report_player', player.id);
                                    }
                                }
                            }
                        });
                    }
                }
                newState.leagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
                
                const content = roundResults.map(r => `${newState.clubs[r.homeTeamId].name} ${r.homeScore} - ${r.awayScore} ${newState.clubs[r.awayTeamId].name}`).join('\n');
                newState = addNewsItem(newState, "League Round-up", `Here are the results from around the league:\n\n${content}`, 'round_summary');
            }

            if (playerMatchToday) {
                newState.matchDayFixtures = {
                    playerMatch: {
                        match: playerMatchToday,
                        homeTeam: newState.clubs[playerMatchToday.homeTeamId],
                        awayTeam: newState.clubs[playerMatchToday.awayTeamId],
                    },
                    aiMatches: aiMatches,
                }
                return newState;
            }

            if (newDate.getDate() === 1) {
                return handleMonthlyUpdates(newState);
            }

            return newState;
        }
        case 'START_NEW_SEASON': {
            let tempState = { ...state };
            const playerClubId = tempState.playerClubId!;
            const playerClub = { ...tempState.clubs[playerClubId] };
            let confidenceChange = 0;

            // 1. Review performance against objectives and philosophies
            if (playerClub.boardObjective?.type === 'league_finish') {
                const finalPosition = tempState.seasonReviewData!.finalTable.findIndex(e => e.clubId === playerClubId)! + 1;
                if (finalPosition <= playerClub.boardObjective.position) {
                    confidenceChange += 20;
                } else {
                    confidenceChange -= 30;
                }
            }

            const season = getSeason(tempState.currentDate);
            const { confidenceChange: philosophyConfidenceChange, report: philosophyReport } = processPhilosophyReview(playerClub, tempState, season);
            confidenceChange += philosophyConfidenceChange;
            
            if (philosophyReport.length > 0) {
                 tempState = addNewsItem(tempState, "Board Review: Club Philosophies", "The board has reviewed your performance against the club's long-term philosophies:\n\n" + philosophyReport.join('\n'), 'board_report');
            }
            
            playerClub.managerConfidence = Math.max(0, Math.min(100, playerClub.managerConfidence + confidenceChange));
            tempState.clubs = { ...tempState.clubs, [playerClubId]: playerClub };

            // 2. Award Prize Money
            const clubsWithPrizeMoney = awardPrizeMoney(tempState.clubs, tempState.leagueTable);

            // 3. Process Promotions & Relegations
            const { promotedClubIds, relegatedClubIds } = tempState.seasonReviewData!;
            const clubsAfterPromotion = Object.keys(clubsWithPrizeMoney).reduce((acc, clubIdStr) => {
                const clubId = Number(clubIdStr);
                const club = clubsWithPrizeMoney[clubId];
                if (promotedClubIds.includes(clubId)) {
                    acc[clubId] = { ...club, competitionId: 1 };
                } else if (relegatedClubIds.includes(clubId)) {
                    acc[clubId] = { ...club, competitionId: 2 };
                } else {
                    acc[clubId] = club;
                }
                return acc;
            }, {} as Record<number, Club>);
            
            // 4. Process Aging and Retirements
            const { players: agedPlayers, retiredPlayers } = processPlayerAging(tempState.players);
            
            // 5. Generate Regens (Youth Intake)
            const regens = generateRegens(clubsAfterPromotion, retiredPlayers.length, agedPlayers, playerClubId, tempState.staff);
            const playersWithRegens = regens.reduce((acc, regen) => {
                acc[regen.id] = regen;
                return acc;
            }, { ...agedPlayers });

            // 6. Reset season-specific player data
            const finalPlayersState = Object.values(playersWithRegens).reduce((acc, player) => {
                acc[player.id] = { ...player, seasonYellowCards: 0 };
                return acc;
            }, {} as Record<number, Player>);

            // 7. Reset league table for the new season's top division
            const newLeagueClubs = Object.values(clubsAfterPromotion).filter(c => c.competitionId === 1);
            const newLeagueTable: LeagueEntry[] = newLeagueClubs.map(c => ({
                clubId: c.id, played: 0, wins: 0, draws: 0, losses: 0, 
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
            }));

            // 8. Set date to next season's start
            const newStartDate = new Date(tempState.currentDate);
            newStartDate.setFullYear(newStartDate.getFullYear() + 1);
            newStartDate.setMonth(7); // August
            newStartDate.setDate(10);

            // 9. Generate new schedule
            const newSchedule = generateScheduleForCompetition(newLeagueClubs, newStartDate);
            
            // 10. Generate Board Objectives
            const clubsWithObjectives = Object.values(clubsAfterPromotion).reduce((acc, club) => {
                const newClub = { ...club };
                let objective;
                const leagueSize = Object.values(clubsAfterPromotion).filter(c => c.competitionId === newClub.competitionId).length;
                if (newClub.reputation > 80) {
                    objective = { type: 'league_finish' as const, position: 1, description: 'Win the league title.' };
                } else if (newClub.reputation > 65) {
                    objective = { type: 'league_finish' as const, position: Math.floor(leagueSize / 2), description: `Finish in the top half.` };
                } else {
                    objective = { type: 'league_finish' as const, position: leagueSize - 3, description: 'Avoid relegation.' };
                }
                newClub.boardObjective = objective;
                
                if (newClub.id !== playerClubId) {
                    newClub.managerConfidence = 100;
                }
                
                acc[newClub.id] = newClub;
                return acc;
            }, {} as Record<number, Club>);

            // 11. Return the final, assembled state
            return {
                ...tempState,
                clubs: clubsWithObjectives,
                players: finalPlayersState,
                leagueTable: newLeagueTable,
                currentDate: newStartDate,
                schedule: newSchedule,
                seasonReviewData: null,
            };
        }
        case 'CLEAR_MATCH_DAY_FIXTURES': {
            return { ...state, matchDayFixtures: null };
        }
        case 'SET_MATCH_DAY_FIXTURES': {
            return { ...state, matchDayFixtures: action.payload, matchStartError: null };
        }
        case 'CLEAR_MATCH_RESULTS': {
            if (!state.matchDayResults) return state;

            let newState = { ...state };
            
            const { headline, content, matchStatsSummary } = generateNarrativeReport(state.matchDayResults.playerResult, state.playerClubId, state.clubs, state.players