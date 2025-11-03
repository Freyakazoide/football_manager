import { GameState, LiveMatchState, MatchDayInfo, Club, Player, LivePlayer, MatchEvent, Mentality, MatchStats, PlayerMatchStats, PlayerRole, LineupPlayer, TacklingInstruction, ShootingInstruction, DribblingInstruction, PassingInstruction, PressingInstruction, PositioningInstruction, CrossingInstruction, MarkingInstruction, PlayerAttributes } from '../types';
import { commentary } from './commentary';
import { getRoleCategory } from './database';
import { createDefaultInstructions } from './aiTacticsService';

// Helper function to convert a Player to a LivePlayer
const createLivePlayer = (player: Player, lineupPlayer: LineupPlayer): LivePlayer => {
    return {
        id: player.id,
        name: player.name,
        attributes: player.attributes,
        stamina: 100, // Starts fresh
        yellowCardCount: 0,
        isSentOff: false,
        isInjured: false,
        stats: {
            shots: 0, goals: 0, assists: 0, keyPasses: 0, passes: 0,
            tackles: 0, dribbles: 0, rating: 6.0,
        },
        role: lineupPlayer.role,
        instructions: lineupPlayer.instructions,
        currentPosition: lineupPlayer.position,
        positionalFamiliarity: player.positionalFamiliarity,
        morale: player.morale,
        matchFitness: player.matchFitness,
    };
};

export const createLiveMatchState = (
    matchDayInfo: MatchDayInfo,
    clubs: Record<number, Club>,
    players: Record<number, Player>,
    playerClubId: number
): LiveMatchState => {
    const { match, homeTeam, awayTeam } = matchDayInfo;

    const createTeamLineup = (lineup: (LineupPlayer | null)[]): LivePlayer[] => {
        return lineup
            .filter((lp): lp is LineupPlayer => lp !== null)
            .map(lp => createLivePlayer(players[lp.playerId], lp));
    };
    
    const createTeamBench = (bench: (number | null)[]): LivePlayer[] => {
        return bench
            .filter((pId): pId is number => pId !== null)
            .map(pId => {
                const player = players[pId];
                // Create a dummy LineupPlayer for bench players
                const dummyLineupPlayer: LineupPlayer = {
                    playerId: pId,
                    position: { x: -1, y: -1 }, // Not on pitch
                    role: player.naturalPosition,
                    instructions: createDefaultInstructions(),
                };
                return createLivePlayer(player, dummyLineupPlayer);
            });
    };

    const homeLineup = createTeamLineup(homeTeam.tactics.lineup);
    const awayLineup = createTeamLineup(awayTeam.tactics.lineup);
    const homeBench = createTeamBench(homeTeam.tactics.bench);
    const awayBench = createTeamBench(awayTeam.tactics.bench);

    const initialStats: MatchStats = {
        shots: 0, shotsOnTarget: 0, possession: 0, tackles: 0, passes: 0,
        passAccuracy: 0, fouls: 0, corners: 0, offsides: 0, xG: 0, bigChances: 0,
    };

    return {
        matchId: match.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        ball: { x: 50, y: 50, z: 0, possession: 'home', lastTouchedBy: null },
        minute: 0,
        homeScore: 0,
        awayScore: 0,
        homeLineup,
        awayLineup,
        homeBench,
        awayBench,
        homeSubsMade: 0,
        awaySubsMade: 0,
        log: [],
        isPaused: true, // Start paused for pre-match screen
        status: 'pre-match',
        homeMentality: homeTeam.tactics.mentality,
        awayMentality: awayTeam.tactics.mentality,
        refereeStrictness: Math.random(),
        homeStats: { ...initialStats },
        awayStats: { ...initialStats },
        attackingTeamId: homeTeam.id, // Home team starts with possession
        ballCarrierId: null,
        ballZone: 4, // Midfield
        playerTeamId: playerClubId,
        isKeyPassOpportunity: false,
        homePossessionMinutes: 0,
        awayPossessionMinutes: 0,
        initialHomeLineupIds: homeTeam.tactics.lineup.filter(Boolean).map(lp => lp!.playerId),
        initialAwayLineupIds: awayTeam.tactics.lineup.filter(Boolean).map(lp => lp!.playerId),
        initialHomeLineup: homeTeam.tactics.lineup,
        initialAwayLineup: awayTeam.tactics.lineup,
        lastPasser: null,
        forcedSubstitution: null,
        injuredPlayerIds: [],
        homeCohesion: homeTeam.teamCohesion,
        awayCohesion: awayTeam.teamCohesion,
    };
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const formatCommentary = (template: string, replacements: Record<string, string>): string => {
    let result = template;
    for (const key in replacements) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacements[key]);
    }
    return result;
}

const getPlayerByRole = (players: LivePlayer[], roles: PlayerRole[]): LivePlayer | null => {
    const candidates = players.filter(p => !p.isSentOff && !p.isInjured && roles.includes(p.role));
    return pickRandom(candidates) || null;
}

const getNearestOpponent = (player: LivePlayer, zone: number, opponents: LivePlayer[]): LivePlayer | null => {
    const activeOpponents = opponents.filter(p => !p.isSentOff && !p.isInjured);
    if (activeOpponents.length === 0) return null;

    const playerRoleCat = getRoleCategory(player.role);
    let opponentCandidates: LivePlayer[] = [];

    // Find direct positional opponents first
    if (playerRoleCat === 'FWD') {
        opponentCandidates = activeOpponents.filter(p => getRoleCategory(p.role) === 'DEF');
    }