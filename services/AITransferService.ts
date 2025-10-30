import { GameState, Club, Player, PlayerRole, LineupPlayer, TransferNegotiation, TransferOffer, NewsItem } from '../types';
import { getRoleCategory } from './database';

/**
 * Calculates a player's general overall rating based on key attributes.
 * @param player The player object.
 * @returns A number representing the player's overall rating.
 */
const getOverallRating = (player: Player): number => {
    const attrs = player.attributes;
    const keyAttrs = [
        attrs.passing, attrs.dribbling, attrs.shooting, attrs.tackling,
        attrs.pace, attrs.positioning, attrs.workRate, attrs.stamina
    ];
    return keyAttrs.reduce((a, b) => a + b, 0) / keyAttrs.length;
};

interface TransferProcessingAccumulator {
    negotiations: Record<number, TransferNegotiation>;
    news: NewsItem[];
    nextNegotiationId: number;
    nextNewsId: number;
}

const processClubTransferLogic = (
    club: Club,
    gameState: GameState,
    acc: TransferProcessingAccumulator
): TransferProcessingAccumulator => {

    if (club.id === gameState.playerClubId) return acc;

    const activityChance = 0.1 + (club.reputation / 200); // Between 10% and 60% chance
    if (Math.random() > activityChance) return acc;

    // 1. Identify Weakness
    const clubPlayers = Object.values(gameState.players).filter(p => p.clubId === club.id);
    const startingLineup = club.tactics.lineup.filter((lp): lp is LineupPlayer => lp !== null);
    if (startingLineup.length < 11) return acc; // Can't assess team without a full lineup

    let weakestStarter: Player | null = null;
    let weakestStarterScore = 100;

    startingLineup.forEach(lp => {
        const player = gameState.players[lp.playerId];
        if (player) {
            const score = getOverallRating(player);
            if (score < weakestStarterScore) {
                weakestStarterScore = score;
                weakestStarter = player;
            }
        }
    });

    if (!weakestStarter) return acc;

    // 2. Find a suitable transfer target
    const potentialTargets = Object.values(gameState.players).filter(p => {
        if (p.clubId === club.id) return false; // Not from their own club
        if (getRoleCategory(p.naturalPosition) !== getRoleCategory(weakestStarter!.naturalPosition)) return false; // Must be same position category
        if (p.marketValue > club.balance * 0.4) return false; // Must be affordable (max 40% of balance)
        if (getOverallRating(p) < weakestStarterScore + 5) return false; // Must be a clear upgrade

        const sellingClub = gameState.clubs[p.clubId];
        if (!sellingClub) return false;
        if (sellingClub.reputation > club.reputation + 10) return false; // Avoid buying from much bigger clubs

        return true;
    });

    if (potentialTargets.length === 0) return acc;

    // Pick the best value target (highest rating for the price)
    potentialTargets.sort((a, b) => (getOverallRating(b) / b.marketValue) - (getOverallRating(a) / a.marketValue));
    const target = potentialTargets[0];

    // 3. Initiate the transfer negotiation
    if (target) {
        const currentNegotiationId = acc.nextNegotiationId;
        const newNegotiation: TransferNegotiation = {
            id: currentNegotiationId,
            playerId: target.id,
            sellingClubId: target.clubId,
            buyingClubId: club.id,
            stage: 'club',
            status: 'ai_turn',
            lastOfferBy: 'ai',
            clubOfferHistory: [],
            agentOfferHistory: [],
            agreedFee: 0
        };

        const initialOfferFee = Math.round((target.marketValue * (0.9 + Math.random() * 0.15)) / 1000) * 1000;
        newNegotiation.clubOfferHistory.push({ offer: { fee: initialOfferFee }, by: 'ai' });

        let newNewsItem: NewsItem | null = null;
        if (target.clubId === gameState.playerClubId) {
            newNegotiation.status = 'player_turn';
            const headline = `Transfer Offer for ${target.name}`;
            const content = `${club.name} have submitted a transfer offer of ${initialOfferFee.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} for your player, ${target.name}. You can respond to this offer from the Transfers screen.`;
            newNewsItem = {
                id: acc.nextNewsId,
                date: new Date(gameState.currentDate),
                headline, content, type: 'transfer_offer_received',
                relatedEntityId: newNegotiation.id, isRead: false
            };
        }

        // Return a new accumulator with the updated data
        return {
            negotiations: { ...acc.negotiations, [currentNegotiationId]: newNegotiation },
            news: newNewsItem ? [...acc.news, newNewsItem] : acc.news,
            nextNegotiationId: acc.nextNegotiationId + 1,
            nextNewsId: newNewsItem ? acc.nextNewsId + 1 : acc.nextNewsId,
        };
    }

    return acc;
};


/**
 * Processes transfer decisions for all AI-controlled clubs.
 * This should be called periodically (e.g., once a week).
 * @param gameState The current game state.
 * @returns The updated game state with new negotiations or news.
 */
export const processAITransfers = (gameState: GameState): GameState => {
    const initialAccumulator: TransferProcessingAccumulator = {
        negotiations: {},
        news: [],
        nextNegotiationId: gameState.nextNegotiationId,
        nextNewsId: gameState.nextNewsId,
    };

    const results = Object.values(gameState.clubs).reduce(
        (acc, club) => processClubTransferLogic(club, gameState, acc),
        initialAccumulator
    );

    if (Object.keys(results.negotiations).length > 0) {
        return {
            ...gameState,
            transferNegotiations: { ...gameState.transferNegotiations, ...results.negotiations },
            news: [...results.news, ...gameState.news],
            nextNewsId: results.nextNewsId,
            nextNegotiationId: results.nextNegotiationId,
        };
    }

    return gameState;
};
