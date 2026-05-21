<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: public, max-age=300");

$url = "https://www.tdtchannels.com/lists/tv.json";

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_TIMEOUT        => 10,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_USERAGENT      => "EternaTV/2.0",
]);
$response = curl_exec($ch);
$error    = curl_error($ch);
curl_close($ch);

if($error || !$response){
  http_response_code(503);
  echo json_encode(["error" => "No se pudo obtener la lista de canales"]);
  exit;
}

$data = json_decode($response, true);

if(json_last_error() !== JSON_ERROR_NONE){
  http_response_code(500);
  echo json_encode(["error" => "Formato de datos inválido"]);
  exit;
}

$out = [];

foreach(($data["countries"] ?? []) as $country){
  $countryName = $country["name"] ?? "";

  foreach(($country["ambits"] ?? []) as $ambit){
    $region = $ambit["name"] ?? "";

    foreach(($ambit["channels"] ?? []) as $channel){

      // Streams válidos
      $streams = [];
      foreach(($channel["options"] ?? []) as $option){
        if(!empty($option["url"])){
          $streams[] = $option["url"];
        }
      }
      if(!$streams) continue;

      // Inferir categoría
      $name = strtolower($channel["name"] ?? "");
      $cat  = "entretenimiento";

      if(str_contains($name,"noticias") || str_contains($name,"24h") || str_contains($name,"news")){
        $cat = "noticias";
      }
      elseif(str_contains($name,"sport") || str_contains($name,"deporte") || str_contains($name,"gol")){
        $cat = "deportes";
      }
      elseif(str_contains($name,"clan") || str_contains($name,"disney") || str_contains($name,"cartoon")){
        $cat = "infantil";
      }
      // ✔️ REGLA CORRECTA: nacionales = country = Spain
      elseif($countryName === "Spain"){
        $cat = "nacional";
      }
      else {
        $cat = "autonómica";
      }

      $out[] = [
        "name"     => $channel["name"] ?? "Canal",
        "logo"     => $channel["logo"] ?? "",
        "region"   => $region,
        "country"  => $countryName,
        "category" => $cat,
        "streams"  => $streams,
      ];
    }
  }
}

// Ordenar: Nacional primero
usort($out, function($a, $b){
  $pa = strtolower($a["category"]) === "nacional" ? 0 : 1;
  $pb = strtolower($b["category"]) === "nacional" ? 0 : 1;
  if($pa !== $pb) return $pa - $pb;
  return strcasecmp($a["name"], $b["name"]);
});

echo json_encode($out, JSON_UNESCAPED_UNICODE);
