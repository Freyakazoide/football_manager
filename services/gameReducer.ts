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
            const aiMatchResults: Match[] = [];
            let playerMatchToday: Match | undefined = undefined;

            for (const match of matchesToday) {
                if (match.homeTeamId === playerClubId || match.awayTeamId === playerClubId) {
                    playerMatchToday = match;
                } else {
                    aiMatches.push(match);
                }
            }
            
            if (aiMatches.length > 0) {
                const season = getSeason(newState.currentDate);
                for (const aiMatch of aiMatches) {
                    const result = runMatch(aiMatch, newState.clubs, newState.players);
                    aiMatchResults.push(result);
            
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
                                
                                // FIX: Add missing 'startDate' property to injury object.
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
                
                const content = aiMatchResults.map(r => `${newState.clubs[r.homeTeamId].name} ${r.homeScore} - ${r.awayScore} ${newState.clubs[r.awayTeamId].name}`).join('\n');
                newState = addNewsItem(newState, "League Round-up", `Here are the results from around the league:\n\n${content}`, 'round_summary');
            }

            if (playerMatchToday) {
                newState.matchDayFixtures = {
                    playerMatch: {
                        match: playerMatchToday,
                        homeTeam: newState.clubs[playerMatchToday.homeTeamId],
                        awayTeam: newState.clubs[playerMatchToday.awayTeamId],
                    },
                    aiMatches: aiMatchResults,
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
            
            const { headline, content, matchStatsSummary } = generateNarrativeReport(state.matchDayResults.playerResult, state.playerClubId, state.clubs, state.players);
            newState = addNewsItem(newState, headline, content, 'match_summary_player', state.matchDayResults.playerResult.id, matchStatsSummary);

            return { ...newState, matchDayResults: null };
        }
        case 'CLEAR_MATCH_START_ERROR': {
            return { ...state, matchStartError: null };
        }
        case 'UPDATE_TACTICS': {
             if (!state.playerClubId) return state;
             const newClubs = { ...state.clubs };
             newClubs[state.playerClubId].tactics = action.payload;
             return { ...state, clubs: newClubs };
        }
        case 'MARK_NEWS_AS_READ': {
            const newNews = state.news.map(item => 
                item.id === action.payload.newsItemId ? { ...item, isRead: true } : item
            );
            return { ...state, news: newNews };
        }
        case 'PLAYER_INTERACTION': {
            const { playerId, interactionType } = action.payload;
            const player = state.players[playerId];
            if (!player || player.clubId !== state.playerClubId) return state;
            
            const newPlayers = JSON.parse(JSON.stringify(state.players));
            const updatedPlayer = newPlayers[playerId];
            let newState = { ...state };

            updatedPlayer.interactions.push({ topic: interactionType, date: new Date(state.currentDate) });

            switch (interactionType) {
                case 'praise':
                    updatedPlayer.morale = Math.min(100, player.morale + 7);
                    updatedPlayer.satisfaction = Math.min(100, player.satisfaction + 5);
                     newState = addNewsItem(
                        newState,
                        `Manager praises ${player.name}`,
                        `Following a string of good performances, the manager has publicly praised ${player.name}, hoping it will spur the player on to even greater heights.`,
                        'interaction_praise',
                        player.id
                    );
                    break;
                case 'criticize':
                    updatedPlayer.morale = Math.max(0, player.morale - 10);
                    newState = addNewsItem(
                        newState,
                        `Manager demands improvement from ${player.name}`,
                        `The manager has publicly stated that they expect more from ${player.name}. "We know the quality he has, and we need to see it more consistently," the manager was quoted as saying.`,
                        'interaction_criticize',
                        player.id
                    );
                    break;
                case 'discipline':
                case 'set_target':
                    // These would have more complex logic
                    break;
            }

            return { ...newState, players: rehydratePlayers(newPlayers) };
        }
        case 'RESPOND_TO_CONCERN': {
            const { playerId, responseId } = action.payload;
            const player = state.players[playerId];
            if (!player || !player.concern) return state;

            const newPlayers = JSON.parse(JSON.stringify(state.players));
            const playerToUpdate = newPlayers[playerId];
            let newState = { ...state };

            const addPromise = (type: PromiseType, days: number, details: Partial<Player['promise']> = {}) => {
                const deadline = new Date(state.currentDate);
                deadline.setDate(deadline.getDate() + days);
                playerToUpdate.promise = { type, deadline, ...details };
            };

            const changeMorale = (moraleChange: number, satisfactionChange: number = 0) => {
                playerToUpdate.morale = Math.max(0, Math.min(100, playerToUpdate.morale + moraleChange));
                playerToUpdate.satisfaction = Math.max(0, Math.min(100, playerToUpdate.satisfaction + satisfactionChange));
            };
            
            switch (responseId) {
                // playing_time
                case 'promise_playing_time': addPromise('playing_time', 30); changeMorale(15, 10); break;
                case 'tell_to_be_patient': changeMorale(5, 0); break;
                case 'challenge_to_improve': changeMorale(-5, -5); break;
                case 'criticize_performance': changeMorale(-15, -10); break;
                case 'promise_loan': playerToUpdate.isTransferListed = true; changeMorale(5, 5); break;
                case 'transfer_list': playerToUpdate.isTransferListed = true; changeMorale(-30, -20); break;

                // new_contract
                case 'promise_contract_talks': addPromise('will_offer_new_contract', 30); changeMorale(20, 15); break;
                case 'dismiss_not_earned': changeMorale(-10, -10); break;
                case 'delay_financial_reasons': changeMorale(-5, -5); break;
                case 'delay_end_of_season': changeMorale(0, 0); break;
                case 'praise_ambition': changeMorale(5, 0); break;
                case 'reject_request': changeMorale(-25, -20); break;

                // squad_status
                case 'promise_status_review': addPromise('will_improve_squad_status', 60); changeMorale(10, 5); break;
                case 'promote_immediately': playerToUpdate.squadStatus = playerToUpdate.squadStatus === 'Rotação' ? 'Rodízio' : 'Titular'; changeMorale(25, 20); break;
                case 'status_is_fair': changeMorale(-10, -10); break;
                case 'demote_for_complaining': playerToUpdate.squadStatus = 'Excedente'; changeMorale(-50, -40); break;
                case 'challenge_to_prove': changeMorale(5, 0); break;
                case 'dismiss_concern': changeMorale(-15, -15); break;

                // new_challenge
                case 'promise_to_sell': addPromise('will_let_leave', 90); playerToUpdate.isTransferListed = true; changeMorale(10, 10); break;
                case 'remind_importance': changeMorale(5, 5); break;
                case 'offer_new_lucrative_contract': addPromise('will_offer_new_contract', 14); changeMorale(15, 10); break;
                case 'refuse_to_sell': changeMorale(-40, -30); break;
                case 'ask_for_one_more_season': changeMorale(0, 5); break;
                case 'transfer_list_high_price': playerToUpdate.isTransferListed = true; playerToUpdate.askingPrice = playerToUpdate.marketValue * 1.5; changeMorale(-10, -5); break;

                // team_performance
                case 'agree_and_rally': changeMorale(10, 5); break;
                case 'tell_to_focus_on_self': changeMorale(-5, -5); break;
                case 'call_team_meeting': changeMorale(15, 10); break;
                case 'promise_new_signings': addPromise('will_strengthen_position', 90); changeMorale(10, 5); break;
                case 'dismiss_as_overreaction': changeMorale(-10, -10); break;
                case 'blame_the_player': changeMorale(-30, -20); break;

                // position_reinforcement
                case 'promise_to_scout': addPromise('will_strengthen_position', 90); changeMorale(10, 5); break;
                case 'disagree_with_assessment': changeMorale(-10, -5); break;
                case 'ask_for_suggestions': changeMorale(5, 5); break;
                case 'praise_current_players': changeMorale(0, 0); break;
                case 'tell_him_to_lead': changeMorale(5, 0); break;
                case 'remind_budget_constraints': changeMorale(-5, 0); break;

                // unhappy_with_criticism
                case 'apologize': changeMorale(15, 10); break;
                case 'stand_by_comments': changeMorale(-15, -10); break;
                case 'explain_reasoning': changeMorale(5, 0); break;
                case 'praise_in_public': changeMorale(10, 5); break;
                case 'drop_from_squad': changeMorale(-40, -30); break;
                case 'fine_for_dissent': changeMorale(-50, -40); break;
                
                // training_level
                case 'promise_to_improve_facilities': addPromise('will_improve_training', 180); changeMorale(10, 5); break;
                case 'promise_to_hire_better_coaches': addPromise('will_improve_training', 90); changeMorale(15, 10); break;
                case 'defend_coaching_staff': changeMorale(-5, -5); break;
                case 'suggest_individual_focus': changeMorale(5, 0); break;
                case 'disagree_with_player': changeMorale(-10, -10); break;
                case 'tell_to_work_harder': changeMorale(-15, -10); break;

                // wants_to_be_starter
                case 'promise_starter': addPromise('will_be_starter', 7); changeMorale(20, 15); break;
                case 'tell_next_chance': changeMorale(5, 0); break;
                case 'question_fitness': changeMorale(-5, -5); break;
                case 'remind_competition': changeMorale(0, 0); break;
                case 'ignore_demand': changeMorale(-20, -15); break;
                case 'drop_from_squad_for_attitude': playerToUpdate.squadStatus = 'Excedente'; changeMorale(-60, -50); break;

                // broken_promise
                case 'apologize_and_repromise': changeMorale(10, 5); break; // Re-promise would need more logic
                case 'apologize_no_promise': changeMorale(15, 10); break;
                case 'explain_circumstances': changeMorale(5, 0); break;
                case 'offer_new_contract_as_apology': addPromise('will_offer_new_contract', 14); changeMorale(25, 20); break;
                case 'ignore_complaint': changeMorale(-30, -30); break;
                case 'transfer_list_him': playerToUpdate.isTransferListed = true; changeMorale(-20, -20); break;
            }

            playerToUpdate.concern = null;
            playerToUpdate.interactions.push({ topic: 'concern_response', date: new Date(state.currentDate) });
            
            newState.players = rehydratePlayers(newPlayers);
            newState = addNewsItem(newState, `Conversa com ${player.name}`, `Você conversou com ${player.name} sobre suas preocupações.`, 'interaction_praise', playerId);

            return newState;
        }
        case 'PROMOTE_YOUTH_PLAYER': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            if (!player || player.clubId !== state.playerClubId || player.squadStatus !== 'Base') {
                return state;
            }
            
            const newPlayers = {
                ...state.players,
                [playerId]: {
                    ...player,
                    squadStatus: 'Jovem Promessa' as const,
                }
            };

            const content = `${player.name}, a promising ${player.age}-year-old ${player.naturalPosition}, has been promoted from the youth academy to the senior squad.`;
            const newState = addNewsItem(state, 'Youth Prospect Promoted', content, 'youth_player_promoted', playerId);

            return { ...newState, players: newPlayers };
        }
        case 'UPDATE_PLAYER_SQUAD_STATUS': {
            const { playerId, squadStatus } = action.payload;
            const player = state.players[playerId];
            if (!player || player.clubId !== state.playerClubId) {
                return state;
            }
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        squadStatus,
                    },
                },
            };
        }
        case 'SET_PLAYER_ASKING_PRICE': {
            const { playerId, price } = action.payload;
            const player = state.players[playerId];
            if (!player || player.clubId !== state.playerClubId) {
                return state;
            }
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        askingPrice: price > 0 ? price : undefined,
                    },
                },
            };
        }
        case 'ADD_TO_SHORTLIST': {
            const { playerId } = action.payload;
            if (state.shortlist.includes(playerId)) {
                return state;
            }
            return {
                ...state,
                shortlist: [...state.shortlist, playerId],
            };
        }
        case 'REMOVE_FROM_SHORTLIST': {
            const { playerId } = action.payload;
            return {
                ...state,
                shortlist: state.shortlist.filter(id => id !== playerId),
            };
        }
        case 'UPDATE_INDIVIDUAL_TRAINING_FOCUSES': {
            if (!state.playerClubId) return state;
            const { individualFocuses } = action.payload;

            const newPlayers = { ...state.players };
            for (const pId in individualFocuses) {
                if (newPlayers[pId]) {
                    newPlayers[pId].individualTrainingFocus = individualFocuses[pId];
                }
            }

            return { ...state, players: newPlayers };
        }
        case 'UPDATE_WEEKLY_TRAINING_FOCUS': {
            if (!state.playerClubId) return state;
            const { primary, secondary } = action.payload;

            const newClubs = { ...state.clubs };
            newClubs[state.playerClubId].weeklyTrainingFocus = { primary, secondary };

            return { ...state, clubs: newClubs };
        }
        case 'CREATE_SCOUTING_ASSIGNMENT': {
            const newAssignment: ScoutingAssignment = {
                ...action.payload,
                id: state.nextScoutAssignmentId,
                isComplete: false,
                reportPlayerIds: [],
            };
            return {
                ...state,
                scoutingAssignments: [...state.scoutingAssignments, newAssignment],
                nextScoutAssignmentId: state.nextScoutAssignmentId + 1,
            };
        }
        case 'UPGRADE_DEPARTMENT': {
            const { department } = action.payload;
            const playerClubId = state.playerClubId!;
            const club = state.clubs[playerClubId];
            const currentLevel = club.departments[department].level;
            const cost = getDepartmentUpgradeCost(currentLevel);

            if (club.balance < cost || currentLevel >= 5) {
                return state; // Can't afford or max level
            }

            const newClubs = {
                ...state.clubs,
                [playerClubId]: {
                    ...club,
                    balance: club.balance - cost,
                    departments: {
                        ...club.departments,
                        [department]: {
                            ...club.departments[department],
                            level: currentLevel + 1,
                        },
                    },
                },
            };
            
            return { ...state, clubs: newClubs };
        }
         case 'HIRE_STAFF': {
            const { staffId, department } = action.payload;
            const playerClubId = state.playerClubId;
            if (!playerClubId) return state;

            const club = state.clubs[playerClubId];
            if (club.departments[department].chiefId) return state; // Position already filled

            const staffToHire = state.staff[staffId];
            const newStaff = { 
                ...state.staff,
                [staffId]: { ...staffToHire, clubId: playerClubId },
            };

            const newClubs = { 
                ...state.clubs, 
                [playerClubId]: { 
                    ...club, 
                    departments: {
                        ...club.departments,
                        [department]: {
                            ...club.departments[department],
                            chiefId: staffId,
                        }
                    } 
                } 
            };

            return { ...state, staff: newStaff, clubs: newClubs };
        }
        case 'FIRE_STAFF': {
            const { staffId } = action.payload;
            const playerClubId = state.playerClubId;
            if (!playerClubId) return state;

            const staffToFire = state.staff[staffId];
            if (staffToFire.clubId !== playerClubId) return state;

            const club = state.clubs[playerClubId];
            const severance = staffToFire.wage * 4; // 1 month severance
            if (club.balance < severance) {
                return state;
            }

            const newStaff = { 
                ...state.staff,
                [staffId]: { ...staffToFire, clubId: null },
            };
            
            const departmentKey = Object.keys(club.departments).find(d => club.departments[d as DepartmentType].chiefId === staffId) as DepartmentType | undefined;

            const newDepartments = departmentKey ? {
                ...club.departments,
                [departmentKey]: { ...club.departments[departmentKey], chiefId: null }
            } : club.departments;
            
            const newClubs = { 
                ...state.clubs, 
                [playerClubId]: { 
                    ...club, 
                    balance: club.balance - severance,
                    departments: newDepartments 
                } 
            };

            return { ...state, staff: newStaff, clubs: newClubs };
        }
        case 'ADJUST_BUDGETS': {
            if (!state.playerClubId) return state;
            const { transferBudget, wageBudget } = action.payload;
            const club = state.clubs[state.playerClubId];
            const newClubs = {
                ...state.clubs,
                [state.playerClubId]: {
                    ...club,
                    transferBudget,
                    wageBudget,
                }
            };
            return { ...state, clubs: newClubs };
        }
        case 'REQUEST_LOAN': {
            const { bankId, amount, termMonths } = action.payload;
            const playerClubId = state.playerClubId!;
            const club = state.clubs[playerClubId];
            const bank = state.banks[bankId];

            if (!bank || club.reputation < bank.minReputation || amount > bank.maxLoanAmount || termMonths < bank.termMonthsRange[0] || termMonths > bank.termMonthsRange[1]) {
                return state; // Invalid loan request
            }

            // Calculate interest rate based on credit score
            const creditScoreModifier = (100 - club.creditScore) / 100;
            const rateRange = bank.interestRateRange[1] - bank.interestRateRange[0];
            const interestRate = bank.interestRateRange[0] + (rateRange * creditScoreModifier);
            
            const monthlyRate = interestRate / 100 / 12;
            const monthlyRepayment = monthlyRate > 0 
                ? (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
                : amount / termMonths;

            const newLoan: Loan = {
                id: state.nextLoanId,
                bankId,
                clubId: playerClubId,
                principal: amount,
                remainingBalance: amount,
                monthlyRepayment,
                interestRate,
                termMonths,
                monthsRemaining: termMonths,
                startDate: new Date(state.currentDate),
            };

            const newClubs = {
                ...state.clubs,
                [playerClubId]: {
                    ...club,
                    balance: club.balance + amount,
                },
            };

            return {
                ...state,
                clubs: newClubs,
                loans: [...state.loans, newLoan],
                nextLoanId: state.nextLoanId + 1,
            };
        }
        case 'REPAY_LOAN': {
            const { loanId } = action.payload;
            const loanToRepay = state.loans.find(l => l.id === loanId);
            if (!loanToRepay) return state;

            const playerClubId = state.playerClubId!;
            const club = state.clubs[playerClubId];

            if (club.balance < loanToRepay.remainingBalance) {
                return state; // Can't afford
            }

            const newClubs = {
                ...state.clubs,
                [playerClubId]: {
                    ...club,
                    balance: club.balance - loanToRepay.remainingBalance,
                    creditScore: Math.min(100, club.creditScore + 5), // Bonus for early repayment
                    loanHistory: [...club.loanHistory, { bankId: loanToRepay.bankId, outcome: 'paid_off' as const, amount: loanToRepay.principal, date: new Date(state.currentDate) }],
                },
            };
            
            const newLoans = state.loans.filter(l => l.id !== loanId);
            
            const newState = addNewsItem(state, "Loan Repaid Early", `You have successfully repaid your loan from ${state.banks[loanToRepay.bankId].name}. Your club's credit score has improved.`, 'loan_update');

            return {
                ...newState,
                clubs: newClubs,
                loans: newLoans,
            };
        }
        case 'MAKE_BOARD_REQUEST': {
            const { requestType } = action.payload;
            const playerClubId = state.playerClubId!;
            let club = { ...state.clubs[playerClubId] };
            const request = BOARD_REQUESTS.find(r => r.type === requestType);
        
            if (!request) return state;
        
            const cooldownDate = club.boardRequestCooldowns[request.type];
            if (cooldownDate && new Date(cooldownDate) > state.currentDate) return state;
            if (club.requestsThisMonth.count >= 2) return state;
            if (request.requirements.minConfidence && club.managerConfidence < request.requirements.minConfidence) return state;
            if (request.requirements.minReputation && club.reputation < request.requirements.minReputation) return state;
            if (request.requirements.minBalance && club.balance < request.requirements.minBalance) return state;
        
            let newState = { ...state };
            const newCooldown = new Date(state.currentDate);
            newCooldown.setMonth(newCooldown.getMonth() + request.cooldownMonths);
        
            club.boardRequestCooldowns = { ...club.boardRequestCooldowns, [request.type]: newCooldown };
            club.requestsThisMonth = { ...club.requestsThisMonth, count: club.requestsThisMonth.count + 1 };
            
            const successChance = 0.5 + ((club.managerConfidence - 50) / 100); // Range: 0 (at 0 confidence) to 1 (at 100 confidence)
            const success = Math.random() < successChance;
        
            let headline = '';
            let content = '';
        
            if (success) {
                headline = `Diretoria Aprova: ${request.title}`;
                content = `A diretoria aprovou seu pedido para "${request.title}". Eles ficaram impressionados com seu raciocínio.`;
                club.balance -= request.cost;
        
                switch (request.type) {
                    case BoardRequestType.INCREASE_TRANSFER_BUDGET:
                        const increaseAmount = Math.max(50000, club.balance * 0.1);
                        club.transferBudget += increaseAmount;
                        content += `\n\nSeu orçamento de transferências foi aumentado em ${increaseAmount.toLocaleString()}.`;
                        break;
                    case BoardRequestType.INCREASE_WAGE_BUDGET:
                        const wageIncrease = Math.max(1000, club.wageBudget * 0.1);
                        club.wageBudget += wageIncrease;
                        content += `\n\nSeu orçamento de salários foi aumentado em ${wageIncrease.toLocaleString()}/sem.`;
                        break;
                    case BoardRequestType.PRAISE_BOARD:
                        club.managerConfidence = Math.min(100, club.managerConfidence + 5);
                        content = `A diretoria agradece seu elogio público e seu relacionamento se fortaleceu.`;
                        break;
                    case BoardRequestType.REQUEST_MORE_TIME:
                         club.managerConfidence = Math.min(100, club.managerConfidence + 15);
                         content = `A diretoria concedeu a você um voto de confiança e lhe dará mais tempo para provar seu valor.`;
                         break;
                    default:
                        content += ` As mudanças serão implementadas em breve.`
                }
        
            } else {
                headline = `Diretoria Rejeita: ${request.title}`;
                content = `A diretoria rejeitou seu pedido para "${request.title}". Eles não estavam convencidos de que era a decisão certa para o clube neste momento.`;
                club.managerConfidence = Math.max(0, club.managerConfidence - 5);
            }
            
            newState.clubs = { ...newState.clubs, [playerClubId]: club };
            newState = addNewsItem(newState, headline, content, 'board_request_response');
            
            return newState;
        }
        // --- NEW TRANSFER SYSTEM ---
        case 'TOGGLE_PLAYER_TRANSFER_LIST_STATUS': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            if (!player || player.clubId !== state.playerClubId) {
                return state;
            }
            return {
                ...state,
                players: {
                    ...state.players,
                    [playerId]: {
                        ...player,
                        isTransferListed: !player.isTransferListed,
                    },
                },
            };
        }
        case 'OFFER_PLAYER_TO_CLUBS': {
            const { playerId } = action.payload;
            const { newNegotiations, newNews, nextNegotiationId, nextNewsId } = generateOffersForPlayer(playerId, state);
            
            return {
                ...state,
                transferNegotiations: { ...state.transferNegotiations, ...newNegotiations },
                news: [...newNews, ...state.news],
                nextNegotiationId,
                nextNewsId,
            };
        }
        case 'START_TRANSFER_NEGOTIATION': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            const newNegotiation: TransferNegotiation = {
                id: state.nextNegotiationId,
                playerId,
                type: 'transfer',
                sellingClubId: player.clubId,
                buyingClubId: state.playerClubId!,
                stage: 'club',
                status: 'player_turn',
                lastOfferBy: 'player', // Technically no offer yet, but player initiates
                clubOfferHistory: [],
                agentOfferHistory: [],
                agreedFee: 0
            };
            return {
                ...state,
                transferNegotiations: {
                    ...state.transferNegotiations,
                    [state.nextNegotiationId]: newNegotiation,
                },
                nextNegotiationId: state.nextNegotiationId + 1,
            };
        }
        case 'START_LOAN_NEGOTIATION': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            const newNegotiation: TransferNegotiation = {
                id: state.nextNegotiationId,
                playerId,
                type: 'loan',
                sellingClubId: player.clubId,
                buyingClubId: state.playerClubId!,
                stage: 'club',
                status: 'player_turn',
                lastOfferBy: 'player',
                clubOfferHistory: [],
                agentOfferHistory: [],
                agreedFee: 0
            };
            return {
                ...state,
                transferNegotiations: {
                    ...state.transferNegotiations,
                    [state.nextNegotiationId]: newNegotiation,
                },
                nextNegotiationId: state.nextNegotiationId + 1,
            };
        }
        case 'START_RENEWAL_NEGOTIATION': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            const newNegotiation: TransferNegotiation = {
                id: state.nextNegotiationId,
                playerId,
                type: 'renewal',
                sellingClubId: player.clubId,
                buyingClubId: state.playerClubId!,
                stage: 'agent', // Start at agent stage
                status: 'player_turn',
                lastOfferBy: 'player',
                clubOfferHistory: [],
                agentOfferHistory: [],
                agreedFee: 0 // No fee for renewals
            };
            return {
                ...state,
                transferNegotiations: {
                    ...state.transferNegotiations,
                    [state.nextNegotiationId]: newNegotiation,
                },
                nextNegotiationId: state.nextNegotiationId + 1,
            };
        }
        case 'SUBMIT_CLUB_OFFER': {
            const { negotiationId, offer } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.stage !== 'club') return state;
            
            const newNegotiations = { ...state.transferNegotiations };
            newNegotiations[negotiationId] = {
                ...negotiation,
                status: 'ai_turn',
                lastOfferBy: 'player',
                clubOfferHistory: [...negotiation.clubOfferHistory, { offer, by: 'player' }]
            };
            return { ...state, transferNegotiations: newNegotiations };
        }
        case 'ACCEPT_CLUB_COUNTER': {
            const { negotiationId } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.stage !== 'club' || negotiation.status !== 'player_turn') return state;

            const lastOffer = negotiation.clubOfferHistory[negotiation.clubOfferHistory.length - 1].offer;
            const newNegotiations = { ...state.transferNegotiations };
            newNegotiations[negotiationId] = {
                ...negotiation,
                stage: 'agent',
                status: 'player_turn',
                lastOfferBy: 'player',
                agreedFee: isLoanOffer(lastOffer) ? lastOffer.loanFee : lastOffer.fee,
            };
            return { ...state, transferNegotiations: newNegotiations };
        }
        case 'ACCEPT_INCOMING_CLUB_OFFER': {
            const { negotiationId } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.sellingClubId !== state.playerClubId) return state;

            const lastOffer = negotiation.clubOfferHistory.slice().reverse().find(o => o.by === 'ai')?.offer;
            if (!lastOffer) return state;

            const newNegotiations = { ...state.transferNegotiations };
            newNegotiations[negotiationId] = {
                ...negotiation,
                stage: 'agent',
                status: 'ai_turn', // Now AI will simulate agent talks
                lastOfferBy: 'player', // Player accepted the offer
                agreedFee: isLoanOffer(lastOffer) ? lastOffer.loanFee : lastOffer.fee,
            };
            return { ...state, transferNegotiations: newNegotiations };
        }
        case 'SUBMIT_COUNTER_OFFER': {
            const { negotiationId, offer } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.sellingClubId !== state.playerClubId) return state;
            
            const newNegotiations = { ...state.transferNegotiations };
            newNegotiations[negotiationId] = {
                ...negotiation,
                status: 'ai_turn',
                lastOfferBy: 'player',
                clubOfferHistory: [...negotiation.clubOfferHistory, { offer, by: 'player' }]
            };
            return { ...state, transferNegotiations: newNegotiations };
        }
        case 'SUBMIT_AGENT_OFFER': {
            const { negotiationId, offer } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.stage !== 'agent') return state;
            
            const newNegotiations = { ...state.transferNegotiations };
            newNegotiations[negotiationId] = {
                ...negotiation,
                status: 'ai_turn',
                lastOfferBy: 'player',
                agentOfferHistory: [...negotiation.agentOfferHistory, { offer, by: 'player' }]
            };
            return { ...state, transferNegotiations: newNegotiations };
        }
        case 'ACCEPT_AGENT_COUNTER': {
            const { negotiationId } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.stage !== 'agent' || negotiation.status !== 'player_turn') return state;

            const player = { ...state.players[negotiation.playerId] };
            const buyerClub = { ...state.clubs[negotiation.buyingClubId] };
            const sellerClub = { ...state.clubs[negotiation.sellingClubId] };
            const lastOffer = negotiation.agentOfferHistory[negotiation.agentOfferHistory.length - 1].offer;
            const isRenewal = negotiation.sellingClubId === negotiation.buyingClubId;

            // Finalize transfer/renewal
            buyerClub.balance -= (negotiation.agreedFee + lastOffer.signingBonus);
            if (!isRenewal) {
                sellerClub.balance += negotiation.agreedFee;
            }
            player.clubId = negotiation.buyingClubId;
            player.wage = lastOffer.wage;
            player.scoutedAttributes = player.attributes;

            if (isRenewal) {
                const newExpiryDate = new Date(state.currentDate);
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + lastOffer.durationYears);
                player.contractExpires = newExpiryDate;
                player.lastRenewalDate = new Date(state.currentDate);
                player.satisfaction = Math.min(100, player.satisfaction + 20);
                player.morale = Math.min(100, player.morale + 15);
                if (player.squadStatus === 'Base') {
                    player.squadStatus = 'Jovem Promessa';
                }
            } else { // It's a new signing
                 const newExpiryDate = new Date(state.currentDate);
                 newExpiryDate.setFullYear(newExpiryDate.getFullYear() + lastOffer.durationYears);
                 player.contractExpires = newExpiryDate;
                 player.lastRenewalDate = undefined;
            }

            const newPlayers = { ...state.players, [player.id]: player };
            const newClubs = { ...state.clubs, [buyerClub.id]: buyerClub, [sellerClub.id]: sellerClub };
            
            const newNegotiations = { ...state.transferNegotiations };
            newNegotiations[negotiationId] = { ...negotiation, status: 'completed' };

            let newState = { ...state };
            if (isRenewal) {
                 newState = addNewsItem(newState, `Contract Extended: ${player.name}`, `${player.name} has signed a new contract with ${buyerClub.name}, keeping him at the club until ${player.contractExpires.toLocaleDateString()}.`, 'transfer_completed', player.id);
            } else {
                 newState = addNewsItem(newState, `Transfer Confirmed: ${player.name} joins ${buyerClub.name}`, `${player.name} has completed a move from ${sellerClub.name} to ${buyerClub.name} for a fee of ${negotiation.agreedFee.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}.`, 'transfer_completed', player.id);
            }
            
            return { ...newState, players: rehydratePlayers(newPlayers), clubs: newClubs, transferNegotiations: newNegotiations };
        }
        case 'CANCEL_NEGOTIATION': {
            const { negotiationId } = action.payload;
            const newNegotiations = { ...state.transferNegotiations };
            if (newNegotiations[negotiationId]) {
                newNegotiations[negotiationId].status = 'cancelled_player';
            }
            return { ...state, transferNegotiations: newNegotiations };
        }
        case 'PROCESS_AI_NEGOTIATION_RESPONSE': {
            const { negotiationId } = action.payload;
            const negotiation = state.transferNegotiations[negotiationId];
            if (!negotiation || negotiation.status !== 'ai_turn') return state;

            const player = state.players[negotiation.playerId];
            const buyingClub = state.clubs[negotiation.buyingClubId];
            const newNegotiations = { ...state.transferNegotiations };
            const currentNeg = { ...negotiation };
            
            const isPlayerBuying = currentNeg.buyingClubId === state.playerClubId;
            const isPlayerSelling = currentNeg.sellingClubId === state.playerClubId;
            const isPlayerInvolved = isPlayerBuying || isPlayerSelling;

            if (currentNeg.stage === 'club') {
                const lastOffer = currentNeg.clubOfferHistory[currentNeg.clubOfferHistory.length - 1].offer;
                
                if (isLoanOffer(lastOffer)) {
                    // AI response to a loan offer
                    const valueRatio = lastOffer.loanFee / (player.marketValue * 0.15); // loan fee relative to portion of market value
                    const acceptanceChance = Math.max(0.1, Math.min(0.9, (valueRatio - 0.5) + (lastOffer.wageContribution / 200)));

                    if (Math.random() < acceptanceChance) {
                        // AI accepts the loan offer. Move to agent stage.
                        currentNeg.stage = 'agent';
                        currentNeg.agreedFee = lastOffer.loanFee;
                        currentNeg.lastOfferBy = 'ai';
                        currentNeg.status = isPlayerBuying ? 'player_turn' : 'ai_turn';
                    } else {
                        // Counter loan offer
                        const feeMultiplier = 1.1 + Math.random() * 0.4;
                        const counterLoanFee = Math.round((Math.max(lastOffer.loanFee, player.marketValue * 0.1) * feeMultiplier) / 1000) * 1000;
                        const counterWage = Math.min(100, Math.max(lastOffer.wageContribution + 10, 50));
                        
                        const counterOffer: LoanOffer = {
                            loanFee: counterLoanFee,
                            wageContribution: counterWage,
                            futureBuyOption: lastOffer.futureBuyOption ? Math.round(lastOffer.futureBuyOption * 1.1) : undefined,
                        };

                        currentNeg.clubOfferHistory.push({ offer: counterOffer, by: 'ai' });
                        currentNeg.lastOfferBy = 'ai';
                        currentNeg.status = isPlayerInvolved ? 'player_turn' : 'ai_turn';
                    }
                } else { // It's a TransferOffer
                    const valueRatio = lastOffer.fee / player.marketValue;
                    const repDiffFactor = (state.clubs[currentNeg.buyingClubId].reputation - state.clubs[currentNeg.sellingClubId].reputation) / 100;
                    const acceptanceChance = Math.max(0.05, Math.min(0.95, (valueRatio - 0.2) + repDiffFactor));

                    if (Math.random() < acceptanceChance) {
                        // AI accepts the club-to-club offer. Move to agent stage.
                        currentNeg.stage = 'agent';
                        currentNeg.agreedFee = lastOffer.fee;
                        currentNeg.lastOfferBy = 'ai'; // The AI (seller) just accepted.
                        currentNeg.status = isPlayerBuying ? 'player_turn' : 'ai_turn';
                    } else {
                        // Counter offer
                        const feeMultiplier = 1.1 + Math.random() * 0.3;
                        const counterFee = Math.round((Math.max(lastOffer.fee, player.marketValue) * feeMultiplier) / 1000) * 1000;
                        const counterOffer: TransferOffer = { fee: counterFee, sellOnPercentage: Math.random() < 0.3 ? 15 : undefined };
                        currentNeg.clubOfferHistory.push({ offer: counterOffer, by: 'ai' });
                        currentNeg.lastOfferBy = 'ai';
                        currentNeg.status = isPlayerInvolved ? 'player_turn' : 'ai_turn';
                    }
                }
            } else if (currentNeg.stage === 'agent') {
                if (isPlayerSelling) {
                    const buyerClub = state.clubs[currentNeg.buyingClubId];
                    const wageOffer = Math.max(player.wage * 1.1, player.marketValue / 120);
                    const wageRatio = wageOffer / player.wage;
                    const repRatio = buyerClub.reputation / state.clubs[player.clubId].reputation;
                    const acceptanceChance = Math.max(0.2, Math.min(0.95, (wageRatio * 0.4) + (repRatio * 0.4)));

                    if (Math.random() < acceptanceChance) {
                        // Transfer successful
                        const sellerClub = { ...state.clubs[currentNeg.sellingClubId] };
                        const updatedBuyerClub = { ...buyerClub };
                        const updatedPlayer = { ...player };

                        sellerClub.balance += currentNeg.agreedFee;
                        updatedBuyerClub.balance -= currentNeg.agreedFee;
                        updatedPlayer.clubId = currentNeg.buyingClubId;
                        updatedPlayer.wage = wageOffer;
                        const newExpiry = new Date(state.currentDate);
                        newExpiry.setFullYear(newExpiry.getFullYear() + 3);
                        updatedPlayer.contractExpires = newExpiry;

                        const newPlayers = { ...state.players, [player.id]: updatedPlayer };
                        const newClubs = { ...state.clubs, [sellerClub.id]: sellerClub, [updatedBuyerClub.id]: updatedBuyerClub };
                        currentNeg.status = 'completed';
                        
                        let newState = addNewsItem(state, `Transfer Confirmed: ${player.name} joins ${buyerClub.name}`, `${player.name} has completed a move from ${sellerClub.name} to ${buyerClub.name} for a fee of ${currentNeg.agreedFee.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}.`, 'transfer_completed', player.id);
                        newNegotiations[negotiationId] = currentNeg;
                        return { ...newState, players: rehydratePlayers(newPlayers), clubs: newClubs, transferNegotiations: newNegotiations };

                    } else {
                        // Transfer collapses
                        currentNeg.status = 'cancelled_ai';
                        newNegotiations[negotiationId] = currentNeg;
                        let newState = addNewsItem(state, `Transfer Collapses`, `The transfer of ${player.name} to ${buyerClub.name} has collapsed after the player failed to agree personal terms.`, 'transfer_deal_collapsed', player.id);
                        return { ...newState, transferNegotiations: newNegotiations };
                    }
                }
                else if (!isPlayerInvolved) {
                    const buyerClub = state.clubs[currentNeg.buyingClubId];
                    const wageOffer = Math.max(player.wage * 1.1, player.marketValue / 120);
                    const wageRatio = wageOffer / player.wage;
                    const repRatio = buyerClub.reputation / state.clubs[player.clubId].reputation;
                    const acceptanceChance = Math.max(0.2, Math.min(0.95, (wageRatio * 0.4) + (repRatio * 0.4)));

                    if (Math.random() < acceptanceChance) {
                        // Transfer successful
                        const sellerClub = { ...state.clubs[currentNeg.sellingClubId] };
                        const updatedBuyerClub = { ...buyerClub };
                        const updatedPlayer = { ...player };

                        sellerClub.balance += currentNeg.agreedFee;
                        updatedBuyerClub.balance -= currentNeg.agreedFee;
                        updatedPlayer.clubId = currentNeg.buyingClubId;
                        updatedPlayer.wage = wageOffer;
                        const newExpiry = new Date(state.currentDate);
                        newExpiry.setFullYear(newExpiry.getFullYear() + 3);
                        updatedPlayer.contractExpires = newExpiry;

                        const newPlayers = { ...state.players, [player.id]: updatedPlayer };
                        const newClubs = { ...state.clubs, [sellerClub.id]: sellerClub, [updatedBuyerClub.id]: updatedBuyerClub };
                        currentNeg.status = 'completed';
                        
                        let newState = addNewsItem(state, `Transfer Confirmed: ${player.name} joins ${buyerClub.name}`, `${player.name} has completed a move from ${sellerClub.name} to ${buyerClub.name} for a fee of ${currentNeg.agreedFee.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}.`, 'transfer_completed', player.id);
                        newNegotiations[negotiationId] = currentNeg;
                        return { ...newState, players: rehydratePlayers(newPlayers), clubs: newClubs, transferNegotiations: newNegotiations };

                    } else {
                        // Transfer collapses
                        currentNeg.status = 'cancelled_ai';
                        newNegotiations[negotiationId] = currentNeg;
                        let newState = addNewsItem(state, `Transfer Collapses`, `The transfer of ${player.name} to ${buyerClub.name} has collapsed after the player failed to agree personal terms.`, 'transfer_deal_collapsed', player.id);
                        return { ...newState, transferNegotiations: newNegotiations };
                    }
                }


                else if (isPlayerBuying) {
                    const lastOffer = currentNeg.agentOfferHistory[currentNeg.agentOfferHistory.length - 1].offer;
                    const expectedWage = player.marketValue / 100;
                    const wageRatio = lastOffer.wage / expectedWage;
                    
                    let acceptanceChance = Math.max(0.1, Math.min(0.95, (wageRatio - 0.9) * 2));

                    if (lastOffer.appearanceBonus) acceptanceChance += 0.03;
                    if (lastOffer.goalBonus) acceptanceChance += 0.03;
                    if (lastOffer.loyaltyBonus) acceptanceChance += 0.05;
                    if (lastOffer.leagueTitleBonus) acceptanceChance += 0.04;
                    if (lastOffer.annualSalaryIncrease) acceptanceChance += 0.05;
                    if (lastOffer.playerExtensionOption) acceptanceChance += 0.04;
                    if (lastOffer.clubExtensionOption) acceptanceChance -= 0.03;

                    if (Math.random() < acceptanceChance) {
                        // Player accepts player's contract offer
                        return gameReducer(state, { type: 'ACCEPT_AGENT_COUNTER', payload: { negotiationId } });

                    } else {
                        // Counter agent offer
                        const wageMultiplier = 1.05 + Math.random() * 0.15;
                        const counterWage = Math.round((Math.max(lastOffer.wage, expectedWage) * wageMultiplier) / 100) * 100;
                        const counterOffer: ContractOffer = {
                            wage: counterWage,
                            signingBonus: Math.max(lastOffer.signingBonus, player.marketValue * 0.05),
                            goalBonus: lastOffer.goalBonus,
                            durationYears: lastOffer.durationYears,
                        };
                        if (player.potential > 85 && Math.random() < 0.25) {
                            counterOffer.loyaltyBonus = Math.round(player.marketValue * 0.1);
                        }
                        if (player.age < 22 && Math.random() < 0.3) {
                            counterOffer.annualSalaryIncrease = 10; // 10%
                        }
                        if (buyingClub.reputation < 60 && Math.random() < 0.4) {
                            counterOffer.relegationReleaseClause = Math.round(player.marketValue * 0.75);
                        }

                        currentNeg.agentOfferHistory.push({ offer: counterOffer, by: 'ai' });
                        currentNeg.status = 'player_turn';
                        currentNeg.lastOfferBy = 'ai';
                    }
                }
            }

            newNegotiations[negotiationId] = currentNeg;
            return { ...state, transferNegotiations: newNegotiations };
        }
        // Match Engine Reducers
        case 'START_MATCH': {
            const { homeTeam, awayTeam } = action.payload;
            const playerClubId = state.playerClubId!;
            const playerClub = state.clubs[playerClubId];

            const lineup = playerClub.tactics.lineup.filter((p): p is LineupPlayer => p !== null);
            if (lineup.length < 11) {
                return { ...state, matchStartError: `You must select a full lineup of 11 players.` };
            }
            
            const invalidPlayersMessages: string[] = [];
            for (const lineupPlayer of lineup) {
                const player = state.players[lineupPlayer.playerId];
                const issues = [];
                if (player.injury) {
                    issues.push('Injured');
                }
                if (player.suspension) {
                    issues.push('Suspended');
                }
                if (issues.length > 0) {
                    invalidPlayersMessages.push(`${player.name} (${issues.join(' & ')})`);
                }
            }

            if (invalidPlayersMessages.length > 0) {
                const errorMessage = `Your lineup is invalid. The following players cannot play: ${invalidPlayersMessages.join(', ')}.`;
                return { ...state, matchStartError: errorMessage };
            }

            let tempClubs = { ...state.clubs };

            const opponent = homeTeam.id === playerClubId ? awayTeam : homeTeam;
            const playerClubRatings = getUnitRatings(playerClubId, state.clubs, state.players);
            const opponentRatings = getUnitRatings(opponent.id, state.clubs, state.players);

            const opponentPlayers = (Object.values(state.players) as Player[]).filter(p => p.clubId === opponent.id && !p.injury && !p.suspension);
            
            const opponentChiefs = Object.values(opponent.departments).map(d => d.chiefId).filter(Boolean) as number[];
            const opponentStaff = opponentChiefs.map(id => state.staff[id]);
            const newAITactics = generateAITactics(opponentPlayers, opponentStaff, opponentRatings, playerClubRatings);
            
            tempClubs[opponent.id] = { ...tempClubs[opponent.id], tactics: newAITactics };

            const liveMatch = createLiveMatchState(action.payload, tempClubs, state.players, playerClubId);
            return { ...state, clubs: tempClubs, matchDayFixtures: null, liveMatch, matchStartError: null };
        }
        case 'ADVANCE_MINUTE': {
            if (!state.liveMatch) return state;
            return { ...state, liveMatch: action.payload.newState };
        }
        case 'PAUSE_MATCH': {
             if (!state.liveMatch) return state;
             return { ...state, liveMatch: { ...state.liveMatch, isPaused: true } };
        }
        case 'RESUME_MATCH': {
            if (!state.liveMatch) return state;
            return { ...state, liveMatch: { ...state.liveMatch, isPaused: false } };
        }
        case 'MAKE_SUBSTITUTION': {
            if (!state.liveMatch) return state;
            const isHome = state.liveMatch.homeTeamId === state.playerClubId;
            if ((isHome && state.liveMatch.homeSubsMade >= 5) || (!isHome && state.liveMatch.awaySubsMade >= 5)) return state;

            const liveMatch = state.liveMatch;
            const lineup = isHome ? liveMatch.homeLineup : liveMatch.awayLineup;
            const bench = isHome ? liveMatch.homeBench : liveMatch.awayBench;

            const playerOutIndex = lineup.findIndex(p => p.id === action.payload.playerOutId);
            const playerInFromBenchIndex = bench.findIndex(p => p.id === action.payload.playerInId);

            if (playerOutIndex === -1 || playerInFromBenchIndex === -1) return state;
            
            const playerIn = bench[playerInFromBenchIndex];
            const playerOut = lineup[playerOutIndex];

            // Swap players
            lineup[playerOutIndex] = playerIn;
            bench[playerInFromBenchIndex] = playerOut;

            // Update sub count and log
            const newLog = [...liveMatch.log, { minute: liveMatch.minute, text: `${playerIn.name} comes on for ${playerOut.name}.`, type: 'Sub' as const, primaryPlayerId: playerIn.id, secondaryPlayerId: playerOut.id }];
            
            if (isHome) {
                return { ...state, liveMatch: { ...liveMatch, homeLineup: lineup, homeBench: bench, homeSubsMade: liveMatch.homeSubsMade + 1, log: newLog }};
            } else {
                return { ...state, liveMatch: { ...liveMatch, awayLineup: lineup, awayBench: bench, awaySubsMade: liveMatch.awaySubsMade + 1, log: newLog }};
            }
        }
        case 'DISMISS_FORCED_SUBSTITUTION': {
            if (!state.liveMatch) return state;
            return { ...state, liveMatch: { ...state.liveMatch, forcedSubstitution: null, isPaused: false }};
        }
        case 'CHANGE_LIVE_TACTICS': {
            if (!state.liveMatch) return state;
            const isHome = state.liveMatch.homeTeamId === state.playerClubId;
            if (isHome) {
                return { ...state, liveMatch: { ...state.liveMatch, homeMentality: action.payload.mentality }};
            } else {
                return { ...state, liveMatch: { ...state.liveMatch, awayMentality: action.payload.mentality }};
            }
        }
        case 'UPDATE_TEAM_INSTRUCTIONS': {
            // Placeholder for more complex logic
            return state;
        }
        case 'UPDATE_LIVE_PLAYER_POSITION': {
            if (!state.liveMatch) return state;
            const isHome = state.liveMatch.homeTeamId === state.playerClubId;
            const lineup = isHome ? state.liveMatch.homeLineup : state.liveMatch.awayLineup;
            const playerIndex = lineup.findIndex(p => p.id === action.payload.playerId);
            if (playerIndex === -1) return state;

            lineup[playerIndex] = { 
                ...lineup[playerIndex], 
                currentPosition: action.payload.position,
                role: action.payload.role,
            };

             if (isHome) {
                return { ...state, liveMatch: { ...state.liveMatch, homeLineup: lineup }};
            } else {
                return { ...state, liveMatch: { ...state.liveMatch, awayLineup: lineup }};
            }
        }
         case 'UPDATE_LIVE_PLAYER_INSTRUCTIONS': {
            if (!state.liveMatch) return state;
            const isHome = state.liveMatch.homeTeamId === state.playerClubId;
            const lineup = isHome ? state.liveMatch.homeLineup : state.liveMatch.awayLineup;
            const playerIndex = lineup.findIndex(p => p.id === action.payload.playerId);
            if (playerIndex === -1) return state;

            lineup[playerIndex] = { 
                ...lineup[playerIndex], 
                instructions: action.payload.instructions,
            };

             if (isHome) {
                return { ...state, liveMatch: { ...state.liveMatch, homeLineup: lineup }};
            } else {
                return { ...state, liveMatch: { ...state.liveMatch, awayLineup: lineup }};
            }
        }
        case 'END_MATCH': {
            if (!state.liveMatch) return state;

            const finalState = state.liveMatch;
            const season = getSeason(state.currentDate);

            // 1. Update schedule with the final match result
            const matchIndex = state.schedule.findIndex(m => m.id === finalState.matchId);
            if (matchIndex === -1) return state; // Should not happen

            const playerResult: Match = {
                ...state.schedule[matchIndex],
                homeScore: finalState.homeScore,
                awayScore: finalState.awayScore,
                homeStats: finalState.homeStats,
                awayStats: finalState.awayStats,
                log: finalState.log,
                playerStats: {}, // Will be populated next
                homeLineup: finalState.initialHomeLineup,
                awayLineup: finalState.initialAwayLineup,
                disciplinaryEvents: [],
                injuryEvents: [],
            };

            const allPlayersInMatch = [...finalState.homeLineup, ...finalState.awayLineup, ...finalState.homeBench, ...finalState.awayBench];
            allPlayersInMatch.forEach(p => {
                if (p) playerResult.playerStats![p.id] = p.stats;
            });
            
            // Generate injuries
            const injuredPlayers = finalState.injuredPlayerIds.map(id => state.players[id]).filter(p => p);
            if(injuredPlayers.length > 0) {
                // FIX: Add missing 'startDate' property to injury events.
                 playerResult.injuryEvents = injuredPlayers.map(p => {
                    const injury = generateInjury(state.currentDate, p);
                    return { playerId: p.id, type: injury.type, returnDate: injury.returnDate, startDate: injury.startDate };
                 });
            }
            
            // Generate disciplinary events
             playerResult.disciplinaryEvents = allPlayersInMatch.reduce((acc, p) => {
                if (p) {
                    if (p.isSentOff) acc.push({ playerId: p.id, type: 'red' });
                    else if (p.yellowCardCount > 0) {
                        for (let i = 0; i < p.yellowCardCount; i++) acc.push({ playerId: p.id, type: 'yellow' });
                    }
                }
                return acc;
            }, [] as { playerId: number, type: 'yellow' | 'red' }[]);


            let newState = { ...state };
            newState.schedule[matchIndex] = playerResult;

            // 2. Update player stats and fitness
            let newPlayers = updatePlayerStatsFromMatchResult(newState.players, playerResult, season, finalState);
            const updatedPlayers: Record<number, Player> = JSON.parse(JSON.stringify(newPlayers));
            
            const processFitness = (livePlayer: LivePlayer) => {
                if(updatedPlayers[livePlayer.id]) {
                    const originalPlayer = updatedPlayers[livePlayer.id];
                    originalPlayer.matchFitness = Math.max(0, originalPlayer.matchFitness - (100 - livePlayer.stamina)/4);
                }
            };
            
            finalState.homeLineup.forEach(processFitness);
            finalState.awayLineup.forEach(processFitness);
            
            // Process injuries and suspensions for player team
            if(playerResult.injuryEvents) {
                playerResult.injuryEvents.forEach(injury => {
                    const injuredPlayer = updatedPlayers[injury.playerId];
                    if (injuredPlayer && injuredPlayer.clubId === newState.playerClubId) {
                        // FIX: Add missing 'startDate' property to injury object.
                        injuredPlayer.injury = { type: injury.type, returnDate: injury.returnDate, startDate: injury.startDate };
                        
                        const diffTime = Math.abs(injury.returnDate.getTime() - playerResult.date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const durationText = diffDays > 10 ? `approx. ${Math.round(diffDays/7)} weeks` : `approx. ${diffDays} days`;
                        
                        newState = addNewsItem(newState, `Player Injured: ${injuredPlayer.name}`, `${injuredPlayer.name} picked up an injury in the match.\n\nHe is expected to be out for ${durationText}. The diagnosis is: ${injury.type}.`, 'injury_report_player', injuredPlayer.id);
                    }
                });
            }
             if(playerResult.disciplinaryEvents) {
                playerResult.disciplinaryEvents.forEach(card => {
                    const cardedPlayer = updatedPlayers[card.playerId];
                    if (cardedPlayer && cardedPlayer.clubId === newState.playerClubId) {
                        if (card.type === 'red') {
                            const returnDate = new Date(playerResult.date);
                            returnDate.setDate(returnDate.getDate() + 8); // 1 match ban
                            cardedPlayer.suspension = { returnDate };
                            newState = addNewsItem(newState, `Player Suspended: ${cardedPlayer.name}`, `${cardedPlayer.name} received a red card and will be suspended for the next match.`, 'suspension_report_player', cardedPlayer.id);
                        } else if (card.type === 'yellow') {
                            cardedPlayer.seasonYellowCards = (cardedPlayer.seasonYellowCards || 0) + 1;
                            if (cardedPlayer.seasonYellowCards >= 3) {
                                const returnDate = new Date(playerResult.date);
                                returnDate.setDate(returnDate.getDate() + 8);
                                cardedPlayer.suspension = { returnDate };
                                cardedPlayer.seasonYellowCards = 0;
                                newState = addNewsItem(newState, `Player Suspended: ${cardedPlayer.name}`, `${cardedPlayer.name} has accumulated 3 yellow cards and will be suspended for the next match.`, 'suspension_report_player', cardedPlayer.id);
                            }
                        }
                    }
                });
            }

            // 3. Update league table
            newState.leagueTable = updateLeagueTableForMatch(newState.leagueTable, playerResult);
            newState.leagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
            
            // 4. Update state to show results modal
            newState.players = rehydratePlayers(updatedPlayers);
            newState.matchDayResults = {
                playerResult,
                aiResults: newState.matchDayFixtures?.aiMatches || []
            };

            return {
                ...newState,
                liveMatch: null,
            };
        }
        case 'SET_MENTORING_RELATIONSHIPS': {
            if (!state.playerClubId) return state;
            const { mentorId, menteeIds } = action.payload;
            
            const newPlayers = JSON.parse(JSON.stringify(state.players));

            // Clear old relationships for the player's club
            Object.values(newPlayers).forEach((p: Player) => {
                if (p.clubId === state.playerClubId) {
                    p.mentorId = null;
                    p.menteeIds = [];
                }
            });

            // Set new relationships
            if (mentorId) {
                const mentor = newPlayers[mentorId];
                if (mentor) {
                    mentor.menteeIds = menteeIds;
                    menteeIds.forEach(id => {
                        const mentee = newPlayers[id];
                        if (mentee) {
                            mentee.mentorId = mentorId;
                        }
                    });
                }
            }

            return { ...state, players: rehydratePlayers(newPlayers) };
        }
        default:
            return state;
    }
};