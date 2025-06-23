export default function Head() {
  return (
    <>
      <title>Tournoi Handball US Forges</title>
      <meta name="description" content="Suivi des scores et classements en direct pour le tournoi de handball." />
      
      {/* Favicon classique */}
      <link rel="icon" href="/favicon.ico" />

      {/* Favicon moderne pour Chrome, Android */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />

      {/* Icône pour iOS si tu en veux une spécifique */}
      <link rel="apple-touch-icon" href="/favicon-192x192.png" />
    </>
  );
}
