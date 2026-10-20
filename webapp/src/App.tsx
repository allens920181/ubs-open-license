import { HashRouter, NavLink, Route, Routes } from "react-router-dom";
import { useSermons, currentSermon } from "./lib/store";
import Home from "./pages/Home";
import ImagesPage from "./pages/ImagesPage";
import MapPage from "./pages/MapPage";
import NaturePage from "./pages/NaturePage";
import Passage from "./pages/Passage";
import People from "./pages/People";
import Sermon from "./pages/Sermon";

function Nav() {
  const n = currentSermon(useSermons()).items.length;
  return (
    <header className="topbar">
      <NavLink to="/" className="brand" end>聖經地理與圖片</NavLink>
      <nav>
        <NavLink to="/map">路線地圖</NavLink>
        <NavLink to="/images">圖片庫</NavLink>
        <NavLink to="/nature">動植物與器物</NavLink>
        <NavLink to="/people">人物</NavLink>
        <NavLink to="/sermon">講道清單{n > 0 && <span className="count">{n}</span>}</NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/passage/:code" element={<Passage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/images" element={<ImagesPage />} />
          <Route path="/nature" element={<NaturePage />} />
          <Route path="/nature/:kind" element={<NaturePage />} />
          <Route path="/nature/:kind/:key" element={<NaturePage />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<People />} />
          <Route path="/sermon" element={<Sermon />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="footer">
        資料 © United Bible Societies,<a href="http://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>。
        圖片版權屬各自的作者,詳見每張圖片的說明;人物名畫來自 <a href="https://commons.wikimedia.org/">Wikimedia Commons</a>(公有領域)。路線:Leen Ritmeyer。聖經地名座標:<a href="https://www.openbible.info/geo/">OpenBible.info</a>(<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)。
      </footer>
    </HashRouter>
  );
}
