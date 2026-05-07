#!/bin/bash
PORT=8000
URL="http://localhost:$PORT"

echo ""
echo "🏰 던전 퀘스트 서버 시작중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 주소: $URL"
echo "🛑 종료: Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"
python3 -m http.server $PORT
