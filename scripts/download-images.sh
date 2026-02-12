#!/bin/bash
# Downloads all driver headshots and team logos from F1's CDN to public/
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DRIVERS_DIR="$PROJ_DIR/public/drivers"
LOGOS_DIR="$PROJ_DIR/public/logos"

mkdir -p "$DRIVERS_DIR" "$LOGOS_DIR"

BASE="https://media.formula1.com/image/upload"
HEAD="c_thumb,g_face,w_440,h_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000000/common/f1/2026"
LOGO="c_fit,h_64/q_auto/v1740000000/common/f1/2026"

echo "=== Downloading driver headshots ==="

dl_driver() {
  local id="$1" team="$2" code="$3"
  echo "  $id..."
  curl -sL "$BASE/$HEAD/$team/${code}/2026${team}${code}right.webp" -o "$DRIVERS_DIR/$id.webp"
}

dl_driver verstappen redbullracing maxver01
dl_driver hadjar     redbullracing isahad01
dl_driver norris     mclaren       lannor01
dl_driver piastri    mclaren       oscpia01
dl_driver leclerc    ferrari       chalec01
dl_driver hamilton   ferrari       lewham01
dl_driver russell    mercedes      georus01
dl_driver antonelli  mercedes      andant01
dl_driver alonso     astonmartin   feralo01
dl_driver stroll     astonmartin   lanstr01
dl_driver gasly      alpine        piegas01
dl_driver colapinto  alpine        fracol01
dl_driver albon      williams      alealb01
dl_driver sainz      williams      carsai01
dl_driver lawson     racingbulls   lialaw01
dl_driver lindblad   racingbulls   arvlin01
dl_driver hulkenberg audi          nichul01
dl_driver bortoleto  audi          gabbor01
dl_driver ocon       haasf1team    estoco01
dl_driver bearman    haasf1team    olibea01
dl_driver perez      cadillac      serper01
dl_driver bottas     cadillac      valbot01

echo ""
echo "=== Downloading team logos ==="

dl_logo() {
  local id="$1" team="$2"
  echo "  $id..."
  curl -sL "$BASE/$LOGO/$team/2026${team}logowhite.webp" -o "$LOGOS_DIR/$id.webp"
}

dl_logo red-bull      redbullracing
dl_logo mclaren       mclaren
dl_logo ferrari       ferrari
dl_logo mercedes      mercedes
dl_logo aston-martin  astonmartin
dl_logo alpine        alpine
dl_logo williams      williams
dl_logo racing-bulls  racingbulls
dl_logo audi          audi
dl_logo haas          haasf1team
dl_logo cadillac      cadillac

echo ""
echo "=== Done! ==="
ls -la "$DRIVERS_DIR"
echo ""
ls -la "$LOGOS_DIR"
