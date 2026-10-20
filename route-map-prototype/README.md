# 聖經路線地圖原型

以 `ubs-bible-routes/GeoJsonRoutes` 的資料做成的地圖頁面,純靜態,不需要建置工具。

| 頁面 | 說明 |
|---|---|
| `index.html` | 2D(Leaflet):箭頭、編號、播放。 |
| `map3d.html` | 3D(MapLibre GL):衛星底圖、地形、鏡頭跟隨播放。 |
| `cesium.html` | 3D 地球(CesiumJS):經文搜尋、播放。要真實地形需要 [Cesium ion 金鑰](https://ion.cesium.com/tokens),可用網址 `?token=...` 或貼在頁面上。 |

```
python3 -m http.server 8000   # 在本目錄,再開 http://localhost:8000
python3 build_routes.py       # 修改下列資料檔後重新產生 routes.js
```

資料檔(都是「檔名|內容」的純文字,可直接編輯):

- `zh_names.txt`:中文路線名稱。
- `route_order.txt`:多段路線的段落順序與方向。
- `scripture_refs.txt`:路線對應的經文(USFM 書卷三碼,如 `ACT 13:1-14:28`)。經文是依路線名稱推斷的,尚未逐條校對。

`refs.js` 負責經文的解析與搜尋(支援「徒 13」「Acts 13:5」「創世記22:1-19」等寫法)。
