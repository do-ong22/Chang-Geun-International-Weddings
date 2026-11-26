import sys, zipfile, re, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding="utf-8")
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
z=zipfile.ZipFile(sys.argv[1])
# 받은 파일은 신뢰할 수 없다. 압축을 푼 크기가 50MB를 넘는 항목은 읽지 않는다(zip bomb).
MAX_UNZIP=50*1024*1024
if any(i.file_size>MAX_UNZIP for i in z.infolist()):
    sys.exit('skip: uncompressed entry too large')
ss=[]
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns):
        ss.append(''.join(t.text or '' for t in si.iter('{%s}t'%ns['m'])))
sheets=[n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml',n)]
for sh in sheets:
    print('==',sh)
    for row in ET.fromstring(z.read(sh)).iter('{%s}row'%ns['m']):
        cells=[]
        for c in row.findall('m:c',ns):
            v=c.find('m:v',ns); t=c.get('t')
            is_=c.find('m:is',ns)
            val = ss[int(v.text)] if (t=='s' and v is not None) else (''.join(x.text or '' for x in is_.iter('{%s}t'%ns['m'])) if is_ is not None else (v.text if v is not None else ''))
            if val!='': cells.append(f"{c.get('r')}={val}")
        if cells: print(' | '.join(cells))
