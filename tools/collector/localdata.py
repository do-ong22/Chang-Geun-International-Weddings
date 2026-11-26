"""행안부 인허가(일반음식점) API에서 예식장 후보를 키워드로 모아 원본 JSON을 페이지 단위로 저장한다.

- 키는 .env.collector의 DATA_GO_KR_KEY(인코딩/디코딩 둘 다 허용). 키는 출력·저장하지 않는다.
- 이미 받은 페이지는 건너뛴다. 결과: <out>/<service>/<keyword>/p0001.json
"""
import json, os, sys, time, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
out = sys.argv[1]
if "data" not in os.path.normpath(out).split(os.sep):
    sys.exit("출력 경로는 깃에서 빠지는 data/ 아래여야 한다 (예: data/raw/localdata/YYYY-MM-DD)")
KEYWORDS = ["웨딩", "예식", "컨벤션", "채플", "결혼"]
SERVICES = ["general_restaurants"]
DELAY = 5.0
# 하루 요청 상한. 개발 계정 한도(10,000)의 10%만 쓴다. 넘으면 멈추고 다음 날 다시 돌리면 이어서 받는다.
DAILY_CAP = 1000
key = urllib.parse.unquote(next(l.split("=", 1)[1].strip() for l in open(".env.collector", encoding="utf-8") if l.startswith("DATA_GO_KR_KEY=")))


from datetime import date
counter_path = os.path.join(out, f"requests-{date.today().isoformat()}.txt")
os.makedirs(out, exist_ok=True)


def count_request():
    n = int(open(counter_path).read()) if os.path.exists(counter_path) else 0
    if n >= DAILY_CAP:
        print(f"STOP: 오늘 요청 {n}회, 상한 {DAILY_CAP}. 내일 다시 실행하면 이어서 받는다.")
        sys.exit(0)
    open(counter_path, "w").write(str(n + 1))


def fetch(svc, kw, page):
    q = {"serviceKey": key, "pageNo": page, "numOfRows": 100, "returnType": "json", "cond[BPLC_NM::LIKE]": kw}
    url = f"https://apis.data.go.kr/1741000/{svc}/info?" + urllib.parse.urlencode(q)
    for attempt in range(4):
        time.sleep(DELAY)
        count_request()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
                j = json.loads(r.read().decode("utf-8"))
            if j["response"]["header"]["resultCode"] == "0":
                return j
            print("  api error", j["response"]["header"])
        except Exception as e:
            print("  retry", attempt + 1, svc, kw, page, type(e).__name__)
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"failed {svc} {kw} {page}")


for svc in SERVICES:
    for kw in KEYWORDS:
        d = os.path.join(out, svc, kw)
        os.makedirs(d, exist_ok=True)
        page, total = 1, None
        while total is None or (page - 1) * 100 < total:
            path = os.path.join(d, f"p{page:04d}.json")
            if os.path.exists(path):
                total = json.load(open(path, encoding="utf-8"))["response"]["body"]["totalCount"]
            else:
                j = fetch(svc, kw, page)
                total = j["response"]["body"]["totalCount"]
                tmp = path + ".tmp"
                json.dump(j, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
                os.replace(tmp, path)
            print(f"{svc} {kw} p{page} / total {total}")
            page += 1
print("DONE")
