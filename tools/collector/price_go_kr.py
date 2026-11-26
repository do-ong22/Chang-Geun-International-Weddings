"""참가격 '중요정보 공개(예식장)' 원본 수집기.

- 14개 지역 게시판 → 게시글 → 첨부파일을 받아 원본 그대로 저장한다.
- 요청 사이 DELAY초 쉰다. 이미 받은 파일은 건너뛰므로 중간에 멈춰도 다시 돌리면 이어서 받는다.
- 결과: <out>/manifest.json (게시글·파일·해시·수집 시각), <out>/files/<region>/<boardSeq>_<fileSeq>.<ext>
"""
import hashlib, html, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")
BASE = "https://www.price.go.kr/tprice"
DELAY = 1.5
MAX_FILE = 5 * 1024 * 1024
UA = "Mozilla/5.0 (compatible; wedding-price-research)"
REGIONS = {
    "seoul-gangnam": "0090000140", "seoul-other": "0090000141", "busan": "0090000142", "incheon": "0090000143",
    "daegu": "0090000144", "daejeon": "0090000145", "jeonnam-gwangju": "0090000146", "ulsan": "0090000147",
    "gyeonggi": "0090000148", "chungcheong": "0090000149", "jeonbuk": "0090000150", "gyeongsang": "0090000151",
    "gangwon": "0090000152", "jeju": "0090000153",
}

out = sys.argv[1]
if "data" not in os.path.normpath(out).split(os.sep):
    sys.exit("출력 경로는 깃에서 빠지는 data/ 아래여야 한다 (예: data/raw/price-go-kr/YYYY-MM-DD)")
os.makedirs(out, exist_ok=True)
manifest_path = os.path.join(out, "manifest.json")
manifest = json.load(open(manifest_path, encoding="utf-8")) if os.path.exists(manifest_path) else {"posts": {}}


def save():
    tmp = manifest_path + ".tmp"
    json.dump(manifest, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, manifest_path)


def req(path, data=None, binary=False):
    time.sleep(DELAY)
    body = urllib.parse.urlencode(data).encode() if data else None
    r = urllib.request.Request(BASE + path, data=body, headers={"User-Agent": UA, "Referer": BASE + "/portal/board/boardInfoMgr.do"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(r, timeout=30) as resp:
                if binary:
                    size = int(resp.headers.get("Content-Length") or 0)
                    if size > MAX_FILE:
                        raise ValueError(f"too large: {size}")
                    blob = resp.read(MAX_FILE + 1)
                    if len(blob) > MAX_FILE:
                        raise ValueError("too large")
                    return blob, resp.headers.get("Content-Disposition", "")
                return resp.read().decode("utf-8", "replace")
        except ValueError:
            raise
        except Exception as e:  # 네트워크 오류는 잠깐 쉬고 다시
            print("  retry", attempt + 1, path, e)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("failed: " + path)


ROW = re.compile(r"fn_goReadView\('(\d+)'\);\">([^<]*)</a>(.*?)</tr>", re.S)
DATE = re.compile(r"(\d{4}-\d{2}-\d{2})")
# 첨부 목록은 JS로 그려지므로 숨은 입력값의 파일 번호를 읽는다. 파일 이름은 내려받을 때 Content-Disposition에서 얻는다.
FILE = re.compile(r'name="fileRgtnSeq"[^>]*value="(\d+)"')
DISPO = re.compile(r'filename="?([^";]+)"?')

# 1) 게시글 목록
for region, code in REGIONS.items():
    page = 1
    while True:
        text = req("/portal/board/boardInfoMgr.do", {"boardTypeCode": code, "pageNo": page, "orderColumn": "INPUT_DTTM", "order": "DESC"})
        rows = ROW.findall(text)
        if not rows:
            break
        new = 0
        for seq, title, rest in rows:
            if seq not in manifest["posts"]:
                new += 1
                d = DATE.search(rest)
                manifest["posts"][seq] = {"region": region, "boardTypeCode": code, "title": html.unescape(title).strip(), "postedAt": d.group(1) if d else None, "files": []}
        print(f"{region} p{page}: {len(rows)} rows, {new} new")
        save()
        if len(rows) < 10:
            break
        page += 1

# 2) 게시글 상세 → 첨부파일 목록, 3) 파일 받기
for seq, post in manifest["posts"].items():
    if not post.get("detailFetched"):
        text = req("/portal/board/boardInfoDetail.do", {"boardTypeCode": post["boardTypeCode"], "boardSeq": seq, "actionType": "read", "pageNo": 1, "orderColumn": "INPUT_DTTM", "order": "DESC"})
        post["files"] = [{"fileSeq": f, "name": None} for f in dict.fromkeys(FILE.findall(text))]
        post["detailFetched"] = True
        save()
    for f in post["files"]:
        if f.get("sha256"):
            continue
        try:
            blob, dispo = req(f"/common/file/file_down.do?fileRgtnSeq={f['fileSeq']}", binary=True)
        except ValueError as e:
            f["error"] = str(e)
            save()
            continue
        if blob[:1] == b"<":  # 200으로 온 HTML 오류 페이지는 파일로 저장하지 않는다
            f["error"] = "html instead of file"
            save()
            continue
        m = DISPO.search(dispo)
        name = m.group(1) if m else ""
        try:
            name = name.encode("latin-1").decode("utf-8")  # 서버가 UTF-8 바이트를 그대로 보낸 경우
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        f["name"] = name or None
        ext = os.path.splitext(name)[1].lower()
        if not re.fullmatch(r"\.[a-z0-9]{1,5}", ext):  # 서버가 준 이름은 믿지 않는다(ADS·금지 문자)
            ext = ".bin"
        rel = os.path.join("files", post["region"], f"{seq}_{f['fileSeq']}{ext}")
        path = os.path.join(out, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "wb").write(blob)
        f.update(path=rel.replace("\\", "/"), bytes=len(blob), sha256=hashlib.sha256(blob).hexdigest(), fetchedAt=datetime.now(timezone.utc).isoformat())
        print(f"  {post['region']} {post['title']} -> {f['name']} ({len(blob)}B)")
        save()

posts = manifest["posts"].values()
print("DONE posts", len(manifest["posts"]), "files", sum(len(p["files"]) for p in posts), "downloaded", sum(1 for p in posts for f in p["files"] if f.get("sha256")))
