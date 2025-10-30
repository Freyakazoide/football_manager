import { Player, Match, LiveMatchState, PlayerSeasonStats } from '../types';

export const getSeason = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    // Season runs from July (month 6) to June
    if (month >= 6) {
        return `${year}/${year + 1}`;
    } else {
        return `${year - 1}/${year}`;
    }
};

export const updatePlayerStatsFromMatchResult = (
    currentPlayers: Record<number, Player>,
    matchResult: Match,
    season: string,
    liveMatchState?: LiveMatchState
): Record<number, Player> => {
    if (!matchResult.playerStats) return currentPlayers;

    const newPlayers = { ...currentPlayers };

    for (const pIdStr in matchResult.playerStats) {
        const playerId = Number(pIdStr);
        const matchStats = matchResult.playerStats[playerId];
        const originalPlayer = newPlayers[playerId];

        if (!originalPlayer) continue;

        // Clone player and history array for modification
        const player: Player = {
            ...originalPlayer,
            history: originalPlayer.history.map(h => ({ ...h })), // Deep clone history
        };

        if (player.promise) {
            player.promise = null; // Promise fulfilled by playing
        }

        let seasonStats: PlayerSeasonStats | undefined = player.history.find((h: PlayerSeasonStats) => h.season === season && h.clubId === player.clubId);

        if (!seasonStats) {
            seasonStats = {
                season,
                clubId: player.clubId,
                apps: 0,
                subOn: 0,
                goals: 0,
                assists: 0,
                shots: 0,
                tackles: 0,
                dribbles: 0,
                redCards: 0,
                ratingPoints: 0,
            };
            player.history.push(seasonStats);
        }

        seasonStats.apps += 1;
        seasonStats.goals += matchStats.goals;
        seasonStats.assists += matchStats.assists;
        seasonStats.shots += matchStats.shots;
        seasonStats.tackles += matchStats.tackles;
        seasonStats.dribbles += matchStats.dribbles;
        seasonStats.ratingPoints += matchStats.rating;

        const redCardEvents = matchResult.disciplinaryEvents?.filter(e => e.playerId === playerId && e.type === 'red').length || 0;
        seasonStats.redCards += redCardEvents;

        // Determine if player was a sub
        if (liveMatchState) {
            const isHomeTeamPlayer = player.clubId === liveMatchState.homeTeamId;
            const initialLineup = isHomeTeamPlayer ? liveMatchState.initialHomeLineupIds : liveMatchState.initialAwayLineupIds;
            if (!initialLineup.includes(playerId)) {
                seasonStats.subOn += 1;
            }
        }

        newPlayers[playerId] = player;
    }

    return newPlayers;
};