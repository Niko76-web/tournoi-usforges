'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Configuration
const matinTeams = {
  U11: ["Forges 1", "Forges 2", "Foucarmont 1", "Foucarmont 2"],
  U13: ["Forges 1", "Forges 2", "Gournay 1", "Gournay 2"],
};
const apremTeams = {
  U11: ["Forges", "Foucarmont"],
  U13: ["Forges", "Gournay"],
};
type Category = "U11" | "U13";
type Phase = "matin" | "apresmidi";
type Match = {
  id?: number;
  categorie: Category;
  equipe1: string;
  equipe2: string;
  phase: Phase;
  terrain?: number | null;
  heure?: string | null;
  score1?: number | null;
  score2?: number | null;
};

const getLogoSrc = (teamName: string) => {
    // "Forges 1" -> "forges.png" (logo principal du club)
    // Si tu veux différencier les 1/2, ajoute une condition ici
    const parts = teamName.split(" ");
    const club = parts[0].toLowerCase();
    return `/logos/${club}.png`; 
}

export default function PublicPage() {
  const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });
  const [activeTab, setActiveTab] = useState<Category>("U11");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data = await res.json();
      const byCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
      data.forEach((m: Match) => {
        byCat[m.categorie].push(m);
      });
      setScores(byCat);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // CLASSEMENT simple : 3 pts victoire, 2 pts nul, 1 pt défaite (phase matin)
  const calculateRanking = (matches: Match[], cat: Category) => {
    // Matin uniquement
    const teams = matinTeams[cat];
    const points: { [team: string]: { pts: number; played: number; diff: number } } = {};
    teams.forEach((t) => (points[t] = { pts: 0, played: 0, diff: 0 }));
    matches.filter(m => m.phase === "matin").forEach(m => {
      if (m.score1 == null || m.score2 == null) return;
      points[m.equipe1].played++;
      points[m.equipe2].played++;
      points[m.equipe1].diff += (m.score1 ?? 0) - (m.score2 ?? 0);
      points[m.equipe2].diff += (m.score2 ?? 0) - (m.score1 ?? 0);
      if (m.score1 > m.score2) {
        points[m.equipe1].pts += 3;
        points[m.equipe2].pts += 1;
      } else if (m.score1 < m.score2) {
        points[m.equipe1].pts += 1;
        points[m.equipe2].pts += 3;
      } else {
        points[m.equipe1].pts += 2;
        points[m.equipe2].pts += 2;
      }
    });
    // Classement : points desc, diff desc
    return Object.entries(points).sort((a, b) =>
      b[1].pts !== a[1].pts ? b[1].pts - a[1].pts : b[1].diff - a[1].diff
    );
  };

  // Responsive logo club
  const LogoUSForges = () => (
    <img
      src="/logos/forges.png"
      alt="US Forges"
      className="object-contain"
      style={{
        width: "88px",
        height: "auto",
        maxHeight: 80,
        marginLeft: 24,
        alignSelf: "flex-end",
      }}
      // Responsive : plus petit en dessous de 600px
      sizes="(max-width: 600px) 52px, 88px"
    />
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeTab === "U11" ? "bg-blue-100" : "bg-green-100"}`}>
      <div className="w-full max-w-2xl mx-auto px-2 sm:px-8 py-6">
        {/* Titre et logo club */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold">Résultats en direct</h1>
            <p className="mt-2 text-lg">Bienvenue au premier tournoi de l'US Forges-les-Eaux !!!</p>
          </div>
          <div className="flex-shrink-0">
            <LogoUSForges />
          </div>
        </div>
        <Tabs defaultValue="U11" className="w-full" onValueChange={v => setActiveTab(v as Category)}>
          <TabsList>
            <TabsTrigger value="U11">Catégorie U11</TabsTrigger>
            <TabsTrigger value="U13">Catégorie U13</TabsTrigger>
          </TabsList>
          {(Object.keys(matinTeams) as Category[]).map((category) => {
            const allMatches = scores[category];
            const matin = allMatches.filter(m => m.phase === "matin");
            const aprem = allMatches.filter(m => m.phase === "apresmidi");
            return (
              <TabsContent key={category} value={category}>
                {/* CLASSEMENT */}
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
                      {calculateRanking(allMatches, category).map(([team, stats]) => (
                        <tr key={team} className="border-t">
                          <td className="flex items-center gap-2">
                            <img src={getLogoSrc(team)} alt={team} className="w-6 h-6 object-contain" />
                            <span>{team}</span>
                          </td>
                          <td className="text-center">{stats.pts}</td>
                          <td className="text-center">{stats.played}</td>
                          <td className="text-center">{stats.diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MATCHS DU MATIN */}
                <div className="mb-8">
                  <h3 className="text-base font-bold text-gray-700 mb-2">Matchs du matin (Hand à 4 sur 2 terrains)</h3>
                  <div className="grid gap-4">
                    {matin.map((match, idx) => (
                      <Card key={match.id ?? idx} className="w-full" >
                        <CardContent className="w-full flex flex-col sm:flex-row items-center justify-between p-4 gap-2 sm:gap-4 overflow-x-auto">
                          <div className="flex flex-col text-xs text-gray-500 w-full sm:w-auto mb-2 sm:mb-0">
                            <span>
                              🕒 {match.heure} {match.terrain ? `(Terrain ${match.terrain})` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-7 h-7 object-contain" />
                            <span className="text-sm">{match.equipe1}</span>
                          </div>
                          <span className="w-8 text-center text-base font-bold">{match.score1 ?? "-"}</span>
                          <span>vs</span>
                          <span className="w-8 text-center text-base font-bold">{match.score2 ?? "-"}</span>
                          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                            <span className="text-sm">{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-7 h-7 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                {/* SÉPARATION VISUELLE */}
                <div className="text-center my-8">
                  <hr className="border-t-2 border-gray-400 mb-3" />
                  <span className="inline-block bg-white px-4 py-1 rounded font-semibold text-gray-700 shadow-sm">Match amical équipe complète</span>
                </div>
                {/* MATCH APRÈS-MIDI */}
                <div className="mb-8">
                  <h3 className="text-base font-bold text-gray-700 mb-2">L'après-midi : Grand terrain</h3>
                  <div className="grid gap-4">
                    {aprem.map((match, idx) => (
                      <Card key={match.id ?? idx}>
                        <CardContent className="flex items-center justify-between p-4 gap-4">
                          <div className="flex flex-col text-xs text-gray-500">
                            <span>🕒 {match.heure}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                            <span>{match.equipe1}</span>
                          </div>
                          <span className="w-12 text-center text-lg font-bold">{match.score1 ?? "-"}</span>
                          <span>vs</span>
                          <span className="w-12 text-center text-lg font-bold">{match.score2 ?? "-"}</span>
                          <div className="flex items-center gap-2">
                            <span>{match.equipe2}</span>
                            <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
