import { GameState, LivePlayer, Player, Club, Match, NewsItem, MatchDayInfo, PlayerMatchStats, LineupPlayer, PressingInstruction, PositioningInstruction, CrossingInstruction, DribblingInstruction, PassingInstruction, PlayerAttributes, ScoutingAssignment, Staff, HeadOfPhysiotherapyAttributes, StaffRole, HeadOfScoutingAttributes, SeasonReviewData, LeagueEntry, TransferNegotiation, DepartmentType } from '../types';
import { Action } from './reducerTypes';
import { runMatch, processPlayerDevelopment, processPlayerAging, processMonthlyFinances, recalculateMarketValue, awardPrizeMoney, processPromotionsAndRelegations, generateRegens, getUnitRatings } from './simulationService';
import { createLiveMatchState } from './matchEngine';
import { generateNarrativeReport } from './newsGenerator';
import { generateAITactics } from './aiTacticsService';
import { updatePlayerStatsFromMatchResult, getSeason } from './playerStatsService';
import { generateInjury } from './injuryService';
import { getRoleCategory, generateScheduleForCompetition } from './database';
import { processAITransfers } from './AITransferService';

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
};

const getDepartmentUpgradeCost = (level: number) => {
    return [0, 25000, 75000, 200000, 500000, Infinity][level] || Infinity;
};

const rehydratePlayers = (players: Record<number, Player>): Record<number, Player> => {
    for (const pId in players) {
        const player = players[pId];
        if (player.contractExpires) player.contractExpires = new Date(player.contractExpires);
        if (player.injury?.returnDate) player.injury.returnDate = new Date(player.injury.returnDate);
        if (player.suspension?.returnDate) player.suspension.returnDate = new Date(player.suspension.returnDate);
        if (player.promise?.deadline) player.promise.deadline = new Date(player.promise.deadline);
        if (player.lastRenewalDate) player.lastRenewalDate = new Date(player.lastRenewalDate);
        player.interactions.forEach(i => i.date = new Date(i.date));
        player.attributeChanges.forEach(c => c.date = new Date(c.date));
    }
    return players;
}

const rehydrateAssignments = (assignments: ScoutingAssignment[]): ScoutingAssignment[] => {
    assignments.forEach(a => {
        if (a.completionDate) a.completionDate = new Date(a.completionDate);
    });
    return assignments;
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
    newState.clubs = processMonthlyFinances(newState.clubs, newState.players, newState.staff);

    // 4. Handle yearly aging
    if (newState.currentDate.getMonth() === 0) { // New year
        const { players } = processPlayerAging(newState.players);
        newState.players = players;
    } else if (newState.currentDate.getMonth() === 6 && newState.currentDate.getDate() === 1) { // New season start
        (Object.values(newState.players) as Player[]).forEach(p => p.seasonYellowCards = 0);
    }
    
    return newState;
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
                players: rehydratePlayers(newPlayers)
            };
        }
        case 'ADVANCE_DAY': {
            if (state.liveMatch || state.seasonReviewData) return state; // Can't advance day during a match or season review

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

                // --- NEW: Update manager confidence based on objective ---
                let newConfidence = playerClub.managerConfidence;
                if (playerClub.boardObjective?.type === 'league_finish') {
                    const finalPosition = finalTable.findIndex(e => e.clubId === state.playerClubId!) + 1;
                    if (finalPosition <= playerClub.boardObjective.position) {
                        newConfidence = Math.min(100, newConfidence + 20); // Objective met
                    } else {
                        newConfidence = Math.max(0, newConfidence - 30); // Objective failed
                    }
                }
                const newClubs = { ...state.clubs, [state.playerClubId!]: { ...playerClub, managerConfidence: newConfidence }};

                return { ...state, clubs: newClubs, seasonReviewData };
            }

            const newDate = new Date(state.currentDate);
            newDate.setDate(newDate.getDate() + 1);

            let newState = { ...state, currentDate: newDate };
            
            // On Sundays, process AI transfer market activity
            if (newDate.getDay() === 0) { // 0 is Sunday
                newState = processAITransfers(newState);
            }

            // Process negotiations (this will also handle AI responses to offers)
            newState = processNegotiations(newState);


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
                    
                    // Reveal attributes for found players based on scout skill
                    const clonedPlayersForScouting = JSON.parse(JSON.stringify(newState.players));
                    assignment.reportPlayerIds.forEach(pId => {
                        const playerToScout = clonedPlayersForScouting[pId];
                        // Reveal potential range
                        const potentialErrorMargin = Math.round((100 - judgingPlayerPotential) / 3);
                        playerToScout.scoutedPotentialRange = [
                            Math.max(1, playerToScout.potential - potentialErrorMargin),
                            Math.min(100, playerToScout.potential + potentialErrorMargin)
                        ];

                        // Reveal a percentage of attributes
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
                        newState = addNewsItem(newState, `Promise Broken: ${player.name}`, `${player.name} is unhappy that you did not keep your promise to give him more playing time.`, 'promise_broken', player.id);
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
                                
                                player.injury = { type: injury.type, returnDate: newReturnDate };

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
            const tempState = { ...state };
            const playerClubId = tempState.playerClubId!;

            // 1. Award Prize Money (immutable)
            const clubsWithPrizeMoney = awardPrizeMoney(tempState.clubs, tempState.leagueTable);

            // 2. Process Promotions & Relegations (immutable)
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
            
            // 3. Process Aging and Retirements (immutable)
            const { players: agedPlayers, retiredPlayers } = processPlayerAging(tempState.players);
            
            // 4. Generate Regens (Youth Intake)
            const regens = generateRegens(clubsAfterPromotion, retiredPlayers.length, agedPlayers, playerClubId, tempState.staff);
            const playersWithRegens = regens.reduce((acc, regen) => {
                acc[regen.id] = regen;
                return acc;
            }, { ...agedPlayers });

            // 8. Reset season-specific player data (immutable)
            const finalPlayersState = Object.values(playersWithRegens).reduce((acc, player) => {
                acc[player.id] = { ...player, seasonYellowCards: 0 };
                return acc;
            }, {} as Record<number, Player>);

            // 5. Reset league table for the new season's top division
            const newLeagueClubs = Object.values(clubsAfterPromotion).filter(c => c.competitionId === 1);
            const newLeagueTable: LeagueEntry[] = newLeagueClubs.map(c => ({
                clubId: c.id, played: 0, wins: 0, draws: 0, losses: 0, 
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
            }));

            // 6. Set date to next season's start
            const newStartDate = new Date(tempState.currentDate);
            newStartDate.setFullYear(newStartDate.getFullYear() + 1);
            newStartDate.setMonth(7); // August
            newStartDate.setDate(10);

            // 7. Generate new schedule
            const newSchedule = generateScheduleForCompetition(newLeagueClubs, newStartDate);
            
            // --- NEW: Generate Board Objectives and Reset Confidence ---
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
                newClub.managerConfidence = 100; // Reset confidence for new season
                acc[newClub.id] = newClub;
                return acc;
            }, {} as Record<number, Club>);

            // 9. Return the final, assembled state
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
        case 'REOPEN_MATCH_DAY_MODAL': {
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
                case 'promise':
                    updatedPlayer.satisfaction = Math.min(100, player.satisfaction + 20);
                    const deadline = new Date(state.currentDate);
                    deadline.setDate(deadline.getDate() + 14); // 2 week deadline
                    updatedPlayer.promise = { type: 'playing_time', deadline };
                    newState = addNewsItem(
                        newState,
                        `${player.name} gets playing time promise`,
                        `After a private discussion, the manager has promised ${player.name} more first-team opportunities in the coming weeks.`,
                        'interaction_promise',
                        player.id
                    );
                    break;
            }

            return { ...newState, players: rehydratePlayers(newPlayers) };
        }
        case 'PROMOTE_YOUTH_PLAYER': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            if (!player || player.clubId !== state.playerClubId || player.squadStatus !== 'youth') {
                return state;
            }
            
            const newPlayers = {
                ...state.players,
                [playerId]: {
                    ...player,
                    squadStatus: 'senior' as const,
                }
            };

            const content = `${player.name}, a promising ${player.age}-year-old ${player.naturalPosition}, has been promoted from the youth academy to the senior squad.`;
            const newState = addNewsItem(state, 'Youth Prospect Promoted', content, 'youth_player_promoted', playerId);

            return { ...newState, players: newPlayers };
        }
        case 'UPDATE_TRAINING_SETTINGS': {
            if (!state.playerClubId) return state;
            const { teamFocus, individualFocuses } = action.payload;

            const newClubs = { ...state.clubs };
            newClubs[state.playerClubId].trainingFocus = teamFocus;

            const newPlayers = { ...state.players };
            for (const pId in individualFocuses) {
                if (newPlayers[pId]) {
                    newPlayers[pId].individualTrainingFocus = individualFocuses[pId];
                }
            }

            return { ...state, clubs: newClubs, players: newPlayers };
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
        // --- NEW TRANSFER SYSTEM ---
        case 'START_TRANSFER_NEGOTIATION': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            const newNegotiation: TransferNegotiation = {
                id: state.nextNegotiationId,
                playerId,
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
        case 'START_RENEWAL_NEGOTIATION': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            const newNegotiation: TransferNegotiation = {
                id: state.nextNegotiationId,
                playerId,
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
                agreedFee: lastOffer.fee,
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
                agreedFee: lastOffer.fee,
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
                if (player.squadStatus === 'youth') {
                    player.squadStatus = 'senior';
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
            const newNegotiations = { ...state.transferNegotiations };
            const currentNeg = { ...negotiation };

            if (currentNeg.stage === 'club') {
                const lastOffer = currentNeg.clubOfferHistory[currentNeg.clubOfferHistory.length - 1].offer;
                const valueRatio = lastOffer.fee / player.marketValue;
                const acceptanceChance = Math.max(0.05, Math.min(0.95, valueRatio - 0.1));

                if (Math.random() < acceptanceChance) {
                    // Accept offer
                    currentNeg.stage = 'agent';
                    currentNeg.status = 'player_turn';
                    currentNeg.lastOfferBy = 'player';
                    currentNeg.agreedFee = lastOffer.fee;
                } else {
                    // Counter offer
                    const feeMultiplier = 1.1 + Math.random() * 0.3;
                    const counterFee = Math.round((Math.max(lastOffer.fee, player.marketValue) * feeMultiplier) / 1000) * 1000;
                    const counterOffer = { fee: counterFee, sellOnPercentage: Math.random() < 0.3 ? 15 : undefined };
                    currentNeg.clubOfferHistory.push({ offer: counterOffer, by: 'ai' });
                    currentNeg.status = 'player_turn';
                    currentNeg.lastOfferBy = 'ai';
                }
            } else if (currentNeg.stage === 'agent') {
                const isPlayerSelling = negotiation.sellingClubId === state.playerClubId;
                const isPlayerBuying = negotiation.buyingClubId === state.playerClubId;
                
                // --- SIMULATION FOR WHEN PLAYER IS SELLING ---
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

                // --- AI RESPONSE LOGIC FOR WHEN PLAYER IS BUYING ---
                if (isPlayerBuying) {
                    const lastOffer = currentNeg.agentOfferHistory[currentNeg.agentOfferHistory.length - 1].offer;
                    const expectedWage = player.marketValue / 100;
                    const wageRatio = lastOffer.wage / expectedWage;
                    const acceptanceChance = Math.max(0.1, Math.min(0.95, (wageRatio - 0.9) * 2));
                    const isRenewal = currentNeg.sellingClubId === currentNeg.buyingClubId;
                    
                    if (Math.random() < acceptanceChance) {
                        // Player accepts player's contract offer
                        return gameReducer(state, { type: 'ACCEPT_AGENT_COUNTER', payload: { negotiationId } });

                    } else {
                        // Counter agent offer
                        const wageMultiplier = 1.05 + Math.random() * 0.15;
                        const counterWage = Math.round((Math.max(lastOffer.wage, expectedWage) * wageMultiplier) / 100) * 100;
                        const counterOffer = {
                            wage: counterWage,
                            signingBonus: Math.max(lastOffer.signingBonus, player.marketValue * 0.05),
                            goalBonus: lastOffer.goalBonus,
                            releaseClause: lastOffer.releaseClause,
                            durationYears: lastOffer.durationYears,
                        };
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

            // --- VALIDATION LOGIC ---
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
            // --- END VALIDATION ---

            let tempClubs = { ...state.clubs };

            // If AI is playing, generate dynamic tactics for them
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

            const playerOut = lineup[playerOutIndex];
            const playerInFromBench = bench[playerInFromBenchIndex];
            
            const wasBallCarrier = liveMatch.ballCarrierId === playerOut.id;

            const newPlayerIn: LivePlayer = {
                ...playerInFromBench,
                role: playerOut.role,
                instructions: { ...playerOut.instructions },
                currentPosition: { ...playerOut.currentPosition },
                stats: { ...playerInFromBench.stats }
            };

            const newLineup = [...lineup];
            newLineup[playerOutIndex] = newPlayerIn;
            
            const newBench = [...bench];
            newBench.splice(playerInFromBenchIndex, 1);

            const teamName = isHome ? liveMatch.homeTeamName : liveMatch.awayTeamName;
            const newLog = [...liveMatch.log, { minute: liveMatch.minute, type: 'Sub' as const, text: `Substitution for ${teamName}: ${newPlayerIn.name} comes on for ${playerOut.name}.`, primaryPlayerId: newPlayerIn.id, secondaryPlayerId: playerOut.id }];
            
            let updatedState = { ...liveMatch, log: newLog };
            if (isHome) {
                updatedState.homeLineup = newLineup;
                updatedState.homeBench = newBench;
                updatedState.homeSubsMade++;
            } else {
                updatedState.awayLineup = newLineup;
                updatedState.awayBench = newBench;
                updatedState.awaySubsMade++;
            }
            
            if (wasBallCarrier) {
                const opposition = isHome ? updatedState.awayLineup : updatedState.homeLineup;
                const newCarrier = opposition.find(p => p.role === 'Central Defender' && !p.isSentOff) || opposition.find(p => !p.isSentOff);
                if(newCarrier) {
                    updatedState.ballCarrierId = newCarrier.id;
                    updatedState.attackingTeamId = isHome ? updatedState.awayTeamId : updatedState.homeTeamId;
                }
            }

            if (updatedState.forcedSubstitution && updatedState.forcedSubstitution.playerOutId === action.payload.playerOutId) {
                updatedState.forcedSubstitution = null;
            }

            return { ...state, liveMatch: updatedState };
        }
        case 'DISMISS_FORCED_SUBSTITUTION': {
            if (!state.liveMatch || !state.liveMatch.forcedSubstitution) return state;
        
            const liveMatch = JSON.parse(JSON.stringify(state.liveMatch)); // Deep copy to avoid mutation
            const { playerOutId, reason } = liveMatch.forcedSubstitution;
            liveMatch.forcedSubstitution = null;
            liveMatch.isPaused = false;
        
            if (reason === 'injury') {
                const isHome = liveMatch.homeTeamId === state.playerClubId;
                const lineup = isHome ? liveMatch.homeLineup : liveMatch.awayLineup;
                const playerIndex = lineup.findIndex((p: LivePlayer) => p.id === playerOutId);
                
                if (playerIndex > -1) {
                    // This player is now considered injured for the rest of the match
                    // but remains on the pitch visually if no sub is made.
                    // The injury itself is processed post-match.
                    lineup[playerIndex].isInjured = true; 
                }
            }
            return { ...state, liveMatch };
        }
        case 'CHANGE_LIVE_TACTICS': {
             if (!state.liveMatch) return state;
             const isHome = state.liveMatch.homeTeamId === state.playerClubId;
             if (!isHome) return state; 

             const { mentality } = action.payload;
             const newLog = [...state.liveMatch.log, { minute: state.liveMatch.minute, type: 'Info' as const, text: `${state.liveMatch.homeTeamName} switch to an ${mentality} mentality.`}];
             return { ...state, liveMatch: { ...state.liveMatch, homeMentality: mentality, log: newLog }};
        }
        case 'UPDATE_TEAM_INSTRUCTIONS': {
            if (!state.liveMatch || !state.playerClubId) return state;

            // Use a deep copy to prevent state mutation bugs
            const newLiveMatch = JSON.parse(JSON.stringify(state.liveMatch));
            const isHome = newLiveMatch.homeTeamId === state.playerClubId;
            const lineup = isHome ? newLiveMatch.homeLineup : newLiveMatch.awayLineup;
            const teamName = isHome ? newLiveMatch.homeTeamName : newLiveMatch.awayTeamName;

            let shoutText = '';

            switch(action.payload.shout) {
                case 'press_more':
                    shoutText = 'Press More Urgently!';
                    lineup.forEach((p: LivePlayer) => {
                        const cat = getRoleCategory(p.role);
                        if(cat === 'FWD' || cat === 'MID') p.instructions.pressing = PressingInstruction.Urgent;
                        else p.instructions.pressing = PressingInstruction.Normal;
                    });
                    break;
                case 'hold_position':
                    shoutText = 'Hold Position!';
                    lineup.forEach((p: LivePlayer) => {
                        p.instructions.positioning = PositioningInstruction.HoldPosition;
                        p.instructions.pressing = PressingInstruction.DropOff;
                    });
                    break;
                case 'attack_flanks':
                    shoutText = 'Attack the Flanks!';
                    lineup.forEach((p: LivePlayer) => {
                        if (p.role.includes('Wing') || p.role.includes('Wide') || p.role.includes('Full-Back')) {
                            p.instructions.dribbling = DribblingInstruction.DribbleMore;
                            p.instructions.crossing = CrossingInstruction.CrossMore;
                            p.instructions.positioning = PositioningInstruction.GetForward;
                        }
                    });
                    break;
                case 'short_passes':
                    shoutText = 'Play Shorter Passes!';
                    lineup.forEach((p: LivePlayer) => p.instructions.passing = PassingInstruction.Shorter);
                    break;
                case 'go_direct':
                    shoutText = 'Go More Direct!';
                    lineup.forEach((p: LivePlayer) => p.instructions.passing = PassingInstruction.Risky);
                    break;
            }
            
            newLiveMatch.log.push({ minute: newLiveMatch.minute, type: 'Info', text: `${teamName} shout: "${shoutText}"`});
            return { ...state, liveMatch: newLiveMatch };
        }
        case 'UPDATE_LIVE_PLAYER_POSITION': {
            if (!state.liveMatch) return state;

            // BUG FIX: Use a deep copy to prevent accidental state mutation which can reset the game.
            const newLiveMatch = JSON.parse(JSON.stringify(state.liveMatch));
            const isHome = newLiveMatch.homeTeamId === state.playerClubId;
            const lineup = isHome ? newLiveMatch.homeLineup : newLiveMatch.awayLineup;

            const playerIndex = lineup.findIndex((p: LivePlayer) => p.id === action.payload.playerId);
            if (playerIndex === -1) return state;

            lineup[playerIndex].currentPosition = action.payload.position;
            lineup[playerIndex].role = action.payload.role;

            return { ...state, liveMatch: newLiveMatch };
        }
        case 'UPDATE_LIVE_PLAYER_INSTRUCTIONS': {
            if (!state.liveMatch) return state;

            // BUG FIX: Use a deep copy to prevent accidental state mutation which can reset the game.
            const newLiveMatch = JSON.parse(JSON.stringify(state.liveMatch));
            const isHome = newLiveMatch.homeTeamId === state.playerClubId;
            const lineup = isHome ? newLiveMatch.homeLineup : newLiveMatch.awayLineup;
        
            const playerIndex = lineup.findIndex((p: LivePlayer) => p.id === action.payload.playerId);
            if (playerIndex === -1) return state;
        
            lineup[playerIndex].instructions = action.payload.instructions;
        
            return { ...state, liveMatch: newLiveMatch };
        }
        case 'END_MATCH': {
            if (!state.liveMatch) return state;
            const finalMatchState = state.liveMatch;

            const totalPossessionMinutes = finalMatchState.homePossessionMinutes + finalMatchState.awayPossessionMinutes;
            const homePossession = totalPossessionMinutes > 0 ? Math.round((finalMatchState.homePossessionMinutes / totalPossessionMinutes) * 100) : 50;
            const awayPossession = totalPossessionMinutes > 0 ? 100 - homePossession : 50;

            const collectedPlayerStats: Record<number, PlayerMatchStats> = {};
            [...finalMatchState.homeLineup, ...finalMatchState.awayLineup, ...finalMatchState.homeBench, ...finalMatchState.awayBench].forEach(p => {
                if (p) collectedPlayerStats[p.id] = p.stats;
            });

            const matchDate = state.schedule.find(m => m.id === finalMatchState.matchId)!.date;

            const finalResult: Match = {
                id: finalMatchState.matchId,
                homeTeamId: finalMatchState.homeTeamId,
                awayTeamId: finalMatchState.awayTeamId,
                date: new Date(matchDate),
                homeScore: finalMatchState.homeScore,
                awayScore: finalMatchState.awayScore,
                homeStats: { ...finalMatchState.homeStats, possession: homePossession },
                awayStats: { ...finalMatchState.awayStats, possession: awayPossession },
                log: finalMatchState.log,
                playerStats: collectedPlayerStats,
                homeLineup: finalMatchState.initialHomeLineup,
                awayLineup: finalMatchState.initialAwayLineup,
                disciplinaryEvents: [],
                injuryEvents: [],
            };
            
            let clonedPlayers: Record<number, Player> = JSON.parse(JSON.stringify(state.players));
            let updatedPlayers = rehydratePlayers(clonedPlayers);
            const allPlayersInMatchLive = [...finalMatchState.homeLineup, ...finalMatchState.awayLineup, ...finalMatchState.homeBench, ...finalMatchState.awayBench].filter(Boolean) as LivePlayer[];

            let tempState = { ...state };
            
            // --- NEW: Update confidence on heavy loss ---
            const isPlayerHome = finalResult.homeTeamId === tempState.playerClubId!;
            const scoreDiff = isPlayerHome ? finalResult.homeScore! - finalResult.awayScore! : finalResult.awayScore! - finalResult.homeScore!;
            if (scoreDiff < -2) { // Lost by 3 or more goals
                const playerClub = { ...tempState.clubs[tempState.playerClubId!] };
                playerClub.managerConfidence = Math.max(0, playerClub.managerConfidence - 5);
                tempState.clubs = { ...tempState.clubs, [tempState.playerClubId!]: playerClub };
            }
            // --- END NEW ---

            for (const livePlayer of allPlayersInMatchLive) {
                const playerToUpdate = updatedPlayers[livePlayer.id];
                if (!playerToUpdate) continue;

                const isHome = playerToUpdate.clubId === finalMatchState.homeTeamId;
                const scoreDiff = finalMatchState.homeScore - finalMatchState.awayScore;
                playerToUpdate.morale = Math.max(0, Math.min(100, playerToUpdate.morale + ((isHome && scoreDiff > 0) || (!isHome && scoreDiff < 0) ? 5 : scoreDiff === 0 ? 0 : -5)));
                
                const played = finalMatchState.homeLineup.some(p => p.id === livePlayer.id) || finalMatchState.awayLineup.some(p => p.id === livePlayer.id);
                if (played) playerToUpdate.matchFitness = Math.min(100, playerToUpdate.matchFitness + 5);

                if (livePlayer.isSentOff) {
                    const returnDate = new Date(finalResult.date); returnDate.setDate(returnDate.getDate() + 8);
                    playerToUpdate.suspension = { returnDate };
                    finalResult.disciplinaryEvents?.push({ playerId: livePlayer.id, type: 'red' });
                    if (playerToUpdate.clubId === state.playerClubId) {
                        tempState = addNewsItem(tempState, `Player Suspended: ${playerToUpdate.name}`, `${playerToUpdate.name} received a red card and will be suspended for the next match.`, 'suspension_report_player', playerToUpdate.id);
                    }
                }
               
                if (livePlayer.yellowCardCount > 0) {
                     for (let i = 0; i < livePlayer.yellowCardCount; i++) {
                        finalResult.disciplinaryEvents?.push({ playerId: livePlayer.id, type: 'yellow' });
                    }
                    playerToUpdate.seasonYellowCards = (playerToUpdate.seasonYellowCards || 0) + livePlayer.yellowCardCount;
                    if (playerToUpdate.seasonYellowCards >= 3) { // Suspension threshold
                        const returnDate = new Date(finalResult.date);
                        returnDate.setDate(returnDate.getDate() + 8);
                        playerToUpdate.suspension = { returnDate };
                        playerToUpdate.seasonYellowCards = 0; // Reset after suspension
                        if (playerToUpdate.clubId === state.playerClubId) {
                            tempState = addNewsItem(tempState, `Player Suspended: ${playerToUpdate.name}`, `${playerToUpdate.name} has accumulated 3 yellow cards and will be suspended for the next match.`, 'suspension_report_player', playerToUpdate.id);
                        }
                    }
                }
            }
            
            // --- NEW RELIABLE INJURY PROCESSING ---
            for (const injuredPlayerId of finalMatchState.injuredPlayerIds) {
                const playerToUpdate = updatedPlayers[injuredPlayerId];
                if (!playerToUpdate) continue;

                const injuryDetails = generateInjury(finalResult.date, playerToUpdate);
                
                // Apply medical department effect
                const club = tempState.clubs[playerToUpdate.clubId];
                const medicalChiefId = club.departments[DepartmentType.Medical].chiefId;
                const medicalChief = medicalChiefId ? tempState.staff[medicalChiefId] as Staff & { attributes: HeadOfPhysiotherapyAttributes } : null;
                const medicalLevel = club.departments[DepartmentType.Medical].level;
                
                const chiefSkill = medicalChief ? medicalChief.attributes.physiotherapy : 50;
                const levelBonus = (medicalLevel - 1) * 5; // Up to 20% bonus from level
                const totalMedicalSkill = chiefSkill + levelBonus;

                const durationModifier = 1 - (totalMedicalSkill / 400); // 120 skill = 30% reduction
                const originalDuration = injuryDetails.returnDate.getTime() - finalResult.date.getTime();
                const newDuration = originalDuration * durationModifier;
                const newReturnDate = new Date(finalResult.date.getTime() + newDuration);

                playerToUpdate.injury = { type: injuryDetails.type, returnDate: newReturnDate };
                finalResult.injuryEvents?.push({ playerId: injuredPlayerId, type: injuryDetails.type, returnDate: newReturnDate });
                
                if (playerToUpdate.clubId === state.playerClubId) {
                    const diffDays = Math.ceil(newDuration / (1000 * 60 * 60 * 24));
                    const durationText = diffDays > 10 ? `approx. ${Math.round(diffDays/7)} weeks` : `approx. ${diffDays} days`;
                    const opponentName = playerToUpdate.clubId === finalResult.homeTeamId ? state.clubs[finalResult.awayTeamId].name : state.clubs[finalResult.homeTeamId].name;
                    tempState = addNewsItem(tempState, `Player Injured: ${playerToUpdate.name}`, `${playerToUpdate.name} picked up an injury in the match against ${opponentName}.\n\nHe is expected to be out for ${durationText}.\nDiagnosis: ${injuryDetails.type}.`, 'injury_report_player', playerToUpdate.id);
                }
            }
            // --- END NEW INJURY PROCESSING ---

            const scheduleIndex = state.schedule.findIndex(m => m.id === finalMatchState.matchId);
            const newSchedule = [...state.schedule];
            if (scheduleIndex !== -1) newSchedule[scheduleIndex] = finalResult;
            
            const newLeagueTable = updateLeagueTableForMatch(state.leagueTable, finalResult);
            newLeagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
            
            const aiResultsToday = state.schedule.filter(m => new Date(m.date).toDateString() === new Date(finalResult.date).toDateString() && m.id !== finalResult.id && m.homeScore !== undefined);

            const season = getSeason(finalResult.date);
            const statsUpdatedPlayers = updatePlayerStatsFromMatchResult(updatedPlayers, finalResult, season, finalMatchState);

            return { 
                ...tempState, 
                liveMatch: null, 
                schedule: newSchedule, 
                leagueTable: newLeagueTable,
                players: statsUpdatedPlayers,
                matchDayResults: { playerResult: finalResult, aiResults: aiResultsToday }
            };
        }
        default:
            return state;
    }
};

const updateLeagueTableForMatch = (currentTable: GameState['leagueTable'], result: Match): GameState['leagueTable'] => {
    const newTable = JSON.parse(JSON.stringify(currentTable)); // Deep copy
    const homeEntry = newTable.find((e: any) => e.clubId === result.homeTeamId);
    const awayEntry = newTable.find((e: any) => e.clubId === result.awayTeamId);

    if (homeEntry && awayEntry && result.homeScore !== undefined && result.awayScore !== undefined) {
        homeEntry.played++;
        awayEntry.played++;
        homeEntry.goalsFor += result.homeScore;
        homeEntry.goalsAgainst += result.awayScore;
        awayEntry.goalsFor += result.awayScore;
        awayEntry.goalsAgainst += result.homeScore;

        if (result.homeScore > result.awayScore) {
            homeEntry.wins++; homeEntry.points += 3; awayEntry.losses++;
        } else if (result.homeScore < result.awayScore) {
            awayEntry.wins++; awayEntry.points += 3; homeEntry.losses++;
        } else {
            homeEntry.draws++; awayEntry.draws++; homeEntry.points += 1; awayEntry.points += 1;
        }
        homeEntry.goalDifference = homeEntry.goalsFor - homeEntry.goalsAgainst;
        awayEntry.goalDifference = awayEntry.goalsFor - awayEntry.goalsAgainst;
    }
    return newTable;
};