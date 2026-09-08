(function(){
  var data=window.AURORA_SHOPPING_DATA;
  if(!data)return;

  var base='../assets/shopping/vienna/';
  function local(file){return encodeURI(base+file)}
  function norm(value){return String(value||'').toLowerCase().replace(/[\s'’"“”()（）·・\-_/\\]+/g,'').trim()}

  var images={
    "Kelly's Chips Classic":"Kelly's Chips Classic.jpg",
    'Alnatura Dinkel Mini Brezeln':'Alnatura Dinkel Mini Brezeln.jpg',
    'pur Bio-Apfelchips geriffelt':'SPAR Bio Apfelchips.jpg',
    'BILLA Bio Schoko Haferkekse':'BILLA Bio Schoko Haferkekse.avif',
    'Sondey Choco Wafer Rolls Dark Chocolate':'Sondey Choco Wafer Rolls Dark Chocolate.jpg',
    'Ritter Sport Nussklasse Pistazie':'Ritter Sport Nussklasse Pistazie.jpg',
    'Lindt Dubai Style Chocolade':'Lindt Dubai Style Chocolade.jpg',
    'Almdudler':'Almdudler.jpg',
    'Manner Original Neapolitaner 威化餅':'Manner Original Neapolitaner 威化餅.png',
    'Darbo Rosenmarillen Konfitüre':'Darbo Rosenmarillen Konfitüre.png',
    'DEMEL Kandierte Veilchen 糖漬紫羅蘭':'DEMEL Kandierte Veilchen 糖漬紫羅蘭.png',
    'Zotter 巧克力':'Zotter 巧克力.png',
    'Kamill Hand & Nagelcreme Classic':'Kamill Hand & Nagelcreme Classic.jpg',
    'Clinical Melatonin Forte Original':'Clinical Melatonin Forte Original.png',
    'Balea Hyaluron Konzentrat（藍色補水款）':'Balea Hyaluron Konzentrat（藍色補水款）.png',
    'Ferrero Giotto 榛果威化小球':'Ferrero Giotto 榛果威化小球.webp'
  };

  var vienna=(data.supermarkets||[]).find(function(x){return String(x.city||'').indexOf('維也納')!==-1});
  var supermarketNames=new Set();
  if(vienna&&Array.isArray(vienna.groups)){
    vienna.groups.forEach(function(group){
      if(!Array.isArray(group.products))return;
      var seen=new Set();
      group.products=group.products.filter(function(product){
        var key=norm(product.item);
        if(!key||seen.has(key))return false;
        seen.add(key);
        supermarketNames.add(key);
        if(images[product.item])product.image=local(images[product.item]);
        return true;
      });
    });
  }

  var seenViennaSouvenirs=new Set();
  data.souvenirs=(data.souvenirs||[]).filter(function(product){
    if(String(product.country||'').indexOf('維也納')===-1)return true;
    var key=norm(product.item);
    if(!key||supermarketNames.has(key)||seenViennaSouvenirs.has(key))return false;
    seenViennaSouvenirs.add(key);
    if(images[product.item])product.image=local(images[product.item]);
    return true;
  });
})();
