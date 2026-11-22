/* =========================================================
   滞りセルフチェックツール：問い・カードのデータ
   文言はユーザー提供の表（最新版）のまま。勝手に変更しない。
   ========================================================= */

// 領域（並びはレーダーチャートの順）
// bg：リフレクションカードの背景色 / accent：その色を濃くした領域の色（チャート・点数表で使用）
// icon：ホームの領域カードのアイコン（Material Symbols の名前。index.html の icon_names にも足すこと）
// desc：領域の意味（ホームの一覧と点数表に表示）
// name：画面に出す名前（2026-11-21 わかりやすい名前に変更。元の分類名は orig）
const DOMAINS = [
  { id: "body",    name: "からだ", icon: "accessibility_new", desc: "体力・睡眠・食事など、体の調子",     orig: "肉体",   bg: "#f9dbd9", accent: "#c05f59" },
  { id: "economy", name: "お金", icon: "savings", desc: "暮らしのお金と、ゆとり",       orig: "経済性", bg: "#fae7d6", accent: "#c08959" },
  { id: "family",  name: "身近な人", icon: "home", desc: "家族や親しい人との安心できる関係",   orig: "家族",   bg: "#fdf1d7", accent: "#c0a059" },
  { id: "social",  name: "人づきあい", icon: "groups", desc: "まわりの人や場所とのつながり", orig: "社会性", bg: "#e2eed6", accent: "#7ea35a" },
  { id: "intel",   name: "学び", icon: "menu_book", desc: "知ること・考えること・成長の実感",       orig: "知性",   bg: "#d3e5e5", accent: "#5a9e9e" },
  { id: "work",    name: "仕事", icon: "work", desc: "仕事や活動の意味とペース",       orig: "仕事",   bg: "#d6e2fc", accent: "#5b80c4" },
  { id: "ethics",  name: "価値観", icon: "diamond", desc: "大切にしたいことを大切にできているか",     orig: "倫理",   bg: "#c9ccef", accent: "#6b67bf" },
  { id: "spirit",  name: "生き方", icon: "explore", desc: "生きている意味や納得感",     orig: "精神",   bg: "#ffffff", accent: "#8c8c8c" }  // 白いカードのため灰色
];

// 問い（1〜5点で回答）
const QUESTIONS = [
  { domain: "body",    text: "今の自分の体力に合わせて、無理なく過ごせている。" },
  { domain: "body",    text: "自分に必要な睡眠・食事・運動がとれている。" },
  { domain: "body",    text: "疲れや体調の変化に気づいたら、休んだり対処したりできている。" },
  { domain: "economy", text: "毎月の生活に必要なお金について、大きな不安がない。" },
  { domain: "economy", text: "自分の収入・支出・貯蓄がどれくらいあるか把握している。" },
  { domain: "economy", text: "やりたいことや大切なことに使える、お金や時間の余裕がある。" },
  { domain: "family",  text: "ありのままの自分で安心して過ごせる、親しい関係がある。" },
  { domain: "family",  text: "身近な相手に、自分の気持ちや弱さを見せることができる。" },
  { domain: "family",  text: "親しい相手と、お互いの時間や生活を尊重しながら関われている。" },
  { domain: "social",  text: "人間関係の中で、無理に自分を合わせすぎずにいられる。" },
  { domain: "social",  text: "周りの人から、自分の意見や気持ちを大切にしてもらえていると感じる。" },
  { domain: "social",  text: "自分が関わりたいと思う人や場所と、十分につながれている。" },
  { domain: "intel",   text: "興味のあることを学んだり、考えたりする時間がある。" },
  { domain: "intel",   text: "「もっと知りたい」と思ったことを、調べたり深く考えたりできている。" },
  { domain: "intel",   text: "新しく知ったりできるようになったりして、自分が成長していると感じる。" },
  { domain: "work",    text: "今している仕事や活動に、「自分がやる意味」を感じている。" },
  { domain: "work",    text: "今している仕事や活動で、自分の得意なことや能力を活かせている。" },
  { domain: "work",    text: "今している仕事や活動の量やペースが、自分に合っている。" },
  { domain: "ethics",  text: "自分が「これは大切にしたい」と思うことを大切にして暮らせている。" },
  { domain: "ethics",  text: "迷ったときに、周りに流されるだけでなく、自分が納得できる選択をしている。" },
  { domain: "ethics",  text: "自分の行動と「こうありたい」と思う自分との間に、大きなズレがない。" },
  { domain: "spirit",  text: "自分なりに、生きている意味や楽しさを感じられる瞬間がある。" },
  { domain: "spirit",  text: "自分の人生は、誰かや社会、自然など、自分以外のものともつながっていると感じる。" },
  { domain: "spirit",  text: "今の自分の生き方に、納得できている。" }
];

// リフレクションカード（番号は掲載順 01〜32）
const CARDS = [
  { domain: "body",    title: "Breathe",    q: "最近、“呼吸”を意識したの、いつ？", step: "背筋を伸ばして、吸う4・止める2・吐く6の呼吸を1回だけ。" },
  { domain: "body",    title: "Sense",      q: "体が出している「いやだ」のサインに気づいてる？", step: "全身にぎゅっと力を入れて、5秒後にふっと脱力する。" },
  { domain: "body",    title: "Nourish",    q: "食べる・寝る・動く、どれかを我慢していない？", step: "どれか1つを、今日は“意識して整える”。" },
  { domain: "body",    title: "Ground",     q: "最近、体の“重だるさ”を放置していない？", step: "大きな筋肉をゆっくり動かすように、肩・腰・足のどれかを10秒だけ伸ばす。" },
  { domain: "economy", title: "Enough",     q: "「足りない」と思うのは、お金？ それとも安心？", step: "「足りない」と感じたことを1つ書いて、お金の不足か、安心の不足かを分けてみる。" },
  { domain: "economy", title: "Intend",     q: "不安なとき、“買うこと”で安心を取り戻してない？", step: "今日使うお金の“目的”を1行で書く。" },
  { domain: "economy", title: "Receive",    q: "自分の才能を“ちゃんと受け取る”ことを怖がってない？", step: "誰かに褒められたら、謙遜をやめて「ありがとう」で受け取る。" },
  { domain: "economy", title: "Secure",     q: "ほんとうに欲しいのは“お金”？“安心できる未来”？", step: "1年後の“こうだったら安心”を1つだけ書く。" },
  { domain: "family",  title: "Listen",     q: "「分かってほしい」って言う前に、相手に聞いてみた？", step: "「どう思う？」の一言を、相手にプレゼントする。" },
  { domain: "family",  title: "Detach",     q: "誰かの“機嫌”を、自分の責任だと思い込んでない？", step: "相手の表情を見たら、心の中で「これは相手の気持ち」とつぶやく。" },
  { domain: "family",  title: "Soften",     q: "相手が向き合うべき課題を、自分の問題に変換してない？", step: "「相手の問題」「自分の問題」を紙に1つずつ書き分ける。" },
  { domain: "family",  title: "Allow",      q: "もしかして、ひとりで頑張ってない？", step: "「～してもらえる？」と“言葉にする練習”をしてみる。" },
  { domain: "social",  title: "Express",    q: "相手に“伝わるはず”って思い込みで動いてない？", step: "「言わなくてもわかるはず」と思っていることを1つ、口に出してみる。" },
  { domain: "social",  title: "Boundary",   q: "人の期待に応える前に、自分の声を聞いた？", step: "断りたい誘いが来たときの“断り文”を1つ準備しておく。" },
  { domain: "social",  title: "Compare",    q: "あなたの“成功”を、誰かと比べてない？", step: "比較相手を1人思い浮かべて、「私は私のペースでOK」と1回だけ言う。" },
  { domain: "social",  title: "Display",    q: "誰かに見せるための“幸せ”を演じてない？", step: "写真を見返して、“その時の本音”を心の中で言ってみる。" },
  { domain: "intel",   title: "Discern",    q: "誰かの言葉を、そのまま受け取ってない？", step: "今日耳にした情報を1つ選んで、“事実／解釈”に分ける。" },
  { domain: "intel",   title: "Learn",      q: "“知らない”ことを、恥ずかしいと思ってない？", step: "今日出会った“知らないこと”を1つ選んで、「知らなくて大丈夫」と言う。" },
  { domain: "intel",   title: "Curious",    q: "学ぶことが“義務”になってない？", step: "今日やらなくても困らない「学び」をひとつ決める。" },
  { domain: "intel",   title: "Clarify",    q: "その考えは本当にあなたの考え？", step: "○○すべきと思っていることを書いて、誰の価値観か確認する。" },
  { domain: "work",    title: "Serve",      q: "いま取り組んでいる仕事、“誰の役に立つ”か言える？", step: "「この作業は誰のどんな負担を減らす？」を1行だけ書く。" },
  { domain: "work",    title: "Honest",     q: "その返事、“あなたの本音”に合ってる？", step: "返事をする前に、3秒だけ“自分に聞く時間”をつくる。" },
  { domain: "work",    title: "Remember",   q: "その仕事は“やりたいから？”“評価されるため？”", step: "誰にも評価されないとしても続けたい作業を、1つ思い浮かべる。" },
  { domain: "work",    title: "Delegate",   q: "「わたしが辞めたら困る」って、誰が決めた？", step: "あなたがいなくても職場が回った出来事を1つ思い出す。" },
  { domain: "ethics",  title: "Compassion", q: "“正しさ”を守るために、“誰かを悪者”にしてない？", step: "相手を責めそうになった瞬間、“相手の立場にある1つの理由”を想像する。" },
  { domain: "ethics",  title: "Humble",     q: "誰かを助けたい気持ちが“支配”に変わってない？", step: "“教える”より“聞く”を意識する1日。" },
  { domain: "ethics",  title: "Open",       q: "誰かに“こうあってほしい”を押しつけていない？", step: "相手に「この人にはこの人のペースがある」と心の中で言う。" },
  { domain: "ethics",  title: "Yield",      q: "話し合いのとき、“相手を変えよう”としていない？", step: "「結論」じゃなくて、相手の“気持ち”を1つだけ確認してみる。" },
  { domain: "spirit",  title: "Essence",    q: "“こうあるべき”を外したとき、私は何を望んでる？", step: "「誰にも何も言われないなら」と前置きして、やりたいことを1つ言ってみる。" },
  { domain: "spirit",  title: "Reflect",    q: "“何もできてない”って本当に事実？", step: "過去に自分が“勇気を出した行動”を1つ思い出して、“よくやった”と言う。" },
  { domain: "spirit",  title: "Pause",      q: "“ひとりでいる時間”、足りてる？", step: "1分間目を閉じて、心の動きを観察する。" },
  { domain: "spirit",  title: "Trust",      q: "どんな未来でも、“自分だけは自分の味方”でいられる？", step: "夜寝る前、「今日もよく生きた」と言う。" }
];
