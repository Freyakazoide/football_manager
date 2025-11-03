import { GameState, Club, Player, PlayerRole, LineupPlayer, TransferNegotiation, TransferOffer, NewsItem } from '../types';
import { getRoleCategory } from './database';

const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

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

export const generateOffersForPlayer = (
    playerId: number,
    gameState: GameState
): {
    newNegotiations: Record<number, TransferNegotiation>;
    newNews: NewsItem[];
    nextNegotiationId: number;
    nextNewsId: number;
} => {
    const offeredPlayer = gameState.players[playerId];
    const sellingClub = gameState.clubs[offeredPlayer.clubId];
    let currentNegotiationId = gameState.nextNegotiationId;
    let currentNewsId = gameState.nextNewsId;

    const interestedClubs: Club[] = [];

    // 1. Identify interested clubs
    for (const club of Object.values(gameState.clubs)) {
        if (club.id === sellingClub.id) continue; // Can't sell to self

        // Interest Check
        const clubPlayers = Object.values(gameState.players).filter(p => p.clubId === club.id);
        const playersInPosition = clubPlayers.filter(p => getRoleCategory(p.naturalPosition) === getRoleCategory(offeredPlayer.naturalPosition));
        const avgRatingInPosition = playersInPosition.length > 0
            ? playersInPosition.reduce((sum, p) => sum + getOverallRating(p), 0) / playersInPosition.length
            : 0;
        
        const isUpgrade = getOverallRating(offeredPlayer) > avgRatingInPosition + 2;
        const priceToCheck = offeredPlayer.askingPrice ?? offeredPlayer.marketValue;
        const isAffordable = priceToCheck < club.transferBudget && offeredPlayer.wage < (club.wageBudget * 0.2); // Simple wage check
        const reputationMatch = club.reputation > sellingClub.reputation - 20;

        if (isUpgrade && isAffordable && reputationMatch) {
            interestedClubs.push(club);
        }
    }

    const newNegotiations: Record<number, TransferNegotiation> = {};
    const newNews: NewsItem[] = [];

    if (interestedClubs.length === 0) {
        newNews.push({
            id: currentNewsId++,
            date: new Date(gameState.currentDate),
            headline: `Sem interesse por ${offeredPlayer.name}`,
            content: `Apesar de ter sido oferecido a vários clubes, não houve interesse imediato por ${offeredPlayer.name}. Você pode precisar diminuir suas expectativas ou esperar que o interesse surja.`,
            type: 'transfer_deal_collapsed', // Re-using a type
            relatedEntityId: offeredPlayer.id,
            isRead: false
        });
    } else {
        // 2. Generate offers from interested clubs
        for (const buyingClub of interestedClubs) {
            // Only 1 in 3 interested clubs actually make an offer to not spam the user
            if (Math.random() > 0.33) continue;

            const basePrice = offeredPlayer.askingPrice ?? offeredPlayer.marketValue;
            const offerFee = Math.round(basePrice * (0.8 + Math.random() * 0.3)); // 80% to 110% of asking price or value
            
            const newNegotiation: TransferNegotiation = {
                id: currentNegotiationId,
                playerId: offeredPlayer.id,
                type: 'transfer',
                sellingClubId: sellingClub.id,
                buyingClubId: buyingClub.id,
                stage: 'club',
                status: 'player_turn', // It's the user's turn to respond
                lastOfferBy: 'ai',
                clubOfferHistory: [{ offer: { fee: offerFee }, by: 'ai' }],
                agentOfferHistory: [],
                agreedFee: 0,
            };

            newNegotiations[currentNegotiationId] = newNegotiation;

            const headline = `Oferta de Transferência por ${offeredPlayer.name}`;
            const content = `${buyingClub.name} enviou uma oferta de transferência de ${formatCurrency(offerFee)} pelo seu jogador, ${offeredPlayer.name}. Você pode responder a esta oferta na tela de Transferências.`;
            
            newNews.push({
                id: currentNewsId++,
                date: new Date(gameState.currentDate),
                headline,
                content,
                type: 'transfer_offer_received',
                relatedEntityId: newNegotiation.id,
                isRead: false,
            });

            currentNegotiationId++;
        }
        
        // If after random chance no one made an offer, still send the "no interest" news
        if (Object.keys(newNegotiations).length === 0) {
            newNews.push({
                id: currentNewsId++,
                date: new Date(gameState.currentDate),
                headline: `Interesse morno por ${offeredPlayer.name}`,
                content: `Vários clubes mostraram interesse em ${offeredPlayer.name} depois que ele foi oferecido, mas nenhuma proposta formal foi feita ainda.`,
                type: 'transfer_deal_collapsed',
                relatedEntityId: offeredPlayer.id,
                isRead: false
            });
        }
    }

    return { newNegotiations, newNews, nextNegotiationId: currentNegotiationId, nextNewsId: currentNewsId };
};


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
        const priceToCheck = p.askingPrice ?? p.marketValue;
        if (priceToCheck > club.balance * 0.7) return false; // Must be affordable (max 70% of balance)

        // New logic: Must be an upgrade in either current ability or potential
        const ratingImprovement = getOverallRating(p) - weakestStarterScore;
        const potentialImprovement = p.potential - weakestStarter!.potential;
        let valueScore = ratingImprovement + (potentialImprovement / 4); // Potential is a factor
        
        if (p.isTransferListed) {
            valueScore += 5; // Significant bonus to make them attractive
        }
        
        if (valueScore < 1) return false; // Must be at least a minor upgrade in ability or potential

        const sellingClub = gameState.clubs[p.clubId];
        if (!sellingClub) return false;
        if (sellingClub.reputation > club.reputation + 15) return false; // Avoid buying from much bigger clubs

        return true;
    });


    if (potentialTargets.length === 0) return acc;

    // Pick the best value target (highest rating for the price, with bonus for being listed)
    potentialTargets.sort((a, b) => {
        const priceA = a.askingPrice ?? a.marketValue;
        const priceB = b.askingPrice ?? b.marketValue;
        const scoreA = (getOverallRating(a) / priceA) * (a.isTransferListed ? 1.5 : 1);
        const scoreB = (getOverallRating(b) / priceB) * (b.isTransferListed ? 1.5 : 1);
        return scoreB - scoreA;
    });
    const target = potentialTargets[0];

    // 3. Initiate the transfer negotiation
    if (target) {
        const currentNegotiationId = acc.nextNegotiationId;
        const newNegotiation: TransferNegotiation = {
            id: currentNegotiationId,
            playerId: target.id,
            type: 'transfer',
            sellingClubId: target.clubId,
            buyingClubId: club.id,
            stage: 'club',
            status: 'ai_turn',
            lastOfferBy: 'ai',
            clubOfferHistory: [],
            agentOfferHistory: [],
            agreedFee: 0
        };

        const basePrice = target.askingPrice ?? target.marketValue;
        const initialOfferFee = Math.round((basePrice * (0.9 + Math.random() * 0.15)) / 1000) * 1000;
        newNegotiation.clubOfferHistory.push({ offer: { fee: initialOfferFee }, by: 'ai' });

        let newNewsItem: NewsItem | null = null;
        if (target.clubId === gameState.playerClubId) {
            newNegotiation.status = 'player_turn';
            const headline = `Oferta de Transferência por ${target.name}`;
            const content = `${club.name} enviou uma oferta de transferência de ${initialOfferFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })} pelo seu jogador, ${target.name}. Você pode responder a esta oferta na tela de Transferências.`;
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