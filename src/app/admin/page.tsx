'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Equipes du matin (poule)
const U11_MATIN = ["Forges 1", "Forges 2", "Foucarmont 1", "Foucarmont 2"];
const U13_MATIN = ["Forges 1", "Forges 2", "Gournay 1", "Gournay 2"];
const matinTeams: { [key: string]: string[] } = { U11: U11_MATIN, U13: U13_MATIN };

type Category = "U11" | "U13";
type Phase = "matin" | "apresmidi";

interface Match {
  id?: number;
  categorie: Category;
  equipe1: string;
  equipe2: string;
  phase: Phase;
  terrain?: number;
  heure?: string;
  score1?: number | null;
  score2?: number | null;
}

export default function TournamentAdmin() {
  const [activeTab, setActiveTab] = useState<Category>("U11");
  const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });

  // Récupère tous les matchs
  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data: Match[] = await res.json();
      const byCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
      data.forEach((m) => {
        byCat[m.categorie].push(m);
      });
      setScores(byCat);
    } catch (error) {
      console.error("Erreur fetch:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // À placer dans ton composant admin/page.tsx

const matinTeams: Record<Category, string[]> = {
  U11: ["Forges 1", "Forges 2", "Foucarmont 1", "Foucarmont 2"],
  U13: ["Forges 1", "Forges 2", "Gournay 1", "Gournay 2"],
};

// Génère tous les matchs selon la configuration
const generateMatches = async () => {
  // 1. Matches du matin (poule sur 2 terrains, horaires à partir de 10h00)
  let matinStart = new Date();
  matinStart.setHours(10, 0, 0, 0);
  let allMatches: any[] = [];

  // Pour chaque catégorie (U11/U13)
  (["U11", "U13"] as Category[]).forEach((cat) => {
    const teams = matinTeams[cat];
    let roundMatches: any[] = [];
    // Round Robin (toutes les rencontres possibles)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        roundMatches.push({
          categorie: cat,
          equipe1: teams[i],
          equipe2: teams[j],
          phase: "matin",
          score1: null,
          score2: null,
        });
      }
    }
    // Attribution horaires/terrains (2 terrains en parallèle)
    let slotTime = new Date(matinStart);
    for (let k = 0; k < roundMatches.length; k++) {
      // terrain alterné 1/2, 2 matchs en parallèle = même horaire
      const terrain = k % 2 === 0 ? 1 : 2;
      roundMatches[k].terrain = terrain;
      roundMatches[k].heure = `${slotTime.getHours().toString().padStart(2, "0")}h${slotTime.getMinutes().toString().padStart(2, "0")}`;
      if (terrain === 2) {
        // Après les 2 terrains, avance l'heure pour la prochaine paire
        slotTime.setMinutes(slotTime.getMinutes() + 6 + 4); // 6 min match + 4 min pause
      }
    }
    allMatches.push(...roundMatches);
  });

  // 2. Après-midi : Un seul match U11 puis U13 sur grand terrain
  allMatches.push({
    categorie: "U11",
    equipe1: "Forges",
    equipe2: "Foucarmont",
    phase: "apresmidi",
    terrain: 1,
    heure: "14h00",
    score1: null,
    score2: null,
  });
  allMatches.push({
    categorie: "U13",
    equipe1: "Forges",
    equipe2: "Gournay",
    phase: "apresmidi",
    terrain: 1,
    heure: "15h00",
    score1: null,
    score2: null,
  });

  // Vide la base d'abord pour éviter doublons
  await fetch("/api/scores", { method: "DELETE" });

  // Enregistre tous les matchs
  for (const match of allMatches) {
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
  }
  alert("Les matchs ont été générés avec horaires et terrains !");
  await fetchData();
};


  // Update d'un score
  const updateScore = async (category: Category, matchId: number, team: "score1" | "score2", value: string) => {
    const updatedMatches = scores[category].map((m) =>
    m.id === matchId ? { ...m, [team]: parseInt(value, 10) } : m
  );
  setScores({ ...scores, [category]: updatedMatches });

  const match = updatedMatches.find((m) => m.id === matchId);
  if (!match) return;

  await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(match),
    });
  };

  // Supprime tous les matchs
  const clearDatabase = async () => {
    if (!confirm("Supprimer tous les matchs ?")) return;
    await fetch("/api/scores", { method: "DELETE" });
    alert("La base de données a été vidée.");
    await fetchData();
  };

  // Calcul du classement (matin uniquement, phase de poule)
  const calculateRanking = (matches: Match[], category: Category) => {
    // Ne prend que les matchs du matin
    const poule = matches.filter((m) => m.phase === "matin");
    // Toutes les équipes du matin
    const equipes = matinTeams[category];
    const points: { [team: string]: { pts: number; played: number; goalsDiff: number } } = {};
    equipes.forEach((team) => {
      points[team] = { pts: 0, played: 0, goalsDiff: 0 };
    });

    poule.forEach((match) => {
      if (match.score1 == null || match.score2 == null) return;
      const { equipe1, equipe2, score1, score2 } = match;
      points[equipe1].played++;
      points[equipe2].played++;
      points[equipe1].goalsDiff += score1 - score2;
      points[equipe2].goalsDiff += score2 - score1;

      if (score1 > score2) {
        points[equipe1].pts += 3;
        points[equipe2].pts += 1;
      } else if (score1 < score2) {
        points[equipe1].pts += 1;
        points[equipe2].pts += 3;
      } else {
        points[equipe1].pts += 2;
        points[equipe2].pts += 2;
      }
    });

    return Object.entries(points).sort((a, b) => {
      if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
      return b[1].goalsDiff - a[1].goalsDiff;
    });
  };

  // Affichage logo équipe (si tu veux)
  const getLogoSrc = (teamName: string) => {
    // "Forges 1" -> "forges.png" (logo principal du club)
    // Si tu veux différencier les 1/2, ajoute une condition ici
    const parts = teamName.split(" ");
    const club = parts[0].toLowerCase();
    return `/logos/${club}.png`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeTab === "U11" ? "bg-blue-100" : "bg-green-100"}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Tournoi de Handball - Admin</h1>
          <div className="flex gap-2">
            <Button onClick={generateMatches}>🆕 Générer les matchs</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={clearDatabase}>
              🗑️ Vider la base de données
            </Button>
          </div>
        </div>
        <Tabs defaultValue="U11" className="w-full" onValueChange={(v) => setActiveTab(v as Category)}>
          <TabsList>
            <TabsTrigger value="U11">Catégorie U11</TabsTrigger>
            <TabsTrigger value="U13">Catégorie U13</TabsTrigger>
          </TabsList>
          {(["U11", "U13"] as Category[]).map((category) => (
            <TabsContent key={category} value={category}>
              {/* CLASSEMENT phase de poule (matin) */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Classement (poule du matin)</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Équipe</th>
                      <th>Pts</th>
                      <th>J</th>
                      <th>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateRanking(scores[category], category).map(([team, stats]) => (
                      <tr key={team} className="border-t">
                        <td className="flex items-center gap-2">
                          <img src={getLogoSrc(team)} alt={team} className="w-6 h-6 object-contain" />
                          <span>{team}</span>
                        </td>
                        <td className="text-center">{stats.pts}</td>
                        <td className="text-center">{stats.played}</td>
                        <td className="text-center">{stats.goalsDiff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* LISTE DES MATCHS */}
              {/* MATCHS DU MATIN */}
                <h3 className="text-lg font-semibold text-blue-700 mb-2 mt-4">Matin - Hand à 4</h3>
                <div className="grid gap-4 mb-6">
                  {scores[category]
                    .filter((match) => match.phase === "matin")
                    .sort((a, b) => (a.heure || "").localeCompare(b.heure || ""))
                    .map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex items-center justify-between p-4 gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">
                              🕒 {match.heure} {match.phase === "matin" ? `(Terrain ${match.terrain})` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                            <span>{match.equipe1}</span>
                          </div>
                          <Input
                            type="number"
                            className="w-16"
                            value={match.score1 ?? ""}
                            onChange={(e) => match.id !== undefined && updateScore(category, match.id, "score1", e.target.value)}
                          />
                          <span>vs</span>
                          <Input
                            type="number"
                            className="w-16"
                            value={match.score2 ?? ""}
                            onChange={(e) => match.id !== undefined && updateScore(category, match.id, "score2", e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <span>{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* SÉPARATEUR */}
                <div className="text-center text-xl font-bold text-green-700 mb-2 mt-8 border-t-2 border-green-200 pt-4">
                  Match amical équipe complète
                </div>

                {/* MATCHS DE L’APRÈS-MIDI */}
                <div className="grid gap-4">
                  {scores[category]
                    .filter((match) => match.phase === "apresmidi")
                    .sort((a, b) => (a.heure || "").localeCompare(b.heure || ""))
                    .map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex items-center justify-between p-4 gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">🕒 {match.heure}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                            <span>{match.equipe1}</span>
                          </div>
                          <Input
                            type="number"
                            className="w-16"
                            value={match.score1 ?? ""}
                            onChange={(e) => match.id !== undefined && updateScore(category, match.id, "score1", e.target.value)}
                          />
                          <span>vs</span>
                          <Input
                            type="number"
                            className="w-16"
                            value={match.score2 ?? ""}
                            onChange={(e) => match.id !== undefined && updateScore(category, match.id, "score2", e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <span>{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
