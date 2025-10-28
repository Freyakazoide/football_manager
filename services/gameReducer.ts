// FIX: Import the `Match` type to resolve type errors.
import { GameState, LivePlayer, Player, Club, Match, NewsItem } from '../types';
import { Action } from './reducerTypes';
import { runMatch, processPlayerDevelopment, processPlayerAging, processWages, recalculateMarketValue } from './simulationService';
import { createLiveMatchState } from './matchEngine';

export const initialState: GameState = {
    currentDate: new Date(2024, 7, 1), // July 1st, 2024
    playerClubId: null,
    clubs: {},
    players: {},
    schedule: [],
    leagueTable: [],
    playerMatch: null,
    transferResult: null,
    liveMatch: null,
    news: [],
    nextNewsId: 1,
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

            let newState = { ...state, currentDate: newDate, playerMatch: null, transferResult: null };

            const matchesToday = newState.schedule.filter(m =>
                m.date.toDateString() === newDate.toDateString() && m.homeScore === undefined
            );
            
            const roundResults: Match[] = [];

            for (const match of matchesToday) {
                if (match.homeTeamId === newState.playerClubId || match.awayTeamId === newState.playerClubId) {
                    newState.playerMatch = {
                        match,
                        homeTeam: newState.clubs[match.homeTeamId],
                        awayTeam: newState.clubs[match.awayTeamId],
                    };
                     // Generate news for previous day's results before stopping for player match
                    const yesterdayResults = state.schedule.filter(m => m.date.toDateString() === state.currentDate.toDateString() && m.homeScore !== undefined);
                    const nonPlayerResults = yesterdayResults.filter(m => m.homeTeamId !== state.playerClubId && m.awayTeamId !== state.playerClubId);
                    if(nonPlayerResults.length > 0) {
                        const content = nonPlayerResults.map(r => `${state.clubs[r.homeTeamId].name} ${r.homeScore} - ${r.awayScore} ${state.clubs[r.awayTeamId].name}`).join('\n');
                        newState = addNewsItem(newState, "League Round-up", `Here are the results from around the league:\n\n${content}`, 'round_summary');
                    }
                    return newState; // Stop advancing for player's match
                } else {
                    // Simulate non-player matches instantly
                    const result = runMatch(match, newState.clubs, newState.players);
                    roundResults.push(result);
                    const matchIndex = newState.schedule.findIndex(m => m.id === result.id);
                    if (matchIndex !== -1) newState.schedule[matchIndex] = result;
                    // Update table (logic moved inside a function for tidiness)
                    newState.leagueTable = updateLeagueTableForMatch(newState.leagueTable, result);
                }
            }
            
            if(roundResults.length > 0) {
                 const content = roundResults.map(r => `${newState.clubs[r.homeTeamId].name} ${r.homeScore} - ${r.awayScore} ${newState.clubs[r.awayTeamId].name}`).join('\n');
                 newState = addNewsItem(newState, "League Round-up", `Here are the results from around the league:\n\n${content}`, 'round_summary');
            }

            newState.leagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

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
        case 'CLEAR_PLAYER_MATCH': {
            return { ...state, playerMatch: null };
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
        // New Match Engine Reducers
        case 'START_MATCH': {
            const liveMatch = createLiveMatchState(action.payload, state.clubs, state.players);
            return { ...state, playerMatch: null, liveMatch };
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
            const playerInIndex = bench.findIndex(p => p.id === action.payload.playerInId);

            if (playerOutIndex === -1 || playerInIndex === -1) return state;

            const playerOut = lineup[playerOutIndex];
            const playerIn = bench[playerInIndex];

            const newLineup = [...lineup];
            newLineup[playerOutIndex] = playerIn;
            
            const newBench = [...bench];
            newBench.splice(playerInIndex, 1);

            const teamName = isHome ? liveMatch.homeTeamName : liveMatch.awayTeamName;
            const newLog = [...liveMatch.log, { minute: liveMatch.minute, type: 'Sub' as const, text: `Substitution for ${teamName}: ${playerIn.name} comes on for ${playerOut.name}.`}];
            
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
        case 'END_MATCH': {
            if (!state.liveMatch) return state;
            const finalMatchState = state.liveMatch;
            const finalResult: Match = {
                id: finalMatchState.matchId,
                homeTeamId: finalMatchState.homeTeamId,
                awayTeamId: finalMatchState.awayTeamId,
                date: state.schedule.find(m => m.id === finalMatchState.matchId)!.date,
                homeScore: finalMatchState.homeScore,
                awayScore: finalMatchState.awayScore,
            };
            const scheduleIndex = state.schedule.findIndex(m => m.id === finalMatchState.matchId);
            const newSchedule = [...state.schedule];
            if (scheduleIndex !== -1) {
                newSchedule[scheduleIndex] = finalResult;
            }
            const newLeagueTable = updateLeagueTableForMatch(state.leagueTable, finalResult);
            newLeagueTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

            let newState = { ...state, liveMatch: null, schedule: newSchedule, leagueTable: newLeagueTable };

            const playerTeamName = finalMatchState.homeTeamId === state.playerClubId ? finalMatchState.homeTeamName : finalMatchState.awayTeamName;
            const opponentTeamName = finalMatchState.homeTeamId === state.playerClubId ? finalMatchState.awayTeamName : finalMatchState.homeTeamName;
            const headline = `Match Report: ${finalMatchState.homeTeamName} ${finalMatchState.homeScore} - ${finalMatchState.awayScore} ${finalMatchState.awayTeamName}`;
            const content = `A hard-fought match saw ${playerTeamName} face ${opponentTeamName}, with the final scoreline settling at ${finalMatchState.homeScore} - ${finalMatchState.awayScore}.`;
            newState = addNewsItem(newState, headline, content, 'match_summary_player', finalMatchState.matchId);

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