import { Match, Club, Player } from '../types';

const templates = {
    dominantWin: [
        { headline: `${'winner'} Clínico Desmantela ${'loser'}`, content: `${'winner'} deu um show hoje, dominando a posse de bola com ${'winPossession'}% e bombardeando o gol com ${'winShots'} finalizações. O placar final de ${'score'} não os favorece, pois mereceram amplamente a vitória com base em um total de gols esperados de ${'winXG'} contra ${'loseXG'} do ${'loser'}.` },
        { headline: `${'winner'} Vence por ${'score'} com Tranquilidade`, content: `Foi um dia tranquilo no escritório para o ${'winner'}. Eles controlaram o ritmo do início ao fim, e a vitória por ${'score'} foi um reflexo justo de sua superioridade em campo.`}
    ],
    smashAndGrab: [
        { headline: `Drama no Fim Vê ${'winner'} Roubar os Pontos`, content: `Em uma performance clássica de "smash-and-grab", o ${'winner'} resistiu a uma tempestade de ${'loseShots'} finalizações do ${'loser'} para arrancar uma vitória por ${'score'}. Apesar de ter apenas ${'winPossession'}% de posse de bola, sua finalização clínica fez toda a diferença.` },
    ],
    hardFoughtWin: [
        { headline: `${'winner'} Supera ${'loser'} em Duelo Tenso`, content: `Uma batalha acirrada viu o ${'winner'} sair com uma vitória apertada por ${'score'}. Foi um jogo de detalhes, mas um momento de qualidade decidiu a partida.` }
    ],
    disappointingLoss: [
         { headline: `Frustração para o ${'loser'} na Derrota por ${'score'}`, content: `É um resultado difícil de engolir para o ${'loser'}. Apesar de criar várias boas chances (totalizando ${'loseXG'} xG), eles não conseguiram o toque final e acabaram caindo para uma derrota por ${'score'} contra o ${'winner'}.` }
    ],
    thrillingDraw: [
        { headline: `Tudo Igual em Empate Eletrizante de ${'score'}`, content: `Que partida! Tanto ${'home'} quanto ${'away'} deixaram tudo em campo em um empate pulsante de ${'score'}. Uma disputa de ida e volta viu ambos os lados terem chances de vencer.` }
    ],
    scoreDraw: [
        { headline: `Pontos Divididos no Empate de ${'score'} entre ${'home'} e ${'away'}`, content: `Tudo igual entre ${'home'} e ${'away'} com o jogo terminando em ${'score'}. Ambas as equipes tiveram seus momentos, mas nenhuma conseguiu encontrar o gol da vitória.` }
    ],
    scorelessDraw: [
        { headline: `Empate sem Gols entre ${'home'} e ${'away'}`, content: `Uma batalha tática terminou em um impasse hoje, com nenhum dos lados conseguindo quebrar o zero. O jogo terminou em 0-0, um resultado que provavelmente foi justo dada a falta de chances claras para qualquer equipe.`}
    ]
};

const pickRandomTemplate = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];


export const generateNarrativeReport = (match: Match, playerClubId: number | null, clubs: Record<number, Club>, players: Record<number, Player>): { headline: string, content: string, matchStatsSummary: Match } => {
    const homeTeam = clubs[match.homeTeamId];
    const awayTeam = clubs[match.awayTeamId];
    const { homeScore, awayScore, homeStats, awayStats } = match;

    if (homeScore === undefined || awayScore === undefined || !homeStats || !awayStats) {
        return { headline: "Relatório da Partida", content: "Detalhes da partida indisponíveis.", matchStatsSummary: match };
    }

    const playerTeam = playerClubId === homeTeam.id ? homeTeam : playerClubId === awayTeam.id ? awayTeam : null;
    
    // Determine the result from the player's perspective
    let resultType: 'win' | 'draw' | 'loss' | 'neutral' = 'neutral';
    if (playerTeam) {
        if ((playerTeam.id === homeTeam.id && homeScore > awayScore) || (playerTeam.id === awayTeam.id && awayScore > homeScore)) {
            resultType = 'win';
        } else if (homeScore === awayScore) {
            resultType = 'draw';
        } else {
            resultType = 'loss';
        }
    }

    let templateKey: keyof typeof templates = 'hardFoughtWin'; // default
    const scoreDiff = Math.abs(homeScore - awayScore);

    if (resultType === 'win') {
        const playerIsHome = playerClubId === homeTeam.id;
        const playerStats = playerIsHome ? homeStats : awayStats;
        const opponentStats = playerIsHome ? awayStats : homeStats;
        if (scoreDiff >= 2 && playerStats.possession > 60) {
            templateKey = 'dominantWin';
        } else if (playerStats.possession < 45 && playerStats.shots < opponentStats.shots) {
            templateKey = 'smashAndGrab';
        } else {
            templateKey = 'hardFoughtWin';
        }
    } else if (resultType === 'loss') {
        templateKey = 'disappointingLoss';
    } else if (resultType === 'draw') {
        if (homeScore === 0) {
            templateKey = 'scorelessDraw';
        } else if (homeScore >= 2) {
            templateKey = 'thrillingDraw';
        } else { // 1-1
            templateKey = 'scoreDraw';
        }
    } else { // Neutral match
        if (homeScore === awayScore) {
             if (homeScore === 0) templateKey = 'scorelessDraw';
             else if (homeScore >= 2) templateKey = 'thrillingDraw';
             else templateKey = 'scoreDraw';
        } else {
            templateKey = 'hardFoughtWin';
        }
    }
    
    const template = pickRandomTemplate(templates[templateKey]);
    
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const loser = homeScore < awayScore ? homeTeam : awayTeam;
    
    const replacements: Record<string, any> = {
        home: homeTeam.name,
        away: awayTeam.name,
        score: `${homeScore}-${awayScore}`,
        winner: winner.name,
        loser: loser.name,
        winPossession: Math.round(winner.id === homeTeam.id ? homeStats.possession : awayStats.possession),
        winShots: winner.id === homeTeam.id ? homeStats.shots : awayStats.shots,
        winXG: (winner.id === homeTeam.id ? homeStats.xG : awayStats.xG).toFixed(2),
        loseShots: loser.id === homeTeam.id ? homeStats.shots : awayStats.shots,
        loseXG: (loser.id === homeTeam.id ? homeStats.xG : awayStats.xG).toFixed(2),
    };

    const finalHeadline = template.headline.replace(/\${(.*?)}/g, (_, key) => replacements[key]);
    let finalContent = template.content.replace(/\${(.*?)}/g, (_, key) => replacements[key]);

    // Add disciplinary and injury events
    let eventsContent = '';
    const yellowCards: Record<number, number> = {};
    const redCards: number[] = [];
    
    if (match.disciplinaryEvents) {
        match.disciplinaryEvents.forEach(event => {
            if (event.type === 'yellow') {
                yellowCards[event.playerId] = (yellowCards[event.playerId] || 0) + 1;
            } else if (event.type === 'red') {
                redCards.push(event.playerId);
            }
        });
    }

    if (Object.keys(yellowCards).length > 0) {
        eventsContent += `Cartões Amarelos: ${Object.keys(yellowCards).map(id => `${players[Number(id)].name} (${clubs[players[Number(id)].clubId].name})`).join(', ')}\n`;
    }
    if (redCards.length > 0) {
        eventsContent += `Cartões Vermelhos: ${redCards.map(id => `${players[id].name} (${clubs[players[id].clubId].name})`).join(', ')}\n`;
    }
    if (match.injuryEvents && match.injuryEvents.length > 0) {
         match.injuryEvents.forEach(event => {
            const matchDate = new Date(match.date);
            const returnDate = new Date(event.returnDate);
            const diffTime = Math.abs(returnDate.getTime() - matchDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const durationText = diffDays > 10 ? `aprox. ${Math.round(diffDays/7)} semanas` : `aprox. ${diffDays} dias`;
            eventsContent += `Lesão: ${players[event.playerId].name} (${clubs[players[event.playerId].clubId].name}) deve ficar de fora por ${durationText}.\n`;
        });
    }

    if (eventsContent) {
        finalContent += `\n\n---\nDisciplina e Lesões:\n${eventsContent}`;
    }
    
    return { headline: finalHeadline, content: finalContent, matchStatsSummary: match };
};