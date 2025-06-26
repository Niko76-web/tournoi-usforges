'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const teams = {
  U11: ["Forges 1", "Forges 2", "Foucarmont 1", "Foucarmont 2"],
  U13: ["Forges 1", "Forges 2", "Gournay 1", "Gournay 2"],
};

type Category = keyof typeof teams;
type Match = {
  id?: number;
  categorie: Category;
  equipe1: string;
  equipe2: string;
  phase: string;
  terrain?: number | null;
  heure?: string | null;
  score1?: number | null;
  score2?: number | null;
};

function getLogoSrc(teamName: string) {
  // "Forges 1" => "forges.png"
  const clubName = teamName.split(" ")[0].toLowerCase();
  return `/logos/${clubName}.png`;
}

export default function PublicPage() {
  const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });
  const [activeTab, setActiveTab] = useState<Category>("U11");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data = await res.json();
      const scoresByCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
      data.forEach((match: Match) => {
        if (scoresByCat[match.categorie]) scoresByCat[match.categorie].push(match);
      });
      setScores(scoresByCat);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const calculateRanking = (matches: Match[], category: Category) => {
    const points: { [team: string]: { pts: number; played: number; goalsDiff: number } } = {};
    teams[category].forEach((team) => {
      points[team] = { pts: 0, played: 0, goalsDiff: 0 };
    });

    matches.forEach((match) => {
      if (match.score1 == null || match.score2 == null) return;
      const { equipe1, equipe2, score1, score2 } = match;
      points[equipe1].played++;
      points[equipe2].played++;
      points[equipe1].goalsDiff += (score1 ?? 0) - (score2 ?? 0);
      points[equipe2].goalsDiff += (score2 ?? 0) - (score1 ?? 0);

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

  // Séparation des matchs du matin et après-midi
  function splitMatches(matches: Match[]) {
    const matin = matches.filter((m) => m.phase === "matin");
    const apresmidi = matches.filter((m) => m.phase === "apresmidi");
    return { matin, apresmidi };
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeTab === "U11" ? "bg-blue-100" : "bg-green-100"}`}>
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-8 py-6">
        {/* En-tête + logo responsive */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">Résultats en direct</h1>
            <p className="mt-2 text-base sm:text-lg truncate">Bienvenue au premier tournoi de l'US Forges-les-Eaux !!!</p>
          </div>
          <img
            src="/logos/forges.png"
            alt="Logo US Forges"
            className="h-12 w-auto sm:h-20 flex-shrink-0 ml-2 sm:ml-6"
            style={{ maxWidth: "100px", objectFit: "contain" }}
          />
        </div>

        <Tabs defaultValue="U11" className="w-full" onValueChange={(val) => setActiveTab(val as Category)}>
          <TabsList className="w-full flex">
            <TabsTrigger value="U11" className="flex-1">Catégorie U11</TabsTrigger>
            <TabsTrigger value="U13" className="flex-1">Catégorie U13</TabsTrigger>
          </TabsList>
          {(Object.keys(teams) as Category[]).map((category) => {
            const { matin, apresmidi } = splitMatches(scores[category]);
            return (
              <TabsContent key={category} value={category} className="w-full">
                {/* Classement */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Classement</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
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
                            <td className="flex items-center gap-2 py-1">
                              <img
                                src={getLogoSrc(team)}
                                alt={team}
                                className="w-6 h-6 object-contain flex-shrink-0"
                              />
                              <span className="truncate">{team}</span>
                            </td>
                            <td className="text-center">{stats.pts}</td>
                            <td className="text-center">{stats.played}</td>
                            <td className="text-center">{stats.goalsDiff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Matchs du matin */}
                <div className="mb-8">
                  <h3 className="text-base font-bold text-gray-700 mb-2">Matchs du matin (Hand à 4 sur 2 terrains)</h3>
                  <div className="grid gap-3">
                    {matin.map((match, idx) => (
                      <Card key={match.id ?? idx} className="w-full">
                        <CardContent className="w-full flex flex-col sm:flex-row items-center justify-between p-2 sm:p-4 gap-2 sm:gap-4">
                          <div className="flex flex-col text-xs text-gray-500 w-full sm:w-auto mb-1 sm:mb-0">
                            <span>
                              🕒 {match.heure} {match.terrain ? `(Terrain ${match.terrain})` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-7 h-7 object-contain flex-shrink-0" />
                            <span className="text-xs sm:text-base truncate">{match.equipe1}</span>
                          </div>
                          <span className="w-8 text-center text-base font-bold">{match.score1 ?? "-"}</span>
                          <span>vs</span>
                          <span className="w-8 text-center text-base font-bold">{match.score2 ?? "-"}</span>
                          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end min-w-0">
                            <span className="text-xs sm:text-base truncate">{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-7 h-7 object-contain flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Match amical */}
                {apresmidi.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-gray-700 mb-2">Match amical équipe complète (après-midi)</h3>
                    <div className="grid gap-3">
                      {apresmidi.map((match, idx) => (
                        <Card key={match.id ?? idx} className="w-full">
                          <CardContent className="w-full flex flex-col sm:flex-row items-center justify-between p-2 sm:p-4 gap-2 sm:gap-4">
                            <div className="flex flex-col text-xs text-gray-500 w-full sm:w-auto mb-1 sm:mb-0">
                              <span>
                                🕒 {match.heure}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
                              <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-7 h-7 object-contain flex-shrink-0" />
                              <span className="text-xs sm:text-base truncate">{match.equipe1}</span>
                            </div>
                            <span className="w-8 text-center text-base font-bold">{match.score1 ?? "-"}</span>
                            <span>vs</span>
                            <span className="w-8 text-center text-base font-bold">{match.score2 ?? "-"}</span>
                            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end min-w-0">
                              <span className="text-xs sm:text-base truncate">{match.equipe2}</span>
                              <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-7 h-7 object-contain flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
