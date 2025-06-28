'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Équipes matin (Hand à 4)
const matinTeams = {
  U11: ["Forges 1", "Foucarmont 1", "Forges 2", "Forges 3"],
  U13: ["Forges 1", "Gournay 1", "Forges 2", "Gournay 2"],
};
type Category = keyof typeof matinTeams;

function getLogoSrc(teamName: string) {
  // "Forges", "Foucarmont", "Gournay" --> "forges.png", etc.
  const club = teamName.replace(/[12]/g, "").trim().toLowerCase();
  return `/logos/${club}.png`;
}

export default function PublicPage() {
  const [activeTab, setActiveTab] = useState<Category>("U11");
type Category = "U11" | "U13";
type Match = {
  id?: number;
  categorie: Category;
  equipe1: string;
  equipe2: string;
  phase: string;
  heure?: string;
  score1?: number | null;
  score2?: number | null;
};

const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });

const fetchData = async () => {
  try {
    const res = await fetch("/api/scores");
    if (!res.ok) return;
    const data: Match[] = await res.json();
    const byCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
    data.forEach((match) => {
      if (match.categorie === "U11" || match.categorie === "U13") {
        byCat[match.categorie].push(match);
      }
    });
    setScores(byCat);
  } catch (error) {
    console.error("Erreur de chargement :", error);
  }
};


  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Classement pour les matchs du matin uniquement
  const calculateRanking = (matches: any[], category: Category) => {
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
        {/* Header avec logo club */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Résultats en direct</h1>
            <p className="mt-2 text-base sm:text-lg">
              Bienvenue au premier tournoi de l&#39;US Forges-les-Eaux !!!
            </p>
          </div>
          <img
            src="/logos/forges.png"
            alt="Logo US Forges"
            className="w-20 sm:w-32 h-auto object-contain ml-2"
            style={{ maxHeight: "96px" }}
          />
        </div>

        <Tabs defaultValue="U11" className="w-full" onValueChange={(val) => setActiveTab(val as Category)}>
          <TabsList>
            <TabsTrigger value="U11">Terrain 1 - U11</TabsTrigger>
            <TabsTrigger value="U13">Terrain 2 - U13</TabsTrigger>
          </TabsList>

          {(Object.keys(matinTeams) as Category[]).map((category) => (
            <TabsContent key={category} value={category}>
              {/* Classement du matin */}
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

              {/* Liste des matchs du matin */}
              <div>
                <h3 className="text-md font-semibold mt-6 mb-2">Matchs du matin</h3>
                <div className="grid gap-4">
                  {scores[category]
                    .filter((m) => m.phase === "matin")
                    .sort((a, b) => (a.heure ?? "").localeCompare(b.heure ?? ""))
                    .map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex flex-wrap md:flex-nowrap items-center justify-between p-2 sm:p-4 gap-2">
                          <div className="flex flex-col min-w-[70px]">
                            <span className="text-xs text-gray-500">
                              🕒 {match.heure}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
                            <span className="truncate max-w-[72px] sm:max-w-[160px]">{match.equipe1}</span>
                          </div>
                          <span className="font-bold text-base sm:text-lg w-10 text-center">{match.score1 ?? "-"}</span>
                          <span className="mx-1 sm:mx-2 text-base font-bold">-</span>
                          <span className="font-bold text-base sm:text-lg w-10 text-center">{match.score2 ?? "-"}</span>
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <span className="truncate max-w-[72px] sm:max-w-[160px]">{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Séparateur visuel avant le match amical */}
                <div className="text-center my-6 font-bold text-base sm:text-lg">Match amical équipe complète</div>

                {/* Matchs après-midi */}
                <div className="grid gap-4">
                  {scores[category]
                    .filter((m) => m.phase === "apresmidi")
                    .sort((a, b) => (a.heure ?? "").localeCompare(b.heure ?? ""))
                    .map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex flex-wrap md:flex-nowrap items-center justify-between p-2 sm:p-4 gap-2">
                          <div className="flex flex-col min-w-[70px]">
                            <span className="text-xs text-gray-500">
                              🕒 {match.heure}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
                            <span className="truncate max-w-[72px] sm:max-w-[160px]">{match.equipe1}</span>
                          </div>
                          <span className="font-bold text-base sm:text-lg w-10 text-center">{match.score1 ?? "-"}</span>
                          <span className="mx-1 sm:mx-2 text-base font-bold">-</span>
                          <span className="font-bold text-base sm:text-lg w-10 text-center">{match.score2 ?? "-"}</span>
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <span className="truncate max-w-[72px] sm:max-w-[160px]">{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
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
