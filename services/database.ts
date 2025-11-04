import { GameState, Club, Player, PlayerAttributes, Match, LeagueEntry, LineupPlayer, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, CrossingInstruction, PositioningInstruction, TacklingInstruction, PressingInstruction, MarkingInstruction, PlayerRole, Tactics, Staff, StaffRole, StaffAttributes, AssistantManagerAttributes, HeadOfScoutingAttributes, HeadOfPhysiotherapyAttributes, HeadOfPerformanceAttributes, Competition, DepartmentType, Sponsor, SponsorshipDeal, ClubPhilosophy, Bank, SquadStatus, CoachingAttributes, PlayerConcernType, SecondaryTrainingFocus } from '../types';
import { SPONSOR_DATA } from './sponsors';

const FIRST_NAMES = ['John', 'Paul', 'Mike', 'Leo', 'Chris', 'David', 'Alex', 'Ben', 'Sam', 'Tom', 'Dan', 'Matt'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Martin'];
const STAFF_FIRST_NAMES = ['Peter', 'Richard', 'Gary', 'Steve', 'Mark', 'Alan', 'Neil', 'Brian'];
const STAFF_LAST_NAMES = ['Taylor', 'Wright', 'Thompson', 'Roberts', 'Walker', 'Harris', 'Clarke', 'King'];
const COUNTRIES = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Brazil', 'Argentina'];
const CLUB_NAMES = ['United', 'Rovers', 'City', 'Wanderers', 'Athletic', 'FC', 'Albion', 'Town'];
const CITIES = ['Northwood', 'Southglen', 'Easton', 'Westfield', 'Oakhaven', 'Riverdale', 'Mountview', 'Portsmith', 'Fairview', 'Lakeside', 'Bridgewater', 'Silverstone'];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- NEW CONCERN DEFINITIONS ---
type ConcernDefinition = {
    title: string;
    getPlayerStatement: (playerName: string) => string;
    responses: { id: string, text: string, outcome: string }[];
};

export const CONCERN_DEFINITIONS: Record<PlayerConcernType, ConcernDefinition> = {
    playing_time: {
        title: "Preocupação com o Tempo de Jogo",
        getPlayerStatement: (playerName) => `Chefe, ${playerName} está preocupado com a falta de oportunidades na equipe principal ultimamente e gostaria de discutir seu papel no time.`,
        responses: [
            { id: 'promise_playing_time', text: "Prometer mais tempo de jogo.", outcome: "Faz uma promessa formal de que ele jogará mais nos próximos jogos." },
            { id: 'tell_to_be_patient', text: "Dizer a ele para ser paciente.", outcome: "Tenta acalmá-lo, mas não oferece garantias." },
            { id: 'challenge_to_improve', text: "Dizer que ele precisa se esforçar mais.", outcome: "Desafia o jogador a melhorar nos treinos para merecer um lugar." },
            { id: 'criticize_performance', text: "Dizer que os jogadores na posição dele estão melhores.", outcome: "Uma abordagem dura que pode desmotivá-lo." },
            { id: 'promise_loan', text: "Prometer encontrar um empréstimo para ele.", outcome: "Concorda em procurar um clube onde ele possa jogar regularmente por empréstimo." },
            { id: 'transfer_list', text: "Colocá-lo na lista de transferências.", outcome: "Decide que o melhor é seguir caminhos separados se ele está infeliz." },
        ]
    },
    new_contract: {
        title: "Desejo de um Novo Contrato",
        getPlayerStatement: (playerName) => `${playerName} acredita que suas performances recentes justificam um novo contrato melhorado e gostaria de iniciar as negociações.`,
        responses: [
            { id: 'promise_contract_talks', text: "Prometer iniciar as negociações em breve.", outcome: "Concorda em abrir negociações para um novo contrato no próximo mês." },
            { id: 'dismiss_not_earned', text: "Dizer que ele ainda não mereceu.", outcome: "Rejeita o pedido, afirmando que suas performances não justificam um aumento." },
            { id: 'delay_financial_reasons', text: "Dizer que o clube não pode pagar agora.", outcome: "Adia a conversa, citando as restrições financeiras do clube." },
            { id: 'delay_end_of_season', text: "Dizer que você revisará no final da temporada.", outcome: "Pede ao jogador para se concentrar no futebol e adia a decisão." },
            { id: 'praise_ambition', text: "Elogiar sua ambição, mas pedir foco.", outcome: "Uma resposta neutra que não se compromete com nada." },
            { id: 'reject_request', text: "Rejeitar o pedido completamente.", outcome: "Encerra a conversa, deixando o jogador muito infeliz." },
        ]
    },
    squad_status: {
        title: "Insatisfação com o Status no Elenco",
        getPlayerStatement: (playerName) => `${playerName} está insatisfeito com seu status atual de '${'squad_status'}' e sente que merece um papel mais importante no time.`,
        responses: [
            { id: 'promise_status_review', text: "Prometer uma melhoria se ele continuar performando bem.", outcome: "Define uma meta de desempenho para uma futura promoção no elenco." },
            { id: 'promote_immediately', text: "Promovê-lo imediatamente.", outcome: "Aumenta seu status no elenco, melhorando muito seu moral." },
            { id: 'status_is_fair', text: "Dizer a ele que seu status atual é justo.", outcome: "Defende sua decisão, o que provavelmente o deixará infeliz." },
            { id: 'demote_for_complaining', text: "Rebaixá-lo por reclamar.", outcome: "Uma medida disciplinar severa que destruirá seu moral." },
            { id: 'challenge_to_prove', text: "Desafiá-lo a provar seu valor em campo.", outcome: "Usa a reclamação como motivação para o jogador." },
            { id: 'dismiss_concern', text: "Ignorar a preocupação dele.", outcome: "Mostra que você não valoriza a opinião dele." },
        ]
    },
    new_challenge: {
        title: "Desejo de um Novo Desafio",
        getPlayerStatement: (playerName) => `Após seu tempo no clube, ${playerName} sente que é hora de um novo desafio em sua carreira e gostaria de explorar suas opções.`,
        responses: [
            { id: 'promise_to_sell', text: "Prometer vendê-lo se uma oferta adequada chegar.", outcome: "Concorda em facilitar uma transferência, definindo um preço pedido." },
            { id: 'remind_importance', text: "Lembrá-lo de sua importância para o clube.", outcome: "Tenta convencê-lo a ficar, apelando para sua lealdade e papel." },
            { id: 'offer_new_lucrative_contract', text: "Oferecer um novo contrato lucrativo.", outcome: "Tenta persuadi-lo a ficar com uma oferta financeira irrecusável." },
            { id: 'refuse_to_sell', text: "Recusar-se a vendê-lo.", outcome: "Deixa claro que ele não irá a lugar nenhum, arriscando sua felicidade." },
            { id: 'ask_for_one_more_season', text: "Pedir que ele fique por mais uma temporada.", outcome: "Faz um apelo pessoal para que ele ajude o time por mais um ano." },
            { id: 'transfer_list_high_price', text: "Listá-lo por um preço alto.", outcome: "Concorda em vendê-lo, mas apenas se suas altas exigências forem atendidas." },
        ]
    },
    team_performance: {
        title: "Preocupação com o Desempenho da Equipe",
        getPlayerStatement: (playerName) => `${playerName} está preocupado com a recente má fase da equipe e sente que o time não está jogando no seu potencial máximo.`,
        responses: [
            { id: 'agree_and_rally', text: "Concordar e dizer que as coisas vão melhorar.", outcome: "Mostra liderança e tenta unir o elenco." },
            { id: 'tell_to_focus_on_self', text: "Dizer a ele para se concentrar em seu próprio desempenho.", outcome: "Desvia a crítica e coloca a responsabilidade sobre o jogador." },
            { id: 'call_team_meeting', text: "Concordar e convocar uma reunião de equipe.", outcome: "Aborda o problema de frente com todo o elenco." },
            { id: 'promise_new_signings', text: "Prometer fortalecer o elenco na próxima janela.", outcome: "Garante que reforços estão a caminho para melhorar a qualidade." },
            { id: 'dismiss_as_overreaction', text: "Ignorar como um exagero.", outcome: "Minimiza as preocupações do jogador, arriscando o ressentimento." },
            { id: 'blame_the_player', text: "Dizer que ele é parte do problema.", outcome: "Uma resposta agressiva que irá prejudicar o relacionamento." },
        ]
    },
    position_reinforcement: {
        title: "Quer Reforços para a Posição",
        getPlayerStatement: (playerName) => `${playerName} sente que a equipe precisa de mais qualidade em sua área do campo e pediu para que você traga novos jogadores.`,
        responses: [
            { id: 'promise_to_scout', text: "Prometer observar jogadores para a posição.", outcome: "Concorda em focar os esforços de observação para fortalecer a área." },
            { id: 'disagree_with_assessment', text: "Discordar, dizendo que o elenco é forte o suficiente.", outcome: "Rejeita a avaliação do jogador sobre a qualidade do elenco." },
            { id: 'ask_for_suggestions', text: "Perguntar se ele tem alguma sugestão.", outcome: "Envolve o jogador na busca por talentos." },
            { id: 'praise_current_players', text: "Elogiar os jogadores atuais na posição.", outcome: "Mostra fé nos companheiros de equipe atuais, indiretamente rejeitando o pedido." },
            { id: 'tell_him_to_lead', text: "Dizer a ele para ser um líder e melhorar os outros.", outcome: "Coloca a responsabilidade no jogador sênior para elevar o nível." },
            { id: 'remind_budget_constraints', text: "Lembrá-lo das restrições orçamentárias.", outcome: "Explica que não há fundos disponíveis para grandes contratações." },
        ]
    },
    unhappy_with_criticism: {
        title: "Infeliz com Críticas",
        getPlayerStatement: (playerName) => `${playerName} ficou desapontado com seus comentários recentes sobre o desempenho dele e sente que a crítica foi injusta.`,
        responses: [
            { id: 'apologize', text: "Pedir desculpas se seus comentários foram muito duros.", outcome: "Tenta consertar o relacionamento admitindo um erro." },
            { id: 'stand_by_comments', text: "Manter seus comentários.", outcome: "Reforça sua crítica, afirmando que era justificada." },
            { id: 'explain_reasoning', text: "Explicar seu raciocínio em particular.", outcome: "Tenta fazer o jogador entender seu ponto de vista." },
            { id: 'praise_in_public', text: "Elogiá-lo publicamente para compensar.", outcome: "Usa a mídia para tentar reparar o dano." },
            { id: 'drop_from_squad', text: "Afastá-lo do time por questionar sua autoridade.", outcome: "Uma demonstração de força que irá piorar a situação." },
            { id: 'fine_for_dissent', text: "Multá-lo por insubordinação.", outcome: "Uma medida disciplinar que prejudicará severamente o moral." },
        ]
    },
    training_level: {
        title: "Insatisfeito com o Treinamento",
        getPlayerStatement: (playerName) => `${playerName} sente que o nível do treinamento não é alto o suficiente e está preocupado com seu desenvolvimento.`,
        responses: [
            { id: 'promise_to_improve_facilities', text: "Prometer investir nas instalações de treino.", outcome: "Concorda que melhorias são necessárias e fará um pedido à diretoria." },
            { id: 'promise_to_hire_better_coaches', text: "Prometer contratar treinadores melhores.", outcome: "Concorda em buscar novos membros para a comissão técnica." },
            { id: 'defend_coaching_staff', text: "Defender sua comissão técnica.", outcome: "Mostra lealdade à sua equipe, mas invalida a preocupação do jogador." },
            { id: 'suggest_individual_focus', text: "Sugerir que ele se concentre em um treino individual.", outcome: "Desvia a questão para o que o jogador pode controlar." },
            { id: 'disagree_with_player', text: "Discordar da avaliação do jogador.", outcome: "Rejeita completamente a reclamação dele." },
            { id: 'tell_to_work_harder', text: "Dizer que o problema é a falta de esforço dele.", outcome: "Inverte a culpa, acusando o jogador de não se aplicar." },
        ]
    },
    wants_to_be_starter: {
        title: "Quer ser Titular",
        getPlayerStatement: (playerName) => `${playerName} está frustrado por não ter sido titular no último jogo e exige um lugar no time titular para a próxima partida.`,
        responses: [
            { id: 'promise_starter', text: "Prometer a ele um lugar de titular na próxima partida.", outcome: "Garante a ele uma vaga no time titular, criando uma grande expectativa." },
            { id: 'tell_next_chance', text: "Dizer que ele terá sua chance em breve.", outcome: "Tenta acalmá-lo, mas sem uma promessa firme." },
            { id: 'question_fitness', text: "Questionar se ele está em forma para ser titular.", outcome: "Coloca a responsabilidade nele, sugerindo que ele não está no seu melhor." },
            { id: 'remind_competition', text: "Lembrá-lo da competição pela posição.", outcome: "Deixa claro que o lugar precisa ser conquistado, não exigido." },
            { id: 'ignore_demand', text: "Ignorar sua exigência.", outcome: "Mostra que você não se intimida com suas exigências, mas o deixará furioso." },
            { id: 'drop_from_squad_for_attitude', text: "Afastá-lo do elenco pela sua atitude.", outcome: "Uma medida disciplinar drástica que pode levar a um pedido de transferência." },
        ]
    },
    broken_promise: {
        title: "Promessa Quebrada",
        getPlayerStatement: (playerName) => `${playerName} está furioso por você não ter cumprido sua promessa. Ele sente que foi enganado e sua confiança em você está abalada.`,
        responses: [
            { id: 'apologize_and_repromise', text: "Pedir desculpas e fazer uma nova promessa.", outcome: "Tenta desesperadamente salvar a situação, mas sua palavra vale menos agora." },
            { id: 'apologize_no_promise', text: "Pedir desculpas sinceras, mas sem nova promessa.", outcome: "Admite o erro, mas não se compromete novamente." },
            { id: 'explain_circumstances', text: "Explicar por que não foi possível cumprir a promessa.", outcome: "Tenta justificar sua falha com base em circunstâncias externas." },
            { id: 'offer_new_contract_as_apology', text: "Oferecer um novo contrato como pedido de desculpas.", outcome: "Tenta resolver o problema com dinheiro." },
            { id: 'ignore_complaint', text: "Ignorar a reclamação dele.", outcome: "Mostra um desprezo total pelo jogador, destruindo o relacionamento." },
            { id: 'transfer_list_him', text: "Listá-lo para transferência, já que o relacionamento está quebrado.", outcome: "Decide que o dano é irreparável e é hora de vendê-lo." },
        ]
    },
};



// --- NEW BANK DATA ---
export const BANK_DATA: Bank[] = [
    // FIX: Changed bank tiers from English to Portuguese to match the 'Bank' type definition.
    { id: 1, name: "Stellar Bank Global", tier: 'Investimento Global', minReputation: 85, maxLoanAmount: 50_000_000, interestRateRange: [2.0, 4.5], termMonthsRange: [24, 60] },
    { id: 2, name: "Quantum Finance Group", tier: 'Investimento Global', minReputation: 80, maxLoanAmount: 40_000_000, interestRateRange: [2.5, 5.0], termMonthsRange: [24, 48] },
    { id: 3, name: "Heritage National Bank", tier: 'Comercial Nacional', minReputation: 65, maxLoanAmount: 15_000_000, interestRateRange: [4.0, 7.5], termMonthsRange: [12, 36] },
    { id: 4, name: "Pinnacle Corporate Lending", tier: 'Comercial Nacional', minReputation: 60, maxLoanAmount: 10_000_000, interestRateRange: [5.0, 8.5], termMonthsRange: [12, 36] },
    { id: 5, name: "Oakstead Regional Trust", tier: 'Regional', minReputation: 45, maxLoanAmount: 5_000_000, interestRateRange: [7.0, 11.0], termMonthsRange: [6, 24] },
    { id: 6, name: "Community First Credit Union", tier: 'Cooperativa de Crédito', minReputation: 0, maxLoanAmount: 1_000_000, interestRateRange: [10.0, 15.0], termMonthsRange: [6, 18] },
];

// --- NEW POSITIONAL FAMILIARITY LOGIC ---

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
export const ALL_ROLES: PlayerRole[] = [
    'Goleiro', 'Goleiro Líbero', 'Zagueiro', 'Zagueiro com Passe', 'Lateral', 'Ala', 'Lateral Invertido', 'Líbero',
    'Volante', 'Meio-campista', 'Volante Ladrão de Bolas', 'Meia Box-to-Box', 'Construtor de Jogo Recuado', 'Meia Itinerante',
    'Mezzala', 'Carrilero', 'Meia Aberto', 'Armador Aberto', 'Meia Atacante', 'Armador Avançado', 'Atacante Sombra',
    'Trequartista', 'Falso Nove', 'Atacante', 'Atacante Avançado', 'Atacante Completo', 'Finalizador', 'Atacante Recuado'
];

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
export const ROLE_DEFINITIONS: Record<PlayerRole, { category: 'GK' | 'DEF' | 'MID' | 'FWD' }> = {
    'Goleiro': { category: 'GK' }, 'Goleiro Líbero': { category: 'GK' },
    'Zagueiro': { category: 'DEF' }, 'Zagueiro com Passe': { category: 'DEF' }, 'Líbero': { category: 'DEF' },
    'Lateral': { category: 'DEF' }, 'Ala': { category: 'DEF' }, 'Lateral Invertido': { category: 'DEF' },
    'Volante': { category: 'MID' }, 'Meio-campista': { category: 'MID' }, 'Volante Ladrão de Bolas': { category: 'MID' },
    'Meia Box-to-Box': { category: 'MID' }, 'Construtor de Jogo Recuado': { category: 'MID' }, 'Meia Itinerante': { category: 'MID' },
    'Mezzala': { category: 'MID' }, 'Carrilero': { category: 'MID' }, 'Meia Aberto': { category: 'MID' }, 'Armador Aberto': { category: 'MID' },
    'Meia Atacante': { category: 'FWD' }, 'Armador Avançado': { category: 'FWD' }, 'Atacante Sombra': { category: 'FWD' },
    'Trequartista': { category: 'FWD' }, 'Falso Nove': { category: 'FWD' },
    'Atacante': { category: 'FWD' }, 'Atacante Avançado': { category: 'FWD' }, 'Atacante Completo': { category: 'FWD' },
    'Finalizador': { category: 'FWD' }, 'Atacante Recuado': { category: 'FWD' },
};

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
export const ROLE_TO_POSITION_MAP: Record<PlayerRole, { x: number; y: number }> = {
    // GK
    'Goleiro': { x: 50, y: 95 }, 'Goleiro Líbero': { x: 50, y: 90 },
    // DEF
    'Líbero': { x: 50, y: 82 }, 'Zagueiro': { x: 50, y: 78 }, 'Zagueiro com Passe': { x: 50, y: 78 },
    'Lateral': { x: 18, y: 75 },
    'Ala': { x: 15, y: 65 },
    'Lateral Invertido': { x: 25, y: 68 },
    // MID
    'Volante': { x: 50, y: 65 },
    'Construtor de Jogo Recuado': { x: 50, y: 62 },
    'Volante Ladrão de Bolas': { x: 50, y: 58 },
    'Carrilero': { x: 35, y: 55 },
    'Meio-campista': { x: 50, y: 55 },
    'Meia Box-to-Box': { x: 50, y: 50 },
    'Meia Itinerante': { x: 50, y: 48 },
    'Mezzala': { x: 35, y: 45 },
    'Meia Aberto': { x: 15, y: 50 },
    'Armador Aberto': { x: 20, y: 45 },
    // AM
    'Meia Atacante': { x: 50, y: 38 },
    'Armador Avançado': { x: 50, y: 35 },
    'Trequartista': { x: 50, y: 30 },
    'Atacante Sombra': { x: 50, y: 25 },
    // FWD
    'Falso Nove': { x: 50, y: 22 },
    'Atacante Recuado': { x: 50, y: 18 },
    'Finalizador': { x: 50, y: 12 },
    'Atacante Avançado': { x: 50, y: 10 },
    'Atacante': { x: 50, y: 15 },
    'Atacante Completo': { x: 50, y: 15 },
};


// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
const FAMILIARITY_MAP: Record<PlayerRole, Partial<Record<PlayerRole, number>>> = {
    // GK Group
    'Goleiro': { 'Goleiro': 100, 'Goleiro Líbero': 85 },
    'Goleiro Líbero': { 'Goleiro Líbero': 100, 'Goleiro': 85, 'Líbero': 50 },

    // DEF Group
    'Zagueiro': { 'Zagueiro': 100, 'Zagueiro com Passe': 90, 'Líbero': 70, 'Volante': 60, 'Lateral': 50 },
    'Zagueiro com Passe': { 'Zagueiro com Passe': 100, 'Zagueiro': 90, 'Líbero': 75, 'Volante': 65, 'Construtor de Jogo Recuado': 50 },
    'Líbero': { 'Líbero': 100, 'Zagueiro': 80, 'Volante': 70, 'Goleiro Líbero': 60 },
    'Lateral': { 'Lateral': 100, 'Ala': 90, 'Lateral Invertido': 80, 'Meia Aberto': 65, 'Zagueiro': 50 },
    'Ala': { 'Ala': 100, 'Lateral': 90, 'Meia Aberto': 80, 'Lateral Invertido': 70 },
    'Lateral Invertido': { 'Lateral Invertido': 100, 'Lateral': 85, 'Volante': 70, 'Meio-campista': 60, 'Ala': 70 },
    
    // MID Group
    'Volante': { 'Volante': 100, 'Construtor de Jogo Recuado': 85, 'Volante Ladrão de Bolas': 85, 'Meio-campista': 80, 'Zagueiro': 70 },
    'Meio-campista': { 'Meio-campista': 100, 'Meia Box-to-Box': 90, 'Mezzala': 85, 'Carrilero': 85, 'Meia Itinerante': 85, 'Volante': 80, 'Meia Atacante': 80 },
    'Volante Ladrão de Bolas': { 'Volante Ladrão de Bolas': 100, 'Volante': 90, 'Meio-campista': 85, 'Carrilero': 75 },
    'Meia Box-to-Box': { 'Meia Box-to-Box': 100, 'Meio-campista': 90, 'Meia Itinerante': 80, 'Mezzala': 75, 'Carrilero': 70 },
    'Construtor de Jogo Recuado': { 'Construtor de Jogo Recuado': 100, 'Volante': 90, 'Meio-campista': 80, 'Meia Itinerante': 70, 'Armador Avançado': 60 },
    'Meia Itinerante': { 'Meia Itinerante': 100, 'Meio-campista': 85, 'Mezzala': 80, 'Armador Avançado': 80, 'Meia Box-to-Box': 75 },
    'Mezzala': { 'Mezzala': 100, 'Meio-campista': 85, 'Meia Atacante': 80, 'Meia Itinerante': 80, 'Meia Aberto': 65 },
    'Carrilero': { 'Carrilero': 100, 'Meio-campista': 85, 'Volante Ladrão de Bolas': 80, 'Meia Box-to-Box': 75 },
    'Meia Aberto': { 'Meia Aberto': 100, 'Armador Aberto': 85, 'Ala': 75, 'Lateral': 65, 'Meia Atacante': 60 },
    'Armador Aberto': { 'Armador Aberto': 100, 'Meia Aberto': 85, 'Armador Avançado': 75, 'Meia Atacante': 70 },

    // FWD Group (incl. Attacking Mids)
    'Meia Atacante': { 'Meia Atacante': 100, 'Armador Avançado': 90, 'Atacante Sombra': 85, 'Trequartista': 80, 'Meio-campista': 80, 'Falso Nove': 75, 'Mezzala': 70 },
    'Armador Avançado': { 'Armador Avançado': 100, 'Meia Atacante': 90, 'Trequartista': 85, 'Construtor de Jogo Recuado': 70, 'Armador Aberto': 70, 'Meia Itinerante': 70 },
    'Atacante Sombra': { 'Atacante Sombra': 100, 'Meia Atacante': 85, 'Atacante Avançado': 80, 'Finalizador': 75, 'Atacante': 70 },
    'Trequartista': { 'Trequartista': 100, 'Armador Avançado': 85, 'Falso Nove': 80, 'Atacante Recuado': 75, 'Meia Atacante': 80 },
    'Falso Nove': { 'Falso Nove': 100, 'Atacante Recuado': 85, 'Trequartista': 80, 'Meia Atacante': 75, 'Atacante': 70 },
    'Atacante': { 'Atacante': 100, 'Atacante Avançado': 90, 'Atacante Completo': 90, 'Finalizador': 85, 'Atacante Recuado': 85 },
    'Atacante Avançado': { 'Atacante Avançado': 100, 'Atacante': 90, 'Finalizador': 85, 'Atacante Sombra': 75 },
    'Atacante Completo': { 'Atacante Completo': 100, 'Atacante': 90, 'Atacante Recuado': 85, 'Atacante Avançado': 80 },
    'Finalizador': { 'Finalizador': 100, 'Atacante': 85, 'Atacante Avançado': 85, 'Atacante Sombra': 70 },
    'Atacante Recuado': { 'Atacante Recuado': 100, 'Atacante': 85, 'Falso Nove': 85, 'Atacante Completo': 80, 'Trequartista': 70 },
};

const generateFamiliarity = (naturalRole: PlayerRole): Record<PlayerRole, number> => {
    const familiarity: Partial<Record<PlayerRole, number>> = {};
    for (const role of ALL_ROLES) {
        familiarity[role] = FAMILIARITY_MAP[naturalRole]?.[role] || 20; // Base familiarity is 20
    }
    return familiarity as Record<PlayerRole, number>;
};

export const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

const generatePlayerAttributes = (isYouth: boolean = false): PlayerAttributes => ({
    passing: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    dribbling: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    shooting: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    tackling: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    heading: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    crossing: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    aggression: randInt(30, 90),
    creativity: randInt(isYouth ? 20 : 30, isYouth ? 55 : 90),
    positioning: randInt(isYouth ? 20 : 40, isYouth ? 55 : 90),
    teamwork: randInt(isYouth ? 20 : 50, isYouth ? 60 : 95),
    workRate: randInt(isYouth ? 20 : 40, isYouth ? 60 : 95),
    pace: randInt(isYouth ? 30 : 50, isYouth ? 70 : 95),
    stamina: randInt(isYouth ? 30 : 50, isYouth ? 70 : 95),
    strength: randInt(isYouth ? 25 : 50, isYouth ? 65 : 95),
    naturalFitness: randInt(30, 95),
});

const calculateMarketValue = (player: Omit<Player, 'marketValue' | 'id' | 'clubId' | 'contractExpires' | 'history' | 'morale' | 'satisfaction' | 'matchFitness' | 'injury' | 'suspension' | 'seasonYellowCards' | 'individualTrainingFocus' | 'scoutedAttributes' | 'scoutedPotentialRange' | 'lastRenewalDate' | 'interactions' | 'attributeChanges' | 'concern'>): number => {
    const avgAttr = Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.values(player.attributes).length;
    let value = (avgAttr * 20000) + (player.potential * 15000);
    if (player.age < 22) value *= 1.5;
    if (player.age > 32) value *= 0.5;
    return Math.round(value / 1000) * 1000;
};

const defaultInstructions: PlayerInstructions = {
    shooting: ShootingInstruction.Normal,
    passing: PassingInstruction.Normal,
    dribbling: DribblingInstruction.Normal,
    crossing: CrossingInstruction.Normal,
    positioning: PositioningInstruction.Normal,
    tackling: TacklingInstruction.Normal,
    pressing: PressingInstruction.Normal,
    marking: MarkingInstruction.Normal,
};

// FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
const defaultPositions442: { position: { x: number, y: number }, role: PlayerRole }[] = [
    { position: { x: 50, y: 95 }, role: 'Goleiro' },
    { position: { x: 20, y: 75 }, role: 'Lateral' },
    { position: { x: 40, y: 78 }, role: 'Zagueiro' },
    { position: { x: 60, y: 78 }, role: 'Zagueiro' },
    { position: { x: 80, y: 75 }, role: 'Lateral' },
    { position: { x: 20, y: 50 }, role: 'Meia Aberto' },
    { position: { x: 40, y: 55 }, role: 'Meio-campista' },
    { position: { x: 60, y: 55 }, role: 'Meio-campista' },
    { position: { x: 80, y: 50 }, role: 'Meia Aberto' },
    { position: { x: 40, y: 25 }, role: 'Atacante' },
    { position: { x: 60, y: 25 }, role: 'Atacante' },
];

const generateStaffAttributes = (role: StaffRole): StaffAttributes => {
    switch (role) {
        case StaffRole.AssistantManager:
            return {
                tacticalKnowledge: randInt(50, 95),
                judgingPlayerAbility: randInt(50, 95),
                manManagement: randInt(50, 95),
            } as AssistantManagerAttributes;
        case StaffRole.HeadOfScouting:
            return {
                judgingPlayerAbility: randInt(50, 95),
                judgingPlayerPotential: randInt(50, 95),
                reach: randInt(1, 20),
            } as HeadOfScoutingAttributes;
        case StaffRole.HeadOfPhysiotherapy:
            return {
                physiotherapy: randInt(50, 95),
                injuryPrevention: randInt(50, 95),
                sportsScience: randInt(50, 95),
            } as HeadOfPhysiotherapyAttributes;
        case StaffRole.HeadOfPerformance:
            return {
                fitnessCoaching: randInt(50, 95),
                loadManagement: randInt(50, 95),
            } as HeadOfPerformanceAttributes;
        case StaffRole.Coach:
            return {
                attacking: randInt(40, 90),
                defending: randInt(40, 90),
                possession: randInt(40, 90),
                fitness: randInt(40, 90),
                goalkeeping: randInt(40, 90),
                workingWithYoungsters: randInt(40, 90),
            } as CoachingAttributes;
    }
};

export const generateScheduleForCompetition = (clubsInCompetition: Club[], startDate: Date): Match[] => {
    const schedule: Match[] = [];
    let matchIdCounter = Date.now(); // Use timestamp to ensure unique IDs across seasons
    let currentDate = new Date(startDate);
    
    const clubIds: (number | null)[] = clubsInCompetition.map(c => c.id);

    if (clubIds.length % 2 !== 0) {
        clubIds.push(null); // Add a 'bye' team if odd number
    }
    
    const numTeams = clubIds.length;
    const numRounds = numTeams - 1;

    const rounds: { home: number; away: number }[][] = [];
    for (let round = 0; round < numRounds; round++) {
        const roundMatches: { home: number; away: number }[] = [];
        for (let i = 0; i < numTeams / 2; i++) {
            const home = clubIds[i];
            const away = clubIds[numTeams - 1 - i];

            if (home && away) {
                roundMatches.push({ home, away });
            }
        }
        rounds.push(roundMatches);

        // Rotate teams, keeping the first one fixed
        const lastTeam = clubIds.pop();
        if (lastTeam !== undefined) {
             clubIds.splice(1, 0, lastTeam);
        }
    }

    // Create first half of the season
    for (const roundMatches of rounds) {
        for (const match of roundMatches) {
             schedule.push({
                id: matchIdCounter++,
                homeTeamId: match.home,
                awayTeamId: match.away,
                date: new Date(currentDate),
            });
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }

    // Create second half of the season (reverse fixtures)
     for (const roundMatches of rounds) {
        for (const match of roundMatches) {
             schedule.push({
                id: matchIdCounter++,
                homeTeamId: match.away, // Reversed
                awayTeamId: match.home, // Reversed
                date: new Date(currentDate),
            });
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }
    
    schedule.sort((a,b) => a.date.getTime() - b.date.getTime());
    return schedule;
};

const getOverallRatingForDB = (attrs: PlayerAttributes): number => {
    const keyAttrs = attrs.shooting + attrs.passing + attrs.tackling + attrs.dribbling + attrs.pace + attrs.positioning + attrs.workRate + attrs.creativity + attrs.stamina;
    return keyAttrs / 9;
};

// FIX: Removed 'pressConference' from the Omit<> type as it is no longer part of the GameState.
export const generateInitialDatabase = (): Omit<GameState, 'playerClubId' | 'currentDate' | 'liveMatch' | 'news' | 'nextNewsId' | 'matchDayFixtures' | 'matchDayResults' | 'matchStartError' | 'seasonReviewData' | 'transferNegotiations' | 'nextNegotiationId'> => {
    const clubs: Record<number, Club> = {};
    const players: Record<number, Player> = {};
    const staff: Record<number, Staff> = {};
    const competitions: Record<number, Competition> = {};
    const leagueTable: LeagueEntry[] = [];
    const sponsors: Record<number, Sponsor> = {};
    const sponsorshipDeals: SponsorshipDeal[] = [];
    const banks: Record<number, Bank> = {};
    let playerIdCounter = 1;
    let staffIdCounter = 1;
    const NUM_CLUBS = 20;
    const PLAYERS_PER_CLUB = 22;
    const NUM_STAFF_PER_ROLE = 20;

    // Create Competitions
    competitions[1] = { id: 1, name: 'Premier Division', level: 1 };
    competitions[2] = { id: 2, name: 'Championship', level: 2 };
    
    // Create Sponsors
    SPONSOR_DATA.forEach(s => sponsors[s.id] = s);

    // Create Banks
    BANK_DATA.forEach(b => banks[b.id] = b);

    // Generate Staff Pool
    const staffRolesToGenerate = [StaffRole.AssistantManager, StaffRole.HeadOfPerformance, StaffRole.HeadOfPhysiotherapy, StaffRole.HeadOfScouting, StaffRole.Coach];
    for (const role of staffRolesToGenerate) {
        for (let i = 0; i < NUM_STAFF_PER_ROLE; i++) {
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + randInt(1, 4));
            const newStaff: Staff = {
                id: staffIdCounter,
                clubId: null,
                name: `${pickRandom(STAFF_FIRST_NAMES)} ${pickRandom(STAFF_LAST_NAMES)}`,
                age: randInt(30, 65),
                nationality: pickRandom(COUNTRIES),
                role,
                wage: randInt(1000, 5000),
                contractExpires,
                attributes: generateStaffAttributes(role),
            };
            staff[staffIdCounter] = newStaff;
            staffIdCounter++;
        }
    }


    for (let i = 1; i <= NUM_CLUBS; i++) {
        const initialTactics: Tactics = {
            // FIX: Translated 'Balanced' to 'Equilibrada' to match Mentality type.
            mentality: 'Equilibrada',
            lineup: Array(11).fill(null),
            bench: Array(7).fill(null),
        };
        const competitionId = i <= 10 ? 1 : 2; // First 10 clubs in Premier Division
        const reputation = competitionId === 1 ? randInt(70, 90) : randInt(50, 69);
        const balance = randInt(5_000_000, 20_000_000);
        
        const philosophies: ClubPhilosophy[] = [];
        if (reputation > 75) {
            philosophies.push({ type: 'play_attacking_football', description: 'Play attacking, entertaining football.' });
            if (Math.random() < 0.5) {
                philosophies.push({ type: 'sign_high_reputation', description: 'Sign high-reputation players.', parameters: { minReputation: 80 } });
            }
        } else if (reputation < 65) {
            philosophies.push({ type: 'develop_youth', description: 'Develop players through the youth system.' });
            philosophies.push({ type: 'sign_young_players', description: 'Sign players aged 23 or younger for the first team.', parameters: { maxAge: 23 } });
        } else {
            if (Math.random() < 0.5) {
                philosophies.push({ type: 'play_attacking_football', description: 'Play attacking, entertaining football.' });
            }
            philosophies.push({ type: 'sign_young_players', description: 'Sign players aged 23 or younger for the first team.', parameters: { maxAge: 23 } });
        }

        const currentDate = new Date(2024, 7, 1);
        clubs[i] = {
            id: i,
            name: `${pickRandom(CITIES)} ${pickRandom(CLUB_NAMES)}`,
            country: pickRandom(COUNTRIES),
            reputation,
            balance: balance,
            transferBudget: Math.floor(balance * 0.4),
            wageBudget: 150000,
            tactics: initialTactics,
            weeklyTrainingFocus: { primary: 'Equilibrado', secondary: 'Nenhum' },
            departments: {
                [DepartmentType.Coaching]: { level: 1, chiefId: null, coachIds: [] },
                [DepartmentType.Medical]: { level: 1, chiefId: null },
                [DepartmentType.Scouting]: { level: 1, chiefId: null },
                [DepartmentType.Performance]: { level: 1, chiefId: null },
            },
            competitionId,
            managerConfidence: 100,
            boardObjective: null,
            philosophies,
            creditScore: 50,
            loanHistory: [],
            boardRequestCooldowns: {},
            requestsThisMonth: { month: currentDate.getMonth(), year: currentDate.getFullYear(), count: 0 },
            // FIX: Added missing teamCohesion and lastLineup properties to Club object.
            teamCohesion: 50,
            lastLineup: [],
        };

        if (competitionId === 1) {
            leagueTable.push({
                clubId: i, played: 0, wins: 0, draws: 0, losses: 0, 
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
            });
        }
    }

    // Assign Sponsorship Deals
    Object.values(clubs).forEach(club => {
        const availableSponsors = Object.values(sponsors);
        
        // FIX: Translated Sponsor types from English to Portuguese.
        const findSponsor = (type: 'Camisa Principal' | 'Fornecedor de Material' | 'Direitos do Estádio') => {
            const candidates = availableSponsors.filter(s => {
                if (s.preferredType !== type) return false;
                // Check if already taken
                if (sponsorshipDeals.some(d => d.sponsorId === s.id && d.type === type)) return false;

                const rep = club.reputation;
                return s.guidelines.every(g => {
                    if (g.type === 'min_reputation') return rep >= g.value;
                    if (g.type === 'max_reputation') return rep <= g.value;
                    if (g.type === 'country') return club.country === g.value;
                    return true;
                });
            });
            return pickRandom(candidates);
        };

        const createDeal = (sponsor: Sponsor) => {
            const repModifier = (club.reputation - 50) / 50; // -1 to 1 based on 0-100 rep
            const valueRange = sponsor.baseAnnualValue[1] - sponsor.baseAnnualValue[0];
            const value = sponsor.baseAnnualValue[0] + valueRange * Math.max(0, Math.min(1, 0.5 + repModifier / 2));
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + randInt(2, 5));
            sponsorshipDeals.push({
                sponsorId: sponsor.id,
                clubId: club.id,
                type: sponsor.preferredType,
                annualValue: Math.round(value / 1000) * 1000,
                expires,
            });
        };

        // FIX: Translated Sponsor types from English to Portuguese.
        const shirtSponsor = findSponsor('Camisa Principal');
        if (shirtSponsor) createDeal(shirtSponsor);

        const kitSponsor = findSponsor('Fornecedor de Material');
        if (kitSponsor) createDeal(kitSponsor);

        if (club.reputation > 65) {
            const stadiumSponsor = findSponsor('Direitos do Estádio');
            if (stadiumSponsor) createDeal(stadiumSponsor);
        }
    });


    // Assign staff chiefs to AI clubs
    const availableStaff = (role: StaffRole) => Object.values(staff).find(s => s.role === role && s.clubId === null);
    for (let clubId = 1; clubId <= NUM_CLUBS; clubId++) {
        const club = clubs[clubId];
        const hireStaff = (role: StaffRole, department: DepartmentType) => {
            const staffToHire = availableStaff(role);
            if (staffToHire) {
                club.departments[department].chiefId = staffToHire.id;
                staffToHire.clubId = clubId;
            }
        };
        hireStaff(StaffRole.AssistantManager, DepartmentType.Coaching);
        hireStaff(StaffRole.HeadOfPhysiotherapy, DepartmentType.Medical);
        hireStaff(StaffRole.HeadOfScouting, DepartmentType.Scouting);
        hireStaff(StaffRole.HeadOfPerformance, DepartmentType.Performance);

        const coachToHire = availableStaff(StaffRole.Coach);
        if (coachToHire) {
            club.departments[DepartmentType.Coaching].coachIds = [coachToHire.id];
            coachToHire.clubId = clubId;
        }
    }

    // FIX: Translated all PlayerRoles from English to Portuguese to match the 'PlayerRole' type.
    const GK_ROLES: PlayerRole[] = ['Goleiro', 'Goleiro Líbero'];
    const DEF_ROLES: PlayerRole[] = ['Zagueiro', 'Zagueiro com Passe', 'Lateral', 'Ala'];
    const MID_ROLES: PlayerRole[] = ['Volante', 'Meio-campista', 'Volante Ladrão de Bolas', 'Meia Box-to-Box', 'Meia Aberto'];
    const FWD_ROLES: PlayerRole[] = ['Meia Atacante', 'Atacante', 'Atacante Avançado', 'Finalizador'];

    for (let clubId = 1; clubId <= NUM_CLUBS; clubId++) {
        const clubPlayers: Player[] = [];
        for (let j = 0; j < PLAYERS_PER_CLUB; j++) {
            let naturalPos: PlayerRole;
            if (j < 2) naturalPos = pickRandom(GK_ROLES);
            else if (j < 8) naturalPos = pickRandom(DEF_ROLES);
            else if (j < 16) naturalPos = pickRandom(MID_ROLES);
            else naturalPos = pickRandom(FWD_ROLES);
            
            const age = randInt(18, 35);
            const contractDuration = randInt(1, 5);
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + contractDuration);

            const partialPlayer = {
                age,
                name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
                nationality: pickRandom(COUNTRIES),
                naturalPosition: naturalPos,
                wage: randInt(500, 10000),
                attributes: generatePlayerAttributes(),
                potential: randInt(60, 100),
            };

            const player: Player = {
                ...partialPlayer,
                id: playerIdCounter,
                clubId: clubId,
                contractExpires,
                marketValue: calculateMarketValue(partialPlayer as any),
                positionalFamiliarity: generateFamiliarity(naturalPos),
                morale: randInt(75, 95),
                satisfaction: randInt(70, 90),
                matchFitness: 100,
                injury: null,
                suspension: null,
                seasonYellowCards: 0,
                history: [],
                scoutedAttributes: {},
                scoutedPotentialRange: null,
                individualTrainingFocus: null,
                squadStatus: 'Rotação' as SquadStatus, // Temporary, will be overwritten
                isTransferListed: false,
                promise: null,
                interactions: [],
                attributeChanges: [],
                concern: null,
            };
            players[playerIdCounter] = player;
            clubPlayers.push(player);
            playerIdCounter++;
        }
        
        clubPlayers.sort((a, b) => getOverallRatingForDB(b.attributes) - getOverallRatingForDB(a.attributes));
        clubPlayers.forEach((p, index) => {
            let status: SquadStatus;
            if (index < 5) status = 'Titular';
            else if (index < 11) status = 'Rodízio';
            else if (index < 17) status = 'Rotação';
            else status = 'Jovem Promessa';
            players[p.id].squadStatus = status;
        });


        // Initial Youth Intake
        const clubRep = clubs[clubId].reputation;
        for (let k = 0; k < randInt(8, 15); k++) {
            let naturalPos: PlayerRole;
            const posRoll = Math.random();
            if (posRoll < 0.1) naturalPos = pickRandom(GK_ROLES);
            else if (posRoll < 0.4) naturalPos = pickRandom(DEF_ROLES);
            else if (posRoll < 0.8) naturalPos = pickRandom(MID_ROLES);
            else naturalPos = pickRandom(FWD_ROLES);

            const age = randInt(15, 18);
            const contractExpires = new Date();
            contractExpires.setFullYear(contractExpires.getFullYear() + randInt(1, 3));
            
            const partialPlayer = {
                age,
                name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
                nationality: pickRandom(COUNTRIES),
                naturalPosition: naturalPos,
                wage: randInt(50, 250),
                attributes: generatePlayerAttributes(true),
                potential: randInt(Math.max(40, clubRep - 15), Math.min(100, clubRep + 15)),
            };

             const player: Player = {
                ...partialPlayer,
                id: playerIdCounter,
                clubId: clubId,
                contractExpires,
                marketValue: calculateMarketValue(partialPlayer as any),
                positionalFamiliarity: generateFamiliarity(naturalPos),
                morale: randInt(60, 80),
                satisfaction: randInt(70, 90),
                matchFitness: 50,
                injury: null,
                suspension: null,
                seasonYellowCards: 0,
                history: [],
                scoutedAttributes: {},
                scoutedPotentialRange: null,
                individualTrainingFocus: null,
                squadStatus: 'Base',
                isTransferListed: false,
                promise: null,
                interactions: [],
                attributeChanges: [],
                concern: null,
            };
            players[playerIdCounter] = player;
            playerIdCounter++;
        }


        const lineup: (LineupPlayer | null)[] = Array(11).fill(null);
        const assignedToLineup = new Set<number>();

        const positionsNeeded: {[key in 'GK' | 'DEF' | 'MID' | 'FWD']: number} = {'GK':1, 'DEF':4, 'MID':4, 'FWD':2};
        let lineupIndex = 0;

        for (const [pos, count] of Object.entries(positionsNeeded)) {
            const playersForPos = clubPlayers.filter(p => getRoleCategory(p.naturalPosition) === pos);
            for(let k=0; k<count && k < playersForPos.length; k++) {
                if(lineupIndex < 11) {
                    const player = playersForPos[k];
                    if (assignedToLineup.has(player.id)) continue;
                    lineup[lineupIndex] = {
                        playerId: player.id,
                        position: defaultPositions442[lineupIndex].position,
                        role: defaultPositions442[lineupIndex].role,
                        instructions: { ...defaultInstructions }
                    };
                    assignedToLineup.add(player.id);
                    lineupIndex++;
                }
            }
        }
        clubs[clubId].tactics.lineup = lineup;

        const benchPlayers = clubPlayers.filter(p => !assignedToLineup.has(p.id));
        const bench: (number | null)[] = Array(7).fill(null);
        for(let i=0; i<7 && i < benchPlayers.length; i++) {
            bench[i] = benchPlayers[i].id;
        }
        clubs[clubId].tactics.bench = bench;
    }

    const clubsInPremierDivision = Object.values(clubs).filter(c => c.competitionId === 1);
    const startDate = new Date(2024, 7, 10); // Season starts in August
    const schedule = generateScheduleForCompetition(clubsInPremierDivision, startDate);
    
    return { clubs, players, staff, competitions, schedule, leagueTable, scoutingAssignments: [], nextScoutAssignmentId: 1, sponsors, sponsorshipDeals, banks, loans: [], nextLoanId: 1, shortlist: [] };
};