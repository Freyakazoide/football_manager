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
        const player = JSON.parse(JSON.stringify(originalPlayer));
        // Re-hydrate all date objects that get stringified
        player.contractExpires = new Date(originalPlayer.contractExpires);
        if (player.injury?.returnDate) {
            player.injury.returnDate = new Date(player.injury.returnDate);
        }
        if (player.suspension?.returnDate) {
            player.suspension.returnDate = new Date(player.suspension.returnDate);
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
        
        // Place the updated, cloned player back into the new players object.
        newPlayers[playerId] = player;
    }

    return newPlayers;
};