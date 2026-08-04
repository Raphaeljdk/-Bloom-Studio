import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, ensureDemoUser } from "@/lib/auth";

/**
 * POST /api/seed
 * Cria uma história de exemplo completa com personagens, capítulos,
 * cronologia, anotações e uma conversa inicial com a Flora.
 */
export async function POST() {
  const user = await getCurrentUser();
  const owner = user ?? (await ensureDemoUser());

  // Apaga seeds antigos (apaga todas as histórias do demo)
  if (user) {
    await db.story.deleteMany({ where: { userId: owner.id } });
  } else {
    await db.story.deleteMany({ where: { userId: owner.id } });
  }

  const story = await db.story.create({
    data: {
      title: "O Jardim das Memórias Perdidas",
      description:
        "Uma botânica herda uma casa antiga no interior e descobre que o jardim revela memórias esquecidas de quem um dia viveu ali.",
      status: "IN_PROGRESS",
      genre: "Realismo mágico",
      tone: "Melancólico, contemplativo, com fulgurações de esperança",
      userId: owner.id,
    },
  });

  await db.chatSession.create({
    data: { storyId: story.id, title: "Conversa com Flora" },
  });

  // Personagens
  const helena = await db.character.create({
    data: {
      name: "Helena Vidal",
      description:
        "Botânica de 34 anos, recém-saída de um luto longo. Volta à cidade natal para lidar com a herança da tia-avó.",
      role: "Protagonista",
      traits: "Observadora, reservada, sente-se culpada por ter se afastado da família",
      storyId: story.id,
    },
  });
  await db.character.create({
    data: {
      name: "Tia Rosa",
      description:
        "Tia-avó falecida. Era herbalista e única a conhecer o segredo do jardim.",
      role: "Personagem póstuma",
      traits: "Sábia, discreta, deixou anotações cifradas em cadernos",
      storyId: story.id,
    },
  });
  await db.character.create({
    data: {
      name: "Miguel",
      description: "Vizinho cuidador da propriedade durante os últimos dez anos.",
      role: "Coadjuvante",
      traits: "Calado, leal, esconde um afeto antigo por Helena",
      storyId: story.id,
    },
  });

  // Cronologia
  const timelineEvents = [
    { title: "Morte de Tia Rosa", description: "Helena recebe a notícia e decide voltar.", date: "Outono, semana 1" },
    { title: "Chegada à casa", description: "Helena encontra o jardim estranhamente preservado.", date: "Semana 2" },
    { title: "Primeira memória", description: "Helena toca uma camélia e vê uma cena de infância que havia esquecido.", date: "Semana 3" },
    { title: "Carta de Rosa", description: "Helena encontra uma carta endereçada a ela entre os cadernos.", date: "Semana 4" },
  ];
  for (let i = 0; i < timelineEvents.length; i++) {
    await db.timelineEvent.create({
      data: { ...timelineEvents[i], order: i + 1, storyId: story.id },
    });
  }

  // Capítulos
  await db.chapter.create({
    data: {
      number: 1,
      title: "A herança",
      summary: "Helena chega à casa de Tia Rosa e percebe que o jardim está vivo demais para uma propriedade abandonada há meses.",
      content:
        "# Capítulo 1 — A herança\n\nO táxi a deixou no portão de ferro batido às quatro da tarde. Helena pagou a corrida sem tirar os olhos da fachada — a mesma de suas memórias de infância, e ao mesmo tempo outra. O reboco descascado mostrava feridas mais antigas do que ela lembrava, e a hera parecia ter avançado dez anos enquanto esteve ausente.\n\nMas foi o jardim que a fez parar. Estava vivo. Não vivo da maneira descuidada de um terreno abandonado — vivo da maneira intencional de alguém que ainda o cuidava. As camélias estavam podadas, o canteiro de lavanda rente ao chão, a roseira trepadora amarrada com fitas de ráfia.\n\n— Miguel? — chamou, meio sem fé.\n\nNinguém respondeu. Mas a porta da frente estava destrancada.\n\nHelena apertou a alça da mala e entrou.",
      status: "WRITING",
      storyId: story.id,
    },
  });
  await db.chapter.create({
    data: {
      number: 2,
      title: "A primeira camélia",
      summary: "Ao tocar uma camélia no jardim, Helena revive uma memória esquecida da infância.",
      status: "DRAFT",
      storyId: story.id,
    },
  });

  // Acontecimentos importantes (aprovados)
  await db.importantEvent.create({
    data: {
      title: "Descoberta do jardim",
      description: "Helena percebe que o jardim não é um jardim comum — ele responde a toques com memórias.",
      impact: "Estabelece a regra mágica central da narrativa",
      isApproved: true,
      suggestedBy: "USER",
      storyId: story.id,
    },
  });

  // Anotações
  await db.annotation.create({
    data: {
      content: "Investigar o símbolo de camélia como motivo recorrente — talvez cada flor revele um tipo diferente de memória?",
      category: "IDEA",
      storyId: story.id,
    },
  });
  await db.annotation.create({
    data: {
      content: "Decidir se Helena conta a alguém sobre o jardim ou guarda segredo. Inclinar para segredo cria mais tensão interna.",
      category: "DECISION",
      storyId: story.id,
    },
  });
  await db.annotation.create({
    data: {
      content: "Qual o custo emocional de reviver memórias? Pode haver um limite — usar muito o jardim deixa Helena exausta.",
      category: "QUESTION",
      storyId: story.id,
    },
  });

  // Mensagem inicial do sistema para a sessão
  await db.chatMessage.create({
    data: {
      role: "SYSTEM",
      content: "Sessão iniciada.",
      sessionId: (await db.chatSession.findFirst({ where: { storyId: story.id } }))!.id,
    },
  });

  return NextResponse.json({
    ok: true,
    storyId: story.id,
    storyTitle: story.title,
    counts: {
      characters: 3,
      chapters: 2,
      timeline: 4,
      events: 1,
      annotations: 3,
    },
  });
}
