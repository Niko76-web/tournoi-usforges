'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const teams = {
  U11: ["U11 Forges", "U11 Aumale", "U11 Londinières", "U11 Arques"],
  U13: ["U13 Forges", "U13 Aumale", "U13 Londinières", "U13 Gournay"],
};

type Category = keyof typeof teams;

export default function PublicPage() {
  const [scores, setScores] = useState<{ [key in Category]: any[] }>({ U11: [], U13: [] });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data = await res.json();
      const scoresByCat: { [key in Category]: any[] } = { U11: [], U13: [] };
      data.forEach((match: any) => {
        scoresByCat[match.categorie as Category].push(match);
      });
      setScores(scoresByCat);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const calculateRanking = (matches: any[], category: Category) => {
    const points: { [team: string]: { pts: number; played: number; goalsDiff: number } } = {};
    teams[category].forEach((team) => {
      points[team] = { pts: 0, played: 0, goalsDiff: 0 };
    });

    matches.forEach((match) => {
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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">🏆 Résultats Tournoi de Handball</h1>
      <Tabs defaultValue="U11" className="w-full">
        <TabsList className="flex justify-center">
          <TabsTrigger value="U11">Catégorie U11</TabsTrigger>
          <TabsTrigger value="U13">Catégorie U13</TabsTrigger>
        </TabsList>
        {(Object.keys(teams) as Category[]).map((category) => (
          <TabsContent key={category} value={category}>
            <div className="mb-4 mt-4">
              <h2 className="text-lg font-semibold mb-2">Classement</h2>
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
                      <td>{team}</td>
                      <td className="text-center">{stats.pts}</td>
                      <td className="text-center">{stats.played}</td>
                      <td className="text-center">{stats.goalsDiff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4">
              {scores[category].map((match, index) => (
                <Card key={index}>
                  <CardContent className="flex items-center justify-between p-4 gap-4">
                    <span>{match.equipe1}</span>
                    <span className="text-lg font-semibold">{match.score1 ?? "-"}</span>
                    <span>vs</span>
                    <span className="text-lg font-semibold">{match.score2 ?? "-"}</span>
                    <span>{match.equipe2}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
