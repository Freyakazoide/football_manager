import { GameState, LivePlayer, Player, Club, Match, NewsItem, MatchDayInfo, PlayerMatchStats } from '../types';
import { Action } from './reducerTypes';
import { runMatch, processPlayerDevelopment, processPlayerAging, processWages, recalculateMarketValue } from './simulationService';
import { createLiveMatchState } from './matchEngine';
import { generateNarrativeReport } from './newsGenerator';
import { generateAITactics } from './aiTacticsService';
import { updatePlayerStatsFromMatchResult, getSeason } from './playerStatsService';

export const initialState: GameState = {
    currentDate: new Date(2024, 7, 1), // July 1st, 2024
    playerClubId: null,
    clubs: {},
    players: {},
    schedule: [],
    leagueTable: [],
    transferResult: null,
    liveMatch: null,
    news: [],
    nextNewsId: 1,
    matchDayFixtures: null,
    matchDayResults: null,
};

const rehydratePlayers = (players: Record<number, Player>): Record<number, Player> => {
    for (const pId in players) {
        const player = players[pId];
        if (player.contractExpires) player.contractExpires = new Date(player.contractExpires);
        if (player.injury?.returnDate) player.injury.returnDate = new Date(player.injury.returnDate);
        if (player.suspension?.returnDate) player.suspension.returnDate = new Date(player.suspension.returnDate);
    }
    return players;
}

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

export const gameReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'INITIALIZE_GAME': {
            return {
                ...initialState,
                ...action.payload,
            };
        }
        case 'SELECT_PLAYER_CLUB': {
            return {
                ...state,
                playerClubId: action.payload,
            };
        }
        case 'ADVANCE_DAY': {
            if (state.liveMatch) return state; // Can't advance day during a match

            const newDate = new Date(state.currentDate);
            newDate.setDate(newDate.getDate() + 1);

            let newState = { ...state, currentDate: newDate, transferResult: null };

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
                
                if (hasChanged) playerDidChange = true;
            }
            if(playerDidChange) newState.players = updatedPlayers;

            const matchesToday = newState.schedule.filter(m =>
                m.date.toDateString() === newDate.toDateString() && m.homeScore === undefined
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
                    newState.players = processPlayerDevelopment(newState.players);
                    newState.clubs = processWages(newState.clubs, newState.players);
                    if (newDate.getMonth() === 0) { // New year
                        const { players } = processPlayerAging(newState.players);
                        newState.players = players;
                    } else if (newDate.getMonth() === 6 && newDate.getDate() === 1) { // New season
                        Object.values(newState.players).forEach(p => p.seasonYellowCards = 0);
                    }
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
                                player.injury = { type: 'Match Injury', returnDate: new Date(injury.returnDate) };
                                if (player.clubId === playerClubId) {
                                    const diffTime = Math.abs(injury.returnDate.getTime() - result.date.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    const durationText = diffDays > 10 ? `approx. ${Math.round(diffDays/7)} weeks` : `approx. ${diffDays} days`;
                                    newState = addNewsItem(newState, `Player Injured: ${player.name}`, `${player.name} picked up an injury in the match against ${player.clubId === result.homeTeamId ? newState.clubs[result.awayTeamId].name : newState.clubs[result.homeTeamId].name}.\n\nHe is expected to be out for ${durationText}.`, 'injury_report_player', player.id);
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
                newState.players = processPlayerDevelopment(newState.players);
                newState.clubs = processWages(newState.clubs, newState.players);
                if (newDate.getMonth() === 0) { // New year
                    const { players } = processPlayerAging(newState.players);
                    newState.players = players;
                } else if (newDate.getMonth() === 6 && newDate.getDate() === 1) { // New season
                    Object.values(newState.players).forEach(p => p.seasonYellowCards = 0);
                }
            }

            return newState;
        }
        case 'CLEAR_MATCH_DAY_FIXTURES': {
            return { ...state, matchDayFixtures: null };
        }
        case 'CLEAR_MATCH_RESULTS': {
            if (!state.matchDayResults) return state;

            let newState = { ...state };
            
            const { headline, content, matchStatsSummary } = generateNarrativeReport(state.matchDayResults.playerResult, state.playerClubId, state.clubs, state.players);
            newState = addNewsItem(newState, headline, content, 'match_summary_player', state.matchDayResults.playerResult.id, matchStatsSummary);

            return { ...newState, matchDayResults: null };
        }
        case 'UPDATE_TACTICS': {
             if (!state.playerClubId) return state;
             const newClubs = { ...state.clubs };
             newClubs[state.playerClubId].tactics = action.payload;
             return { ...state, clubs: newClubs };
        }
        case 'MAKE_TRANSFER_OFFER': {
            const { player, offerAmount } = action.payload;
            const buyerClub = state.clubs[state.playerClubId!];
            if (buyerClub.balance < offerAmount) {
                return { ...state, transferResult: { success: false, message: "You don't have enough funds for this offer." } };
            }
            const acceptanceChance = Math.min(0.95, (offerAmount / player.marketValue) * 0.7);
            if (Math.random() < acceptanceChance) {
                const sellerClub = { ...state.clubs[player.clubId] };
                const updatedBuyerClub = { ...buyerClub };
                updatedBuyerClub.balance -= offerAmount;
                sellerClub.balance += offerAmount;
                const updatedPlayer = { ...state.players[player.id] };
                updatedPlayer.clubId = buyerClub.id;
                updatedPlayer.wage = Math.round(updatedPlayer.wage * 1.1);
                const newContractYears = updatedPlayer.age < 28 ? 4 : 2;
                updatedPlayer.contractExpires = new Date(state.currentDate.getFullYear() + newContractYears, state.currentDate.getMonth(), state.currentDate.getDate());
                updatedPlayer.marketValue = recalculateMarketValue(updatedPlayer);
                const newPlayers = { ...state.players, [player.id]: updatedPlayer };
                const newClubs = { ...state.clubs, [buyerClub.id]: updatedBuyerClub, [sellerClub.id]: sellerClub };

                let newState = { ...state, players: newPlayers, clubs: newClubs, transferResult: { success: true, message: `${player.name} has signed for your club!` } };
                const headline = `Transfer Confirmed: ${player.name} joins ${buyerClub.name}`;
                const content = `${player.name} has completed a move from ${sellerClub.name} to ${buyerClub.name} for a fee of ${offerAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}.`;
                newState = addNewsItem(newState, headline, content, 'transfer_completed', player.id);

                return newState;
            } else {
                return { ...state, transferResult: { success: false, message: `${state.clubs[player.clubId].name} rejected your offer for ${player.name}.` } };
            }
        }
        case 'CLEAR_TRANSFER_RESULT': {
            return { ...state, transferResult: null };
        }
        case 'MARK_NEWS_AS_READ': {
            const newNews = state.news.map(item => 
                item.id === action.payload.newsItemId ? { ...item, isRead: true } : item
            );
            return { ...state, news: newNews };
        }
        // Match Engine Reducers
        case 'START_MATCH': {
            const { homeTeam, awayTeam } = action.payload;
            const playerClubId = state.playerClubId;
            let tempClubs = { ...state.clubs };

            // If AI is playing, generate dynamic tactics for them
            const opponent = homeTeam.id === playerClubId ? awayTeam : homeTeam;
            const opponentPlayers = Object.values(state.players).filter(p => p.clubId === opponent.id && !p.injury && !p.suspension);
            const newAITactics = generateAITactics(opponentPlayers);
            
            tempClubs[opponent.id] = { ...tempClubs[opponent.id], tactics: newAITactics };

            const liveMatch = createLiveMatchState(action.payload, tempClubs, state.players);
            return { ...state, clubs: tempClubs, matchDayFixtures: null, liveMatch };
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
            const newLog = [...liveMatch.log, { minute: liveMatch.minute, type: 'Sub' as const, text: `Substitution for ${teamName}: ${newPlayerIn.name} comes on for ${playerOut.name}.`}];
            
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
                // FIX: 'CB' is not a valid PlayerRole. Changed to 'Central Defender'.
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
            
            const liveMatch = { ...state.liveMatch, forcedSubstitution: null };
            const { playerOutId, reason } = state.liveMatch.forcedSubstitution;

            if (reason === 'injury') {
                 const isHome = liveMatch.homeTeamId === state.playerClubId;
                 let lineup = isHome ? liveMatch.homeLineup : liveMatch.awayLineup;
                 const playerIndex = lineup.findIndex(p => p.id === playerOutId);
                 if (playerIndex > -1) {
                     lineup[playerIndex].isInjured = true;
                 }
            }
            return { ...state, liveMatch: { ...liveMatch, isPaused: false } };
        }
        case 'CHANGE_LIVE_TACTICS': {
             if (!state.liveMatch) return state;
             const isHome = state.liveMatch.homeTeamId === state.playerClubId;
             if (!isHome) return state; 

             const { mentality } = action.payload;
             const newLog = [...state.liveMatch.log, { minute: state.liveMatch.minute, type: 'Info' as const, text: `${state.liveMatch.homeTeamName} switch to an ${mentality} mentality.`}];
             return { ...state, liveMatch: { ...state.liveMatch, homeMentality: mentality, log: newLog }};
        }
        case 'UPDATE_LIVE_PLAYER_POSITION': {
            if (!state.liveMatch) return state;
            const isHome = state.liveMatch.homeTeamId === state.playerClubId;
            const lineup = isHome ? [...state.liveMatch.homeLineup] : [...state.liveMatch.awayLineup];

            const playerIndex = lineup.findIndex(p => p.id === action.payload.playerId);
            if (playerIndex === -1) return state;

            lineup[playerIndex].currentPosition = action.payload.position;
            lineup[playerIndex].role = action.payload.role;

            const updatedLiveMatch = { ...state.liveMatch };
            if (isHome) {
                updatedLiveMatch.homeLineup = lineup;
            } else {
                updatedLiveMatch.awayLineup = lineup;
            }
            return { ...state, liveMatch: updatedLiveMatch };
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
                date: matchDate,
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
                if (livePlayer.isInjured) {
                    const returnDate = new Date(finalResult.date); returnDate.setDate(returnDate.getDate() + (Math.floor(Math.random() * 21) + 7));
                    playerToUpdate.injury = { type: 'Match Injury', returnDate };
                    finalResult.injuryEvents?.push({ playerId: livePlayer.id, returnDate });
                    if (playerToUpdate.clubId === state.playerClubId) {
                        const diffTime = Math.abs(returnDate.getTime() - finalResult.date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const durationText = diffDays > 10 ? `approx. ${Math.round(diffDays/7)} weeks` : `approx. ${diffDays} days`;
                        tempState = addNewsItem(tempState, `Player Injured: ${playerToUpdate.name}`, `${playerToUpdate.name} picked up an injury in the match against ${playerToUpdate.clubId === finalResult.homeTeamId ? state.clubs[finalResult.awayTeamId].name : state.clubs[finalResult.homeTeamId].name}.\n\nHe is expected to be out for ${durationText}.`, 'injury_report_player', playerToUpdate.id);
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

            const scheduleIndex = state.schedule.findIndex(m => m.id === finalMatchState.matchId);
            const newSchedule = [...state.schedule];
            if (scheduleIndex !== -1) newSchedule[scheduleIndex] = finalResult;
            
            const newLeagueTable = updateLeagueTableForMatch(state.leagueTable, finalResult);
            newLeagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
            
            const aiResultsToday = state.schedule.filter(m => m.date.toDateString() === finalResult.date.toDateString() && m.id !== finalResult.id && m.homeScore !== undefined);

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