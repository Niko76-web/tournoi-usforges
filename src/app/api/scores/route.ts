import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Récupérer tous les matchs (GET)
export async function GET() {
  try {
    console.log("API GET /api/scores appelée")

    const matchs = await prisma.matchs.findMany();
    console.log("Résultat depuis la BDD :", matchs);

    return NextResponse.json(matchs);
  } catch (error) {
    console.error("Erreur lors du GET /api/scores :", error);
    return NextResponse.json({ error: "Erreur de lecture des scores." }, { status: 500 });
  }
}

// Ajouter ou mettre à jour un score (POST)
export async function POST(req: Request) {
  const body = await req.json();
  const { categorie, equipe1, equipe2, score1, score2 } = body;

  try {
    const match = await prisma.matchs.upsert({
      where: {
        // Identification unique par couple d'équipes + catégorie
        id: await getMatchId(categorie, equipe1, equipe2),
      },
      update: {
        score1,
        score2,
      },
      create: {
        categorie,
        equipe1,
        equipe2,
        score1,
        score2,
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur d'enregistrement du score." }, { status: 500 });
  }
}

// Fonction utilitaire pour récupérer l'ID d'un match si existant
async function getMatchId(categorie: string, equipe1: string, equipe2: string) {
  const match = await prisma.matchs.findFirst({
    where: {
      categorie,
      equipe1,
      equipe2,
    },
  });
  return match?.id || 0;
}

// Fonction d'effacement de la base de données
export async function DELETE() {
  try {
    await prisma.matchs.deleteMany({});
    return NextResponse.json({ message: "Tous les matchs ont été supprimés." });
  } catch (error) {
    console.error("Erreur lors du DELETE /api/scores :", error);
    return NextResponse.json({ error: "Erreur de suppression." }, { status: 500 });
  }
}


