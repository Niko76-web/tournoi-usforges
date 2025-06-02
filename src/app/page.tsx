'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const teams = {
  U11: ["U11 Forges", "U11 Aumale", "U11 Londinières", "U11 Grandvilliers"],
  U13: ["U13 Forges", "U13 Aumale", "U13 Londinières", "U13 Gournay"],
};

type Category = keyof typeof teams;

type Match = {
  equipe1: string;
  equipe2: string;
  score1: number | null;
  score2: number | null;
  categorie: Category;
};

export default function TournamentApp() {
  const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data: Match[] = await res.json();
      const scoresByCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
      data.forEach((match) => {
        scoresByCat[match.categorie].push(match);
      });
      setScores(scoresByCat);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateScore = async (category: Category, index: number, team: "score1" | "score2", value: string) => {
    const updated = [...scores[category]];
    updated[index][team] = parseInt(value, 10);
    setScores({ ...scores, [category]: updated });

    const match = updated[index];
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
  };

  const generateMatches = async () => {
    for (const category of Object.keys(teams) as Category[]) {
      const list = teams[category];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          try {
            const response = await fetch("/api/scores", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                categorie: category,
                equipe1: list[i],
                equipe2: list[j],
                score1: null,
                score2: null,
              }),
            });

            if (!response.ok) {
              const err = await response.text();
              console.error("Erreur de réponse API:", err);
            }
          } catch (error) {
            console.error("Erreur de requête fetch:", error);
          }
        }
      }
    }
    alert("Les matchs ont été générés avec succès !");
    await fetchData();
  };

  const clearDatabase = async () => {
    const confirmation = confirm("Voulez-vous vraiment supprimer tous les matchs ? Cette action est irréversible.");
    if (!confirmation) return;

    await fetch("/api/scores", {
      method: "DELETE",
    });
    alert("La base de données a été vidée.");
    await fetchData();
  };

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
      <h1 className="text-2xl font-bold mb-4">Tournoi de Handball - U11 & U13</h1>
      <div className="flex gap-4 mb-4">
        <Button onClick={generateMatches}>🆕 Générer les matchs</Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={clearDatabase}>🗑️ Vider la base de données</Button>
      </div>
      <Tabs defaultValue="U11" className="w-full">
        <TabsList>
          <TabsTrigger value="U11">Catégorie U11</TabsTrigger>
          <TabsTrigger value="U13">Catégorie U13</TabsTrigger>
        </TabsList>
        {(Object.keys(teams) as Category[]).map((category) => (
          <TabsContent key={category} value={category}>
            <div className="mb-4">
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
                    <Input
                      type="number"
                      className="w-16"
                      value={match.score1 ?? ""}
                      onChange={(e) => updateScore(category, index, "score1", e.target.value)}
                    />
                    <span>vs</span>
                    <Input
                      type="number"
                      className="w-16"
                      value={match.score2 ?? ""}
                      onChange={(e) => updateScore(category, index, "score2", e.target.value)}
                    />
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
