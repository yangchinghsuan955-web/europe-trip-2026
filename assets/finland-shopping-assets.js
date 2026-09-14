(function(){
  var data=window.AURORA_SHOPPING_DATA;
  var finlandData=window.TravelFinlandShoppingData;
  if(!data||!finlandData)return;
  var base='../assets/shopping/finland/';
  var version='?v=20260913-cloudberry3';
  function local(path){return encodeURI(base+path)+version}
  var files=finlandData.files;
  function assetParts(file){
    if(!file)return null;
    if(typeof file==='string')return {thumb:file,large:file};
    return {thumb:file.thumb||file.large,large:file.large||file.thumb};
  }
  function decorate(p){
    var parts=assetParts(p&&files[p.item]); if(!parts)return p;
    p.image=local('thumbs/'+parts.thumb); p.imageFull=local('large/'+parts.large); p.fullImage=p.imageFull; return p;
  }
  var marketOnly=new Set(finlandData.marketOnly);
  var finland=(data.supermarkets||[]).find(function(x){return String(x.city||'').indexOf('芬蘭')>=0});
  if(finland){
    finland.items=Array.from(marketOnly);
    finland.groups=(finland.groups||[]).map(function(g){
      g.products=(g.products||[]).filter(function(p){return marketOnly.has(p.item)}).map(decorate);
      return g;
    }).filter(function(g){return g.products.length>0});
    finland.note='芬蘭超市頁只保留旅途中直接吃喝／早餐備糧；可帶回台灣的代表性商品統一放到「伴手禮推薦」，避免兩頁重複。';
  }
  data.souvenirs=(data.souvenirs||[]).filter(function(x){return String(x.country||'').indexOf('芬蘭')<0});
  var rows=finlandData.souvenirs.map(function(x){return Object.assign({},x)}).map(decorate);
  var firstNorway=data.souvenirs.findIndex(function(x){return String(x.country||'').indexOf('挪威')>=0});
  if(firstNorway>=0)data.souvenirs.splice.apply(data.souvenirs,[firstNorway,0].concat(rows)); else data.souvenirs=data.souvenirs.concat(rows);

  /* SHOPPING NOTE COPY OVERRIDES START — only detail/reason text is changed. */
  var marketNotes={
    "Kelly's Chips Classic":'奧地利常見人氣零食｜鹹香口味接受度高｜適合大家一起分享。',
    'Alnatura Dinkel Mini Brezeln':'有機迷你蝴蝶脆餅｜鹹香耐吃、不易踩雷｜旅途中很好帶。',
    'pur Bio-Apfelchips geriffelt':'脆友大推、惋惜少買｜有機蘋果片酸甜酥脆｜屬於會想回購的超市零食。',
    'BILLA Bio Schoko Haferkekse':'巧克力＋燕麥口味大眾｜有機超市款有特色｜適合早餐或零食。',
    'Sondey Choco Wafer Rolls Dark Chocolate':'黑巧克力威化捲｜酥脆不膩、接受度高｜價格通常親民，適合分享。',
    'Ritter Sport Nussklasse Pistazie':'Ritter Sport 知名度高｜開心果是近年熱門口味｜歐洲買特色口味更有吸引力。',
    'Lindt Dubai Style Chocolade':'Lindt 知名品牌｜杜拜風開心果＋Kadayif 是熱門話題口味｜適合嘗鮮。',
    'Almdudler':'奧地利代表性飲料｜草本汽水很有在地特色｜到維也納值得至少喝一次。',
    'Darbo Naturrein Wildheidelbeere｜野生藍莓果醬':'Darbo 是奧地利代表果醬品牌｜野生藍莓風味討喜｜早餐能吃、也適合帶回家。',
    'Bonne Premium Mustikkamehu':'聽說超好喝｜芬蘭野生藍莓很有代表性｜莓果控到芬蘭值得優先買。',
    'Finnair Blueberry Juice Drink':'芬航招牌藍莓汁｜旅行記憶點高｜航空迷與藍莓控都會想買。',
    'Valio Hedelmätarha Luomu Puolukka-Karpalo':'北歐越橘＋蔓越莓特色強｜酸甜清爽｜想喝不同於一般果汁可選。',
    'Froosh Smoothie':'北歐常見 Smoothie｜水果味好入口｜早餐、巴士或火車途中都很方便。',
    'Karl Fazer Blue':'芬蘭國民巧克力｜奶香濃、接受度高｜自吃與送人都不容易踩雷。',
    'Karl Fazer Dark 70%':'70% 黑巧克力不過甜｜適合長輩與不嗜甜者｜Fazer 品牌又有芬蘭代表性。',
    'Moomin Liquorice':'嚕嚕米包裝很有芬蘭感｜甘草糖是北歐特色｜適合小包嘗鮮或送嚕嚕米迷。',
    'Kellogg’s Trésor Choco Nougat':'巧克力榛果夾心口感討喜｜有飽足感｜很適合早餐與移動日備糧。',
    'Ovomaltine Crunchy Cream':'脆粒麥芽巧克力口感特別｜抹吐司很好吃｜飯店早餐實用度高。',
    'Paulig Juhla Mokka':'芬蘭經典國民咖啡｜最能代表當地日常咖啡文化｜咖啡族很值得買。',
    'Nordqvist Moomin Tea':'嚕嚕米包裝可愛｜茶包輕巧好帶｜送同事、朋友或嚕嚕米迷都適合。',
    'Nordqvist SUOMI Blueberry Tea':'芬蘭＋藍莓元素一次具備｜比果汁更輕好帶｜很適合當小型伴手禮。',
    'Fazer Cacao':'Fazer 品牌有芬蘭代表性｜可沖熱可可也能烘焙｜喜歡可可的人實用度高。',
    '魚餅／魚丸':'挪威日常冷藏食品｜簡單加熱就能吃｜不用進餐廳也能體驗當地味道。',
    'KIMS 洋芋片':'挪威常見人氣零食｜口味大眾｜適合飯店宵夜與全團分享。',
    'Risengrynsgrøt 藍莓米布丁':'北歐米布丁＋藍莓組合有特色｜口感溫和｜早餐或甜點都適合。',
    'TINE Rislunsj 米布丁':'TINE 是挪威常見品牌｜即食方便、口味接受度高｜移動途中很好吃。',
    'SUNNIVA 蘋果汁':'挪威常見果汁｜清爽好入口｜早餐搭配最實用、不容易踩雷。',
    '挪威啤酒':'可體驗當地品牌與旅行氣氛｜適合晚上回飯店一起喝｜喜歡啤酒再買。',
    '超市秤重蝦子':'挪威海鮮新鮮有吸引力｜現地買通常比餐廳划算｜適合當晚立刻享用。',
    '生食級鮭魚':'到挪威就是想吃鮭魚｜當地新鮮度與旅行體驗感高｜適合現買現吃。',
    '棕色起司 Brunost':'挪威代表性極高｜焦糖乳香很有記憶點｜屬於到挪威至少要試一次的味道。',
    '鱈魚乾／鹿肉乾／鯨魚乾':'北極圈特色、台灣少見｜嘗鮮記憶點高｜建議當地吃，不以帶回台灣為主。',
    '各式甘草糖 Drop':'荷蘭非常代表性的特殊口味｜喜歡的人很愛、討厭的人也很明確｜先買小包最適合。',
    'Lindt 瑞士蓮巧克力':'品牌熟悉、口味多｜歐洲遇特價或限定口味才有購買優勢｜適合順手買。',
    'JOPPIE 薯條醬口味洋芋片':'荷蘭人氣 Joppiesaus 變成洋芋片｜在地感強又方便帶｜很值得嘗鮮。',
    'Bols 荷蘭琴酒／Genever':'荷蘭歷史悠久酒品牌｜Genever 很有荷蘭代表性｜酒類愛好者值得買小瓶紀念。'
  };
  var souvenirNotes={
    'Manner Original Neapolitaner 威化餅':'維也納代表伴手禮｜粉紅包裝辨識度高｜價格親民、輕巧又好分送。',
    'Darbo Rosenmarillen Konfitüre':'Darbo 是奧地利代表果醬品牌｜杏桃是經典奧地利風味｜送人很有在地感。',
    'Darbo Naturrein Wildheidelbeere｜野生藍莓果醬':'Darbo 品牌有代表性｜野生藍莓接受度高｜自用、早餐與送禮都實用。',
    'DEMEL Kandierte Veilchen 糖漬紫羅蘭':'DEMEL 維也納名店加持｜糖漬紫羅蘭很有宮廷甜點特色｜包裝精緻、紀念性高。',
    'Zotter 巧克力':'奧地利知名巧克力品牌｜特色口味很多｜適合挑台灣少見口味送人或自吃。',
    'Kamill Hand & Nagelcreme Classic':'價格親民、體積小｜護手霜人人都用得到｜屬於實用型伴手禮。',
    'Clinical Melatonin Forte Original':'功能性明確｜適合本來就有使用需求的人｜不是一般送禮品，按需求購買即可。',
    'Balea Hyaluron Konzentrat（藍色補水款）':'dm 熱門平價保養｜保濕需求大眾｜CP 值高、體積小好帶。',
    'Ferrero Giotto 榛果威化小球':'榛果＋威化口味討喜｜小包裝好分享｜適合超市順手買。',
    'Karl Fazer Blue':'芬蘭國民巧克力｜奶香濃、接受度高｜送同事朋友最安全、不易踩雷。',
    'Paulig Juhla Mokka':'芬蘭經典咖啡｜很有當地日常文化代表性｜咖啡族收到會很實用。',
    'Finnish Flavours Premium Lakkahillo 250g':'75% 高比例雲莓｜拉普蘭代表莓果、台灣少見｜想買一罐最有特色的雲莓果醬就選它。',
    'Poikain Parhaat Lakkahillo 250g':'同為 75% 芬蘭雲莓｜果味濃、CP 值佳｜看到價格漂亮可優先買。',
    'Meritalo Lakkahillo 310g':'雲莓果醬有北歐特色｜超市較容易買到｜兼顧價格與好入手程度。',
    'Dronningholm Lakkahillo 340g':'經典常見品牌｜價格通常較親民｜前三款找不到時是安心備選。',
    'Karl Fazer Dark 70%':'70% 黑巧克力甜度低｜適合長輩、主管與不嗜甜者｜送禮接受度高。',
    'Fazer Café 巧克力':'Fazer Café／限定商品紀念性更高｜比一般超市款特別｜適合送重要朋友或自己收藏。',
    'Fazer Cacao':'Fazer 品牌代表性高｜可沖泡也可烘焙｜常溫、好帶又實用。',
    'Nordqvist Moomin Tea':'嚕嚕米＋芬蘭元素完整｜包裝可愛、重量輕｜小型伴手禮首選。',
    'Moomin Liquorice':'嚕嚕米包裝有收藏感｜甘草糖又有北歐特色｜適合嚕嚕米迷或敢嘗鮮的人。',
    'Bonne Premium Mustikkamehu':'芬蘭野生藍莓代表性高｜莓果控會喜歡｜液體較重，較適合自己喝或送特定對象。',
    'Finnair Blueberry Juice Drink':'芬航招牌藍莓汁｜旅行紀念性很強｜航空迷或搭過芬航的人會特別有感。',
    'Nordqvist SUOMI Blueberry Tea':'芬蘭＋藍莓意象強｜輕巧不佔行李重量｜比果汁更適合大量帶回送人。',
    'Moomin 周邊／ARABIA・Iittala・Marimekko 聯名':'芬蘭代表設計與嚕嚕米結合｜實用又有收藏價值｜杯子、餐具最適合長期留念。',
    'Lumene 保養品':'芬蘭國民美妝品牌｜保濕系列適合乾冷氣候｜自用與送女性親友都很實用。',
    'Marttiini 馴鹿皮手套':'拉普蘭特色非常強｜兼具保暖實用與紀念性｜比一般紀念品更值得長期使用。',
    'TORO Bergensk Fiskesuppe（卑爾根風味魚湯）':'挪威代表料理｜常溫、輕巧、料理簡單｜回家還能重現旅行味道。',
    'Freia 巧克力':'挪威國民巧克力｜口味多、接受度高｜最適合大量分送親友。',
    'Smash 巧克力牛角':'甜鹹酥脆很有記憶點｜挪威人氣零食討論度高｜容易讓人吃了想再買。',
    'Kvikk Lunsj（挪威版 KitKat）':'與挪威戶外文化連結深｜輕巧、好吃又好分送｜比一般巧克力更有故事。',
    'IFA 甘草糖':'挪威經典小盒甘草糖｜體積小、在地特色強｜適合甘草愛好者或嘗鮮。',
    'TORO 巧克力粉包':'輕巧、常溫、好塞行李｜北歐冬日感很強｜喜歡熱可可的人會很喜歡。',
    'Kaviar 魚子抹醬':'管狀包裝很有北歐日常感｜台灣少見、特色高｜適合喜歡鹹食與海鮮的人。',
    '挪威魚油':'挪威與深海魚油形象連結強｜自用或送家人實用｜依個人需求與成分選購。',
    '魚油護膚膏（魚油凡士林）':'挪威特色明確｜乾冷季節實用｜比一般紀念品更容易真的用完。',
    'Helly Hansen 服飾':'挪威知名戶外品牌｜機能與實穿性高｜帽子、配件或外套都能長期使用。',
    'Dale of Norway 服飾':'挪威傳統羊毛與針織代表｜工藝感、紀念性最高｜適合想買一件真正留得久的商品。',
    'Holzweiler 圍巾與服飾':'現代北歐設計感強｜不像傳統紀念品｜適合重視穿搭與實穿性的人。',
    'Tony’s Chocolonely 巧克力':'荷蘭人氣品牌｜包裝醒目、口味多｜挑當地限定或台灣少見口味最值得。',
    'Speculaas 肉桂香料餅乾':'荷蘭經典香料風味｜搭咖啡、茶都適合｜代表性高又方便送人。',
    'Wilhelmina 女王薄荷糖':'荷蘭經典薄荷糖｜小盒輕巧、價格親民｜最適合辦公室大量分送。',
    '荷蘭起司 Gouda／Edam':'荷蘭最具代表性的食品之一｜產地購買選擇多｜送喜歡起司的人很有份量。',
    'PICKWICK 茶':'荷蘭常見茶品牌｜口味多、包裝輕巧｜適合挑特色風味送人。',
    'Stroopwafel 焦糖煎餅':'荷蘭伴手禮第一聯想｜甜香、接受度高｜盒裝好帶，幾乎不會送錯。',
    'Hopjes 咖啡糖':'咖啡＋焦糖口味大眾｜荷蘭傳統糖果有故事｜體積小、適合大量分送。',
    'Miffy 米菲兔荷蘭限定':'米菲是荷蘭代表角色｜限定款收藏價值高｜機場空服員版尤其有旅行紀念性。'
  };
  (data.supermarkets||[]).forEach(function(section){
    (section.groups||[]).forEach(function(group){
      (group.products||[]).forEach(function(product){
        if(product&&marketNotes[product.item])product.detail=marketNotes[product.item];
      });
    });
  });
  (data.souvenirs||[]).forEach(function(product){
    if(product&&souvenirNotes[product.item])product.reason=souvenirNotes[product.item];
  });
  /* SHOPPING NOTE COPY OVERRIDES END */

  var largeByName={}; Object.keys(files).forEach(function(name){var parts=assetParts(files[name]);if(parts)largeByName[name]=local('large/'+parts.large)});
  function overrideButton(button){
    var name=button&&button.dataset&&button.dataset.productName||''; var full=largeByName[name]; if(!full)return;
    var img=button.querySelector&&button.querySelector('.shopping-product-image'); if(img)button.dataset.productThumbnail=img.getAttribute('src')||'';
    button.dataset.productImage=full;
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){document.querySelectorAll('.shopping-product-image-button[data-product-name]').forEach(overrideButton)},0)});
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.shopping-product-image-button[data-product-name]'); if(b)overrideButton(b)},true);
})();
