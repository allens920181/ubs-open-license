import json,math
G={'Antioch(Syr)':(36.20,36.16),'Seleucia':(36.12,35.93),'Salamis':(35.18,33.90),'Paphos':(34.76,32.41),'Perga':(36.96,30.85),'Antioch(Pis)':(38.30,31.19),'Iconium':(37.87,32.49),'Lystra':(37.58,32.45),'Derbe':(37.35,33.35),'Attalia':(36.89,30.70),'Tarsus':(36.92,34.89),'Troas':(39.76,26.18),'Neapolis':(40.94,24.40),'Philippi':(41.01,24.28),'Thessalonica':(40.64,22.94),'Berea':(40.52,22.20),'Athens':(37.97,23.72),'Corinth':(37.91,22.88),'Ephesus':(37.94,27.34),'Caesarea':(32.50,34.89),'Jerusalem':(31.78,35.23),'Miletus':(37.53,27.28),'Tyre':(33.27,35.20),'Ptolemais':(32.92,35.08),'Rhodes':(36.43,28.22),'Patara':(36.26,29.32),'Cenchreae':(37.88,22.99),'Samothrace':(40.5,25.5),'Rome':(41.9,12.5),'Malta':(35.9,14.4),'Syracuse':(37.07,15.29),'Puteoli':(40.82,14.12),'Myra':(36.26,29.98),'FairHavens':(34.93,24.80),'Sidon':(33.56,35.37),'Assos':(39.49,26.34),'Joppa':(32.05,34.75),'Damascus':(33.51,36.29),'Cilicia-gates':(37.3,34.8),'Galatia?':(39.9,32.8),'Nazareth':(32.70,35.30),'Bethlehem':(31.70,35.20),'Egypt-Cairo':(30.0,31.2),'Hebron':(31.53,35.10),'Nineveh':(36.36,43.15),'Babylon':(32.54,44.42),'Samaria':(32.28,35.19),'Gaza':(31.5,34.47)}
def near(p):
    n=min(G,key=lambda k:math.hypot(G[k][0]-p[0],G[k][1]-p[1])); return f"{n}({math.hypot(G[n][0]-p[0],G[n][1]-p[1]):.1f})"
d=json.loads(open('routes.js').read()[len('window.ROUTES = '):-2])
import sys
for r in d:
    if f"{r['num']}|{r['zh']}" in sys.argv[1:] or str(r['num']) in sys.argv[1:]:
        print(r['num'],r['zh'])
        for i,s in enumerate(r['lines']): print('  ',i,len(s),near(s[0]),'->',near(s[-1]))
