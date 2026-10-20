# 聖經地理與圖片 · 講道參考

個人講道備課用的網站(React + TypeScript + Vite)。輸入一段經文,就能看到:

- **地圖路線**:3D 衛星地形,可播放、鏡頭跟隨(MapLibre GL)
- **圖片**:UBS 圖庫中與這段經文有關的照片和插圖(圖片從 UBS 的 CDN 載入)
- **動植物與器物**:三本手冊中引用這段經文的條目
- **平行經文**、**經文校勘**(HOTTP,英文)

另有圖片庫、動植物與器物瀏覽,以及**講道清單**:把要用的圖片、路線、條目加進清單,寫上重點,上台時全螢幕逐項展示(←/→ 換項,Esc 結束)。清單存在瀏覽器的 localStorage,記得用「匯出備份」。

## 開發

```
cd webapp
npm install
npm run data     # 從上層的原始資料產生 public/data/*.json(需要 python3,約 6 MB,不進版控)
npm run dev      # http://localhost:5173
npm run build    # 產生 dist/,是純靜態網站,可放在任何地方(base 為相對路徑)
```

## 資料

`scripts/build_data.py` 讀取本倉庫的 `ubs-bible-routes`、`images`、`flora-fauna-realia`、`parallel passages`、`HOTTP`,
以及 `data-src/` 下三個純文字檔(可直接編輯,再執行 `npm run data`):

| 檔案 | 內容 |
|---|---|
| `zh_names.txt` | 路線的中文名稱 |
| `route_order.txt` | 多段路線的段落順序與方向(只排了有把握的 20 條) |
| `scripture_refs.txt` | 路線對應的經文,是依路線名稱推斷的,尚未逐條校對 |

經文位置一律用 UBS 的整數 `BBBCCCVVV`(例如徒 13:5 = 44013005)。

## 授權

資料 © United Bible Societies,CC BY-SA 4.0;圖片版權屬各自的作者(見每張圖片說明)。
地圖底圖使用 Esri 衛星影像、OpenStreetMap 與 AWS Terrain Tiles,正式公開前請確認各自的使用條款。
