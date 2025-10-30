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

/**
 * Processes transfer decisions for all AI-controlled clubs.
 * This should be called periodically (e.g., once a week).
 * @param gameState The current game state.
 * @returns The updated game state with new negotiations or news.
 */
export const processAITransfers = (gameState: GameState): GameState => {
    let newState = { ...gameState };

    for (const clubIdStr in newState.clubs) {
        const clubId = Number(clubIdStr);
        // Skip the human player's club
        if (clubId === newState.playerClubId) continue;

        const club = newState.clubs[clubId];
        
        // Give each AI club a chance to make a transfer move this week
        // Higher reputation clubs are more active in the market
        const activityChance = 0.1 + (club.reputation / 200); // Between 10% and 60% chance
        if (Math.random() > activityChance) continue;

        // 1. Identify Weakness
        const clubPlayers = Object.values(newState.players).filter(p => p.clubId === clubId);
        const startingLineup = club.tactics.lineup.filter((lp): lp is LineupPlayer => lp !== null);
        if (startingLineup.length < 11) continue; // Can't assess team without a full lineup

        let weakestStarter: Player | null = null;
        let weakestStarterScore = 100;

        startingLineup.forEach(lp => {
            const player = newState.players[lp.playerId];
            if (player) {
                const score = getOverallRating(player);
                if (score < weakestStarterScore) {
                    weakestStarterScore = score;
                    weakestStarter = player;
                }
            }
        });

        if (!weakestStarter) continue;

        // 2. Find a suitable transfer target
        const potentialTargets = Object.values(newState.players).filter(p => {
            if (p.clubId === clubId) return false; // Not from their own club
            if (getRoleCategory(p.naturalPosition) !== getRoleCategory(weakestStarter!.naturalPosition)) return false; // Must be same position category
            if (p.marketValue > club.balance * 0.4) return false; // Must be affordable (max 40% of balance)
            if (getOverallRating(p) < weakestStarterScore + 5) return false; // Must be a clear upgrade
            
            const sellingClub = newState.clubs[p.clubId];
            if (!sellingClub) return false;
            if (sellingClub.reputation > club.reputation + 10) return false; // Avoid buying from much bigger clubs
            
            return true;
        });

        if (potentialTargets.length === 0) continue;

        // Pick the best value target (highest rating for the price)
        potentialTargets.sort((a, b) => (getOverallRating(b) / b.marketValue) - (getOverallRating(a) / a.marketValue));
        const target = potentialTargets[0];

        // 3. Initiate the transfer negotiation
        if (target) {
            const newNegotiation: TransferNegotiation = {
                id: newState.nextNegotiationId,
                playerId: target.id,
                sellingClubId: target.clubId,
                buyingClubId: clubId,
                stage: 'club',
                status: 'ai_turn', // Default status, will be updated below if target is player
                lastOfferBy: 'ai', // The buying AI makes the first move
                clubOfferHistory: [],
                agentOfferHistory: [],
                agreedFee: 0
            };
            
            // AI makes an initial offer, usually slightly below market value to start negotiations
            const initialOfferFee = Math.round((target.marketValue * (0.9 + Math.random() * 0.15)) / 1000) * 1000;
            const initialOffer: TransferOffer = { fee: initialOfferFee };
            newNegotiation.clubOfferHistory.push({ offer: initialOffer, by: 'ai' });

            // If the target belongs to the human player, set up the negotiation for them to respond
            if (target.clubId === newState.playerClubId) {
                newNegotiation.status = 'player_turn'; // It's now the player's turn to respond
                
                // Add a news item to inform the player of the incoming offer
                const headline = `Transfer Offer for ${target.name}`;
                const content = `${club.name} have submitted a transfer offer of ${initialOffer.fee.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} for your player, ${target.name}. You can respond to this offer from the Transfers screen.`;
                const newNewsItem: NewsItem = {
                    id: newState.nextNewsId,
                    date: new Date(newState.currentDate),
                    headline,
                    content,
                    type: 'transfer_offer_received',
                    relatedEntityId: newNegotiation.id,
                    isRead: false
                };
                newState.news = [newNewsItem, ...newState.news];
                newState.nextNewsId++;
            }
            // For AI-to-AI transfers, the status remains 'ai_turn' for the selling AI to process next week.

            newState.transferNegotiations[newState.nextNegotiationId] = newNegotiation;
            newState.nextNegotiationId++;
        }
    }

    return newState;
};