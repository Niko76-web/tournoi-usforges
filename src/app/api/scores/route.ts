import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET – Liste tous les matchs
export async function GET() {
  try {
    const matchs = await prisma.matchs.findMany();
    return NextResponse.json(matchs);
  } catch (error) {
    console.error("🔥 ERREUR GET /api/scores", error);
    return NextResponse.json({ error: "Erreur de lecture des scores" }, { status: 500 });
  }
}

// POST – Ajoute ou met à jour un match
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categorie, equipe1, equipe2, score1, score2 } = body;

    const match = await prisma.matchs.upsert({
      where: {
        // nommage automatique généré par Prisma pour une clé composite :
        categorie_equipe1_equipe2: {
          categorie,
          equipe1,
          equipe2,
        },
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

    console.log("✅ MATCH UPSERTÉ :", match);
    return NextResponse.json(match);
  } catch (error) {
    console.error("🔥 ERREUR POST /api/scores", error);
    return NextResponse.json({ error: "Erreur d'enregistrement du score." }, { status: 500 });
  }
}

// DELETE – Supprime tous les matchs
export async function DELETE() {
  try {
    await prisma.matchs.deleteMany({});
    return NextResponse.json({ message: "Tous les matchs ont été supprimés." });
  } catch (error) {
    console.error("🔥 ERREUR DELETE /api/scores", error);
    return NextResponse.json({ error: "Erreur de suppression." }, { status: 500 });
  }
}