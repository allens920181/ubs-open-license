// Scripture references: book names, parsing "ACT 13:1-14:28" style data, free-text queries and display.
(function () {
  // code, 和合本全名, 簡稱, English name, other English aliases
  const BOOKS = [
    ["GEN", "創世記", "創", "Genesis", "Gen"], ["EXO", "出埃及記", "出", "Exodus", "Exod Exo Ex"],
    ["LEV", "利未記", "利", "Leviticus", "Lev"], ["NUM", "民數記", "民", "Numbers", "Num"],
    ["DEU", "申命記", "申", "Deuteronomy", "Deut Deu Dt"], ["JOS", "約書亞記", "書", "Joshua", "Josh Jos"],
    ["JDG", "士師記", "士", "Judges", "Judg Jdg"], ["RUT", "路得記", "得", "Ruth", "Rut"],
    ["1SA", "撒母耳記上", "撒上", "1 Samuel", "1Sam 1Sa"], ["2SA", "撒母耳記下", "撒下", "2 Samuel", "2Sam 2Sa"],
    ["1KI", "列王紀上", "王上", "1 Kings", "1Kgs 1Ki"], ["2KI", "列王紀下", "王下", "2 Kings", "2Kgs 2Ki"],
    ["1CH", "歷代志上", "代上", "1 Chronicles", "1Chr 1Ch"], ["2CH", "歷代志下", "代下", "2 Chronicles", "2Chr 2Ch"],
    ["EZR", "以斯拉記", "拉", "Ezra", "Ezr"], ["NEH", "尼希米記", "尼", "Nehemiah", "Neh"],
    ["EST", "以斯帖記", "斯", "Esther", "Esth Est"], ["JOB", "約伯記", "伯", "Job", ""],
    ["PSA", "詩篇", "詩", "Psalms", "Ps Psa Psalm"], ["PRO", "箴言", "箴", "Proverbs", "Prov Pro"],
    ["ECC", "傳道書", "傳", "Ecclesiastes", "Eccl Ecc"], ["SNG", "雅歌", "歌", "Song of Solomon", "Song SoS"],
    ["ISA", "以賽亞書", "賽", "Isaiah", "Isa"], ["JER", "耶利米書", "耶", "Jeremiah", "Jer"],
    ["LAM", "耶利米哀歌", "哀", "Lamentations", "Lam"], ["EZK", "以西結書", "結", "Ezekiel", "Ezek Eze"],
    ["DAN", "但以理書", "但", "Daniel", "Dan"], ["HOS", "何西阿書", "何", "Hosea", "Hos"],
    ["JOL", "約珥書", "珥", "Joel", "Joe"], ["AMO", "阿摩司書", "摩", "Amos", "Amo"],
    ["OBA", "俄巴底亞書", "俄", "Obadiah", "Obad Oba"], ["JON", "約拿書", "拿", "Jonah", "Jon"],
    ["MIC", "彌迦書", "彌", "Micah", "Mic"], ["NAM", "那鴻書", "鴻", "Nahum", "Nah Nam"],
    ["HAB", "哈巴谷書", "哈", "Habakkuk", "Hab"], ["ZEP", "西番雅書", "番", "Zephaniah", "Zeph Zep"],
    ["HAG", "哈該書", "該", "Haggai", "Hag"], ["ZEC", "撒迦利亞書", "亞", "Zechariah", "Zech Zec"],
    ["MAL", "瑪拉基書", "瑪", "Malachi", "Mal"],
    ["MAT", "馬太福音", "太", "Matthew", "Matt Mat Mt"], ["MRK", "馬可福音", "可", "Mark", "Mrk Mk"],
    ["LUK", "路加福音", "路", "Luke", "Luk Lk"], ["JHN", "約翰福音", "約", "John", "Jhn Jn"],
    ["ACT", "使徒行傳", "徒", "Acts", "Act"], ["ROM", "羅馬書", "羅", "Romans", "Rom"],
    ["1CO", "哥林多前書", "林前", "1 Corinthians", "1Cor 1Co"], ["2CO", "哥林多後書", "林後", "2 Corinthians", "2Cor 2Co"],
    ["GAL", "加拉太書", "加", "Galatians", "Gal"], ["EPH", "以弗所書", "弗", "Ephesians", "Eph"],
    ["PHP", "腓立比書", "腓", "Philippians", "Phil Php"], ["COL", "歌羅西書", "西", "Colossians", "Col"],
    ["1TH", "帖撒羅尼迦前書", "帖前", "1 Thessalonians", "1Thess 1Th"], ["2TH", "帖撒羅尼迦後書", "帖後", "2 Thessalonians", "2Thess 2Th"],
    ["1TI", "提摩太前書", "提前", "1 Timothy", "1Tim 1Ti"], ["2TI", "提摩太後書", "提後", "2 Timothy", "2Tim 2Ti"],
    ["TIT", "提多書", "多", "Titus", "Tit"], ["PHM", "腓利門書", "門", "Philemon", "Phlm Phm"],
    ["HEB", "希伯來書", "來", "Hebrews", "Heb"], ["JAS", "雅各書", "雅", "James", "Jas"],
    ["1PE", "彼得前書", "彼前", "1 Peter", "1Pet 1Pe"], ["2PE", "彼得後書", "彼後", "2 Peter", "2Pet 2Pe"],
    ["1JN", "約翰一書", "約一", "1 John", "1Jn"], ["2JN", "約翰二書", "約二", "2 John", "2Jn"],
    ["3JN", "約翰三書", "約三", "3 John", "3Jn"], ["JUD", "猶大書", "猶", "Jude", "Jud"],
    ["REV", "啟示錄", "啟", "Revelation", "Rev"]
  ];

  const norm = s => s.toLowerCase().replace(/[\s.　]/g, "");
  const alias = new Map();
  BOOKS.forEach(b => {
    const [code, zhFull, zhAbbr, en, others] = b;
    [code, zhFull, zhAbbr, en, ...others.split(" ")].filter(Boolean).forEach(a => alias.set(norm(a), code));
  });
  const zhOf = new Map(BOOKS.map(b => [b[0], b[1]]));
  const zhShort = new Map(BOOKS.map(b => [b[0], b[2]]));

  // "c:v-c:v" | "c:v-v" | "c:v" | "c" | "c-c"  ->  [from, to] where position = chapter*1000 + verse
  function span(c1, v1, dash, c2, v2) {
    c1 = +c1;
    if (v1 === undefined) {                       // chapter only, or chapter range
      return [c1 * 1000, (dash === undefined ? c1 : +dash) * 1000 + 999];
    }
    const from = c1 * 1000 + +v1;
    if (dash === undefined) return [from, from];
    if (c2 !== undefined) return [from, +dash * 1000 + +v2];   // 13:1-14:28
    return [from, c1 * 1000 + +dash];                           // 13:4-14
  }
  const PART = /^(\d+)(?::(\d+))?(?:[-–—~](\d+)(?::(\d+))?)?$/;

  // "ACT 13:1-14:28; GAL 1:17" -> [{book, from, to}]
  function parseData(text) {
    return (text || "").split(";").map(s => s.trim()).filter(Boolean).flatMap(piece => {
      const m = piece.match(/^(\w{3})\s+(.+)$/);
      const p = m && m[2].match(PART);
      return p ? [{ book: m[1], ...(([from, to]) => ({ from, to }))(span(p[1], p[2], p[3], p[4], p[4])) }] : [];
    });
  }

  // Free text typed by the user: "徒 13", "Acts 13:5", "創世記22:1-19". Returns null when it is not a reference.
  function parseQuery(text) {
    const t = text.trim();
    const m = t.match(/^(.*?)\s*(\d+(?:\s*:\s*\d+)?(?:\s*[-–—~]\s*\d+(?:\s*:\s*\d+)?)?)$/);
    if (!m) return null;
    const book = alias.get(norm(m[1]));
    const p = book && m[2].replace(/\s/g, "").match(PART);
    if (!p) return null;
    const [from, to] = span(p[1], p[2], p[3], p[4], p[4]);
    return { book, from, to };
  }

  const overlaps = (r, q) => r.book === q.book && r.from <= q.to && q.from <= r.to;

  function fmtPos(n) {
    return Math.floor(n / 1000) + ":" + (n % 1000);
  }
  function format(refs) {
    const parts = [];
    refs.forEach(r => {
      const name = zhShort.get(r.book) || r.book;
      const c1 = Math.floor(r.from / 1000), c2 = Math.floor(r.to / 1000), v1 = r.from % 1000, v2 = r.to % 1000;
      let s;
      if (r.from === r.to) s = fmtPos(r.from);
      else if (c1 === c2) s = `${c1}:${v1}-${v2}`;
      else s = `${fmtPos(r.from)}-${fmtPos(r.to)}`;
      parts.push(`${name} ${s}`);
    });
    return parts.join(";");
  }
  function formatLong(refs) {
    return refs.map(r => (zhOf.get(r.book) || r.book) + " " + format([r]).replace(/^\S+\s/, "")).join(";");
  }

  window.Refs = { BOOKS, parseData, parseQuery, overlaps, format, formatLong };
})();
