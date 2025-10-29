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

    // Create a shallow copy to avoid mutating the original state directly in the reducer.
    const newPlayers = { ...currentPlayers };

    for (const pIdStr in matchResult.playerStats) {
        const playerId = Number(pIdStr);
        const matchStats = matchResult.playerStats[playerId];
        const originalPlayer = newPlayers[playerId];

        if (!originalPlayer) continue;

        // Deep copy only the player being modified to prevent state mutation issues.
        // JSON.stringify turns Date objects into strings, so we must re-hydrate it.
        const player = JSON.parse(JSON.stringify(originalPlayer));
        player.contractExpires = new Date(originalPlayer.contractExpires);

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
                ratingPoints: 0,
            };
            player.history.push(seasonStats);
        }
        
        seasonStats.apps += 1;
        seasonStats.goals += matchStats.goals;
        seasonStats.assists += matchStats.assists;
        seasonStats.shots += matchStats.shots;
        seasonStats.tackles += matchStats.tackles;
        seasonStats.ratingPoints += matchStats.rating;

        // Determine if player was a sub
        if (liveMatchState) {
            const isHomeTeamPlayer = player.clubId === liveMatchState.homeTeamId;
            const initialLineup = isHomeTeamPlayer ? liveMatchState.initialHomeLineupIds : liveMatchState.initialAwayLineupIds;
            if (!initialLineup.includes(playerId)) {
                seasonStats.subOn += 1;
            }
        }
        
        // Place the updated, cloned player back into the new players object.
        newPlayers[playerId] = player;
    }

    return newPlayers;
};
