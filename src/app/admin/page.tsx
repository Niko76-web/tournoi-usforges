'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Équipes matin (divisées en 2 pour Hand à 4)
const matinTeams = {
  U11: ["Forges 1", "Forges 2", "Foucarmont 1", "Foucarmont 2"],
  U13: ["Forges 1", "Forges 2", "Gournay 1", "Gournay 2"],
};
// Équipes après-midi (équipe complète)
const apresTeams = {
  U11: ["Forges", "Foucarmont"],
  U13: ["Forges", "Gournay"],
};
type Category = keyof typeof matinTeams;
type Phase = "matin" | "apresmidi";

type Match = {
  id?: number;
  categorie: Category;
  equipe1: string;
  equipe2: string;
  phase: Phase;
  heure?: string;
  score1?: number | null;
  score2?: number | null;
};

function getLogoSrc(teamName: string) {
  // "Forges", "Foucarmont", "Gournay" --> "forges.png", etc.
  const club = teamName.replace(/[12]/g, "").trim().toLowerCase();
  return `/logos/${club}.png`;
}

function generateHorairesMatin(nbMatchs: number): string[] {
  // Premier match 10h00, 6 minutes de match, 4 minutes de pause.
  const horaires: string[] = [];
  let h = 10, m = 0;
  for (let i = 0; i < nbMatchs; i++) {
    horaires.push(`${h.toString().padStart(2, "0")}h${m.toString().padStart(2, "0")}`);
    m += 10; // 6 + 4 = 10 min
    if (m >= 60) {
      h += 1;
      m -= 60;
    }
  }
  return horaires;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Category>("U11");
  const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("isAdmin") !== "true") {
      router.push("/login");
    }
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data = await res.json();
      const byCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
      data.forEach((match: Match) => {
        byCat[match.categorie].push(match);
      });
      setScores(byCat);
    } catch (error) {
      console.error("Erreur chargement :", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    window.location.href = "/login";
  };

  // Génére tous les matchs selon la config (matin + après-midi)
  const generateMatches = async () => {
    let allMatches: Match[] = [];
    // Matin : round robin 4 équipes -> 6 matchs par catégorie
    (["U11", "U13"] as Category[]).forEach((cat) => {
      const teams = matinTeams[cat];
      const roundMatches: Match[] = [];
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          roundMatches.push({
            categorie: cat,
            equipe1: teams[i],
            equipe2: teams[j],
            phase: "matin",
          });
        }
      }
      // Attribution des horaires identiques pour les 2 catégories (matchs en parallèle)
      const horaires = generateHorairesMatin(roundMatches.length);
      roundMatches.forEach((m, idx) => { m.heure = horaires[idx]; });
      allMatches.push(...roundMatches);
    });
    // Après-midi : 1 match U11, 1 match U13
    allMatches.push({
      categorie: "U11",
      equipe1: "Forges",
      equipe2: "Foucarmont",
      phase: "apresmidi",
      heure: "14h00",
    });
    allMatches.push({
      categorie: "U13",
      equipe1: "Forges",
      equipe2: "Gournay",
      phase: "apresmidi",
      heure: "15h00",
    });
    // Vide la base
    await fetch("/api/scores", { method: "DELETE" });
    // Enregistre tous les matchs
    for (const match of allMatches) {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(match),
      });
    }
    alert("Les matchs ont été générés !");
    await fetchData();
  };

  const clearDatabase = async () => {
    const confirmation = confirm("Voulez-vous vraiment supprimer tous les matchs ? Cette action est irréversible.");
    if (!confirmation) return;
    await fetch("/api/scores", { method: "DELETE" });
    alert("Base vidée.");
    await fetchData();
  };

  const updateScore = async (category: Category, index: number, team: "score1" | "score2", value: string) => {
    const updated = [...scores[category]];
    updated[index][team] = value === "" ? null : parseInt(value, 10);
    setScores({ ...scores, [category]: updated });

    const match = updated[index];
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
  };

  // Calcul classement (matin seulement)
  const calculateRanking = (matches: Match[], category: Category) => {
    const points: { [team: string]: { pts: number; played: number; goalsDiff: number } } = {};
    matinTeams[category].forEach((team) => {
      points[team] = { pts: 0, played: 0, goalsDiff: 0 };
    });
    matches.filter((m) => m.phase === "matin").forEach((match) => {
      if (match.score1 == null || match.score2 == null) return;
      const { equipe1, equipe2, score1, score2 } = match;
      points[equipe1].played++;
      points[equipe2].played++;
      points[equipe1].goalsDiff += score1 - score2;
      points[equipe2].goalsDiff += score2 - score1;
      if (score1 > score2) {
        points[equipe1].pts += 3;
      } else if (score1 < score2) {
        points[equipe2].pts += 3;
      } else {
        points[equipe1].pts += 1;
        points[equipe2].pts += 1;
      }
    });
    return Object.entries(points).sort((a, b) =>
      b[1].pts !== a[1].pts ? b[1].pts - a[1].pts : b[1].goalsDiff - a[1].goalsDiff
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeTab === "U11" ? "bg-blue-100" : "bg-green-100"}`}>
      <div className="max-w-4xl mx-auto px-2 sm:px-6 py-8">
        {/* Entête avec logo club */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">Résultats en direct</h1>
            <p className="mt-2 text-lg">
              Bienvenue au premier tournoi de l&#39;US Forges-les-Eaux !!!
            </p>
          </div>
          <img
            src="/logos/forges.png"
            alt="Logo US Forges"
            className="w-24 h-auto sm:w-32 object-contain ml-2"
            style={{ maxHeight: "96px" }}
          />
        </div>

        {/* Boutons admin */}
        <div className="flex gap-4 mb-4">
          <Button onClick={generateMatches}>🆕 Générer les matchs</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={clearDatabase}>🗑️ Vider la base</Button>
          <Button className="bg-gray-400 hover:bg-gray-500" onClick={handleLogout}>🔒 Déconnexion</Button>
        </div>

        {/* Tabs : renommés */}
        <Tabs defaultValue="U11" className="w-full" onValueChange={(val) => setActiveTab(val as Category)}>
          <TabsList>
            <TabsTrigger value="U11">Terrain 1 - U11</TabsTrigger>
            <TabsTrigger value="U13">Terrain 2 - U13</TabsTrigger>
          </TabsList>

          {(Object.keys(matinTeams) as Category[]).map((category) => (
            <TabsContent key={category} value={category}>
              {/* Classement matin */}
              <div className="mb-4 mt-4">
                <h2 className="text-lg font-semibold mb-2">Classement du matin</h2>
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

              {/* Liste des matchs, séparé matin/après-midi */}
              <div>
                <h3 className="text-md font-semibold mt-6 mb-2">Matchs du matin</h3>
                <div className="grid gap-4">
                  {scores[category]
                    .filter((m) => m.phase === "matin")
                    .sort((a, b) => (a.heure ?? "").localeCompare(b.heure ?? ""))
                    .map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex flex-wrap md:flex-nowrap items-center justify-between p-4 gap-2">
                          <div className="flex flex-col min-w-[72px]">
                            <span className="text-xs text-gray-500">
                              🕒 {match.heure}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                            <span className="truncate max-w-[90px] sm:max-w-[160px]">{match.equipe1}</span>
                          </div>
                          <Input
                            type="number"
                            className="w-14 sm:w-16"
                            value={match.score1 ?? ""}
                            onChange={(e) => updateScore(category, idx, "score1", e.target.value)}
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            className="w-14 sm:w-16"
                            value={match.score2 ?? ""}
                            onChange={(e) => updateScore(category, idx, "score2", e.target.value)}
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate max-w-[90px] sm:max-w-[160px]">{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Séparateur amical */}
                <div className="text-center my-6 font-bold text-base">Match amical équipe complète</div>
                
                {/* Matchs après-midi */}
                <div className="grid gap-4">
                  {scores[category]
                    .filter((m) => m.phase === "apresmidi")
                    .sort((a, b) => (a.heure ?? "").localeCompare(b.heure ?? ""))
                    .map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex flex-wrap md:flex-nowrap items-center justify-between p-4 gap-2">
                          <div className="flex flex-col min-w-[72px]">
                            <span className="text-xs text-gray-500">
                              🕒 {match.heure}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                            <span className="truncate max-w-[90px] sm:max-w-[160px]">{match.equipe1}</span>
                          </div>
                          <Input
                            type="number"
                            className="w-14 sm:w-16"
                            value={match.score1 ?? ""}
                            onChange={(e) => updateScore(category, idx, "score1", e.target.value)}
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            className="w-14 sm:w-16"
                            value={match.score2 ?? ""}
                            onChange={(e) => updateScore(category, idx, "score2", e.target.value)}
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate max-w-[90px] sm:max-w-[160px]">{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
