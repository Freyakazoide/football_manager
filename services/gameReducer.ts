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

const addNewsItem = (state: GameState, headline: string, content: string, type: NewsItem['type'], relatedEntityId?: number): GameState => {
    const newNewsItem: NewsItem = {
        id: state.nextNewsId,
        date: new Date(state.currentDate),
        headline,
        content,
        type,
        relatedEntityId,
        isRead: false,
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

            const matchesToday = newState.schedule.filter(m =>
                m.date.toDateString() === newDate.toDateString() && m.homeScore === undefined
            );

            // Monthly/Yearly processing if no matches
            if (matchesToday.length === 0) {
                 if (newDate.getDate() === 1) {
                    newState.players = processPlayerDevelopment(newState.players);
                    newState.clubs = processWages(newState.clubs, newState.players);
                    if (newDate.getMonth() === 0) { // January 1st
                        const { players } = processPlayerAging(newState.players);
                        newState.players = players;
                    }
                }
                return newState;
            }
            
            // --- REFACTORED LOGIC ---

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
            
            // --- STEP 1: SIMULATE ALL AI MATCHES FIRST ---
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
                }
                newState.leagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
                
                // --- STEP 2: GENERATE NEWS FOR AI MATCHES ---
                const content = roundResults.map(r => `${newState.clubs[r.homeTeamId].name} ${r.homeScore} - ${r.awayScore} ${newState.clubs[r.awayTeamId].name}`).join('\n');
                newState = addNewsItem(newState, "League Round-up", `Here are the results from around the league:\n\n${content}`, 'round_summary');
            }

            // --- STEP 3: HALT FOR PLAYER MATCH ---
            if (playerMatchToday) {
                newState.matchDayFixtures = {
                    playerMatch: {
                        match: playerMatchToday,
                        homeTeam: newState.clubs[playerMatchToday.homeTeamId],
                        awayTeam: newState.clubs[playerMatchToday.awayTeamId],
                    },
                    aiMatches: aiMatches,
                }
                return newState; // Stop and wait for player
            }

            // --- STEP 4: (If no player match today) Continue to next checks ---
            if (newDate.getDate() === 1) {
                newState.players = processPlayerDevelopment(newState.players);
                newState.clubs = processWages(newState.clubs, newState.players);
                if (newDate.getMonth() === 0) { // January 1st
                    const { players } = processPlayerAging(newState.players);
                    newState.players = players;
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
            
            // Generate player match news
            const { headline, content } = generateNarrativeReport(state.matchDayResults.playerResult, state.playerClubId, state.clubs);
            newState = addNewsItem(newState, headline, content, 'match_summary_player', state.matchDayResults.playerResult.id);

            // News for AI matches was already generated in ADVANCE_DAY, so no need to do it here.

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
            const opponentPlayers = Object.values(state.players).filter(p => p.clubId === opponent.id);
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

            // Create the new player for the lineup, inheriting tactical info from the player coming off
            const newPlayerIn: LivePlayer = {
                ...playerInFromBench,
                role: playerOut.role,
                instructions: { ...playerOut.instructions },
                currentPosition: { ...playerOut.currentPosition },
                stats: { ...playerInFromBench.stats } // Ensure stats are fresh
            };

            const newLineup = [...lineup];
            newLineup[playerOutIndex] = newPlayerIn;
            
            const newBench = [...bench];
            newBench.splice(playerInFromBenchIndex, 1);

            const teamName = isHome ? liveMatch.homeTeamName : liveMatch.awayTeamName;
            const newLog = [...liveMatch.log, { minute: liveMatch.minute, type: 'Sub' as const, text: `Substitution for ${teamName}: ${newPlayerIn.name} comes on for ${playerOut.name}.`}];
            
            const updatedState = { ...liveMatch, log: newLog };
            if (isHome) {
                updatedState.homeLineup = newLineup;
                updatedState.homeBench = newBench;
                updatedState.homeSubsMade++;
            } else {
                updatedState.awayLineup = newLineup;
                updatedState.awayBench = newBench;
                updatedState.awaySubsMade++;
            }
            
            // If the player with the ball was subbed, a defender gets the ball.
            if (wasBallCarrier) {
                const opposition = isHome ? updatedState.awayLineup : updatedState.homeLineup;
                const newCarrier = opposition.find(p => p.role === 'CB' && !p.isSentOff) || opposition.find(p => !p.isSentOff);
                if(newCarrier) {
                    updatedState.ballCarrierId = newCarrier.id;
                    updatedState.attackingTeamId = isHome ? updatedState.awayTeamId : updatedState.homeTeamId;
                }
            }


            return { ...state, liveMatch: updatedState };
        }
        case 'CHANGE_LIVE_TACTICS': {
             if (!state.liveMatch) return state;
             const isHome = state.liveMatch.homeTeamId === state.playerClubId;
             if (!isHome) return state; // For now, only player can change tactics

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

            const allPlayersInMatch = [...finalMatchState.homeLineup, ...finalMatchState.awayLineup, ...finalMatchState.homeBench, ...finalMatchState.awayBench];
            const collectedPlayerStats: Record<number, PlayerMatchStats> = {};
            allPlayersInMatch.forEach(p => {
                if (p) { // Bench players can be null if squad is not full
                    collectedPlayerStats[p.id] = p.stats;
                }
            });

            const finalResult: Match = {
                id: finalMatchState.matchId,
                homeTeamId: finalMatchState.homeTeamId,
                awayTeamId: finalMatchState.awayTeamId,
                date: state.schedule.find(m => m.id === finalMatchState.matchId)!.date,
                homeScore: finalMatchState.homeScore,
                awayScore: finalMatchState.awayScore,
                homeStats: { ...finalMatchState.homeStats, possession: homePossession },
                awayStats: { ...finalMatchState.awayStats, possession: awayPossession },
                log: finalMatchState.log,
                playerStats: collectedPlayerStats,
            };
            
            const scheduleIndex = state.schedule.findIndex(m => m.id === finalMatchState.matchId);
            const newSchedule = [...state.schedule];
            if (scheduleIndex !== -1) {
                newSchedule[scheduleIndex] = finalResult;
            }
            const newLeagueTable = updateLeagueTableForMatch(state.leagueTable, finalResult);
            newLeagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
            
            const aiResultsToday = state.schedule.filter(m => m.date.toDateString() === finalResult.date.toDateString() && m.id !== finalResult.id && m.homeScore !== undefined);

            const newState = { 
                ...state, 
                liveMatch: null, 
                schedule: newSchedule, 
                leagueTable: newLeagueTable,
                matchDayResults: {
                    playerResult: finalResult,
                    aiResults: aiResultsToday,
                }
            };

            const season = getSeason(finalResult.date);
            newState.players = updatePlayerStatsFromMatchResult(newState.players, finalResult, season, finalMatchState);
            
            return newState;
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