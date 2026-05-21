<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Simulated EPG — replace with real EPG source if available
$channel = $_GET["channel"] ?? "";

$programs = [
  "Telediario Matinal","Buenos Días","El Debate","Programa Especial",
  "Informativo","Tarde en Directo","Noticias","Cine del Domingo",
  "Reportajes","Documentales","El Hormiguero","Late Night",
  "Madrugada en Directo","Entretenimiento","Magacín"
];

$epg = [];

$now = new DateTime();
$startHour = (int)$now->format("H") - 3;

for($i = 0; $i < 12; $i++){
  $t = new DateTime();
  $t->setTime($startHour + $i, 0, 0);
  $end = clone $t;
  $end->setTime($startHour + $i + 1, 0, 0);

  $progIndex = (($startHour + $i + abs(crc32($channel))) % count($programs) + count($programs)) % count($programs);

  $epg[] = [
    "start"   => $t->format("H:i"),
    "end"     => $end->format("H:i"),
    "title"   => $programs[$progIndex],
    "isNow"   => ($i === 3),
  ];
}

echo json_encode($epg, JSON_UNESCAPED_UNICODE);
