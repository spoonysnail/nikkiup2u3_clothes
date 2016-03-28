// Ivan's Workshop

var cost = {
  '1': {evolve: 1200, pattern: 800},
  '2': {evolve: 2400, pattern: 1200},
  '3': {evolve: 4000, pattern: 2000},
  '4': {evolve: 7000, pattern: 4000},
  '5': {evolve: 12000, pattern: 8000},
  '6': {evolve: 20000, pattern: 20000},
};

var CATEGORIES = [
  '发型',
  '连衣裙',
  '外套',
  '上衣',
  '下装',
  '袜子',
  '鞋子',
  '饰品',
  '妆容'
];


var config;

function Inventory() {
  return {
    mine: {},
    serialize: function() {
      var txt = "";
      for (var type in this.mine) {
        var x = [];
        for (var c in this.mine[type]) {
          x.push(c + "=" + this.mine[type][c]);
        }
        txt += type + ":" + x.join(',') + "|";
      }
      return txt;
    },
    deserialize: function(raw) {
      var sections = raw.split('|');
      this.mine = {};
      for (var i in sections) {
        if (sections[i].length < 1) {
          continue;
        }
        var section = sections[i].split(':');
        var type = section[0];
        var clist = section[1].split(',');
        this.mine[type] = [];
        for (var j in clist) {
          var items = clist[j].split('=');
          this.mine[type][items[0]] = parseInt(items[1]);
        }
      }
    },
    update: function(category, id, value) {
      if (!this.mine[category]) {
        this.mine[category] = {};
      }
      this.mine[category][id] = value;
    }
  };
}

Resource = function(category, id, number) {
  return {
    category: category,
    id: id,
    inventory: 0,
    number: number,
    cost: 0,
    unit: 'N/A',
    keep: true,
    deps: {},
    ref: {},
    require: {},
    depscnt:0,
    addDeps: function(node, num, require) {
      this.deps[node.category + node.id] = node;
      node.ref[this.category + this.id] = num;
      node.require[this.category + this.id] = require;
      this.depscnt++;
    },
    getNumber: function() {
      var n = 0;
      var require = false;
      for (var x in this.ref) {
        n += this.ref[x];
        require |= this.require[x];
      }
      return require ? n + (this.keep ? 1 : 0) : 0;
    }
  }
}

var patternSet = function() {
  ret = {}
  for (var i in pattern) {
    var targetCate = pattern[i][0];
    var targetId = pattern[i][1];
    var sourceCate = pattern[i][2];
    var sourceId = pattern[i][3];
    var num = pattern[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    if (!ret[targetCate][targetId]) {
      ret[targetCate][targetId] = [];
    }
    ret[targetCate][targetId].push(Resource(sourceCate, sourceId, num));
  }
  return ret;
}();

var evolveSet = function() {
  ret = {}
  for (var i in evolve) {
    var targetCate = evolve[i][0];
    var targetId = evolve[i][1];
    var sourceCate = evolve[i][2];
    var sourceId = evolve[i][3];
    var num = evolve[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    ret[targetCate][targetId] = Resource(sourceCate, sourceId, num);
  }
  return ret;
}();

var convertSet = function() {
  ret = {}
  for (var i in convert) {
    var targetCate = convert[i][0];
    var targetId = convert[i][1];
    var source = convert[i][2];
    var price = convert[i][3];
    var num = convert[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    ret[targetCate][targetId] = {source: source, price: price, num: num};
  }
  return ret;
}();

var FEATURES = ["simple", "cute", "active", "pure", "cool"];
var ACCRATIO = [1, 1, 1, 1, 0.95, 0.9, 0.825, 0.75, 0.7, 0.65, 0.6, 0.55, 0.51, 0.47, 0.45, 0.425, 0.4];


// parses a csv row into object
// Clothes: name, type, id, stars, gorgeous, simple, elegant, active, mature, cute, sexy, pure, cool, warm，extra
//          0     1     2   3      4         5       6        7       8       9     10    11    12    13    14
Clothes = function(csv, real) {
  var theType = typeInfo[csv[1]];
  if (!theType) {
    alert("not found: " + csv[1]);
  }
  return {
    own: false,
    name: csv[0],
    type: theType,
    id: csv[2],
    stars: csv[3],
    simple: realRating(csv[5], csv[4], real ? real[5] : null, real ? real[4] : null, theType),
    cute: realRating(csv[9], csv[8], real ? real[9] : null, real ? real[8] : null, theType),
    active: realRating(csv[7], csv[6], real ? real[7] : null, real ? real[6] : null, theType),
    pure: realRating(csv[11], csv[10], real ? real[11] : null, real ? real[10] : null, theType),
    cool: realRating(csv[12], csv[13], real ? real[12] : null, real ? real[13] : null, theType),
    tags: csv[14].split(','),
    source: Source(csv[15]),
    suit: csv[16],
    tmpScoreByCategory: ScoreByCategory(),
    bonusByCategory: ScoreByCategory(),
    deps: {},
    toCsv: function() {
      name = this.name;
      type = this.type;
      id = this.id;
      stars = this.stars;
      simple = this.simple;
      cute = this.cute;
      active = this.active;
      pure = this.pure;
      cool = this.cool;
      extra = this.tags.join(',');
      source = this.source.rawSource;
      return [type.type, id, stars, simple[0], simple[1], cute[0], cute[1],
          active[0], active[1], pure[0], pure[1], cool[0],
          cool[1], extra, source];
    },
    addDep: function(sourceType, c) {
      if (!this.deps[sourceType]) {
        this.deps[sourceType] = [];
      }
      if (c == this) {
        alert("Self reference: " + this.type.type + " " + this.id + " " + this.name);
      }
      this.deps[sourceType].push(c);
    },
    getDeps: function(indent) {
      var ret = "";
      var category_main = this.type.mainType;
      var node = Resource(category_main,this.id);
      node.ref['request'] = 1;
      node.require['request'] = true;
      node.keep = 0;
      resourceSet = {};
      deps(node);
      for (var sourceType in this.deps) {
        for (var i in this.deps[sourceType]) {
          var c = this.deps[sourceType][i];
          var chnode = Resource(c.type.mainType,c.id);
          var number = Math.max(chnode.getNumber() - chnode.inventory, 0);



          ret += indent + '[' + sourceType + '][' + c.type.mainType + ']'
              + c.name + (c.own ? '' : '(缺)')+ number +'&#xA;';
          ret += c.getDeps(indent + "    ");
        }
      }
      return ret;
    },
    calc: function(filters) {
      var s = 0;
      var self = this;
      this.tmpScoreByCategory.clear();
      this.bonusByCategory.clear();
      
      for (var i in FEATURES) {
        var f = FEATURES[i];
        if (filters[f]) {
          var sub = filters[f] * self[f][2];
          if (filters[f] > 0) {
            if (sub > 0) {
              this.tmpScoreByCategory.record(f, sub, 0); // matched with major
            } else {
              this.tmpScoreByCategory.record(f, 0, sub); // mismatch with minor
            }
          } else {
            if (sub > 0) {
              this.tmpScoreByCategory.record(f, 0, sub); // matched with minor
            } else {
              this.tmpScoreByCategory.record(f, sub, 0); // mismatch with major
            }
          }
          if (sub > 0) {
            s += sub;
          }
        }
      }

      this.tmpScore = Math.round(s);
      this.tmpBonus = 0;

      if (filters.bonus) {
        var total = 0;
        for (var i in filters.bonus) {
          var bonus = filters.bonus[i];
          var resultlist = bonus.filter(this);
          var result = resultlist[0];
          if (result > 0) {
            // result > 0 means match
            this.bonusByCategory.addRaw(filters, resultlist[1]);
            total += result;
            if (bonus.replace) {
              this.tmpScore /= 10;
              this.tmpScoreByCategory.f();
            }
          }
        }
        this.tmpBonus = total;
        this.tmpScore += total;
      }
      if (this.type.needFilter() && currentLevel && currentLevel.filter) {
        currentLevel.filter.filter(this);
      }
      this.tmpScore = Math.round(this.tmpScore);   
      this.tmpBonus = Math.round(this.tmpBonus);
      if (filters.boost1 == null && filters.boost2 == null) {
        this.totalScore = this.tmpScore;
        this.totalBonus = this.tmpBonus;
      } else {
        var boosted = this.boost(filters.boost1, filters.boost2);
        this.totalScore = Math.round(boosted[0] + boosted[1]);
        this.totalBonus = Math.round(boosted[1]);
      }
    },
    boost: function(boost1, boost2) {
      return [this.tmpScoreByCategory.boost(boost1, boost2), this.bonusByCategory.boost(boost1, boost2)];
    }
  };
}

function ScoreByCategory() {
  var initial = {};
  for (var c in FEATURES) {
    initial[FEATURES[c]] = [0, 0];
  }
  return {
    scores: initial,
    // score: positive - matched, negative - no matched
    record: function(category, major, minor) {
      this.scores[category] = [major, minor];
    },
    clear: function() {
      for (var c in this.scores) {
        initial[c][0] = 0;
        initial[c][1] = 0;
      }
    },
    add: function(other) {
      if (other) {
        for (var c in other.scores) {
          this.scores[c][0] += other.scores[c][0];
          this.scores[c][1] += other.scores[c][1];
        }
      }
    },
    round: function() {
      for (var c in this.scores) {
        this.scores[c][0] = Math.round(this.scores[c][0]);
        this.scores[c][1] = Math.round(this.scores[c][1]);
      }
    },
    addRaw: function(filters, rawdata) {
      for (var i in FEATURES) {
        var f = FEATURES[i]; 
        if (filters[f] && rawdata[f] > 0) {
          if (filters[f] > 0) { // level requires major
            this.scores[f][0] += rawdata[f];
          } else { // level requires minor
            this.scores[f][1] += rawdata[f];
          }
        }
      }
    },
    boost: function(boost1, boost2) {
      var total = 0;
      for (var f in this.scores) {
        //var f = FEATURES[i];
        var score = Math.max(this.scores[f][0], this.scores[f][1]);
        if (boost1 == f) {
          score *= 1.27;
        } else if (boost2 == f) {
          score *= 1.778;
        }
        total += score;
      }
      return total;
    },
    f: function() {
      for (var c in this.scores) {
        this.scores[c][0] /= 10;
        this.scores[c][1] /= 10;
      }
    }
  };
}

function MyClothes() {
  return {
    mine: {},
    size: 0,
    filter: function(clothes) {
      this.mine = {}
      this.size = 0;
      for (var i in clothes) {
        if (clothes[i].own) {
          var type = clothes[i].type.mainType;
          if (!this.mine[type]) {
            this.mine[type] = [];
          }
          this.mine[type].push(clothes[i].id);
          this.size ++;
        }
      }
    },
    serialize: function() {
      var txt = "";
      for (var type in this.mine) {
        txt += type + ":" + this.mine[type].join(',') + "|";
      }
      return txt;
    },
    deserialize: function(raw) {
      var sections = raw.split('|');
      this.mine = {};
      this.size = 0;
      for (var i in sections) {
        if (sections[i].length < 1) {
          continue;
        }
        var section = sections[i].split(':');
        var type = section[0];
        if (type == "上装") {
          type = "上衣";
        }
        this.mine[type] = section[1].split(',');
        this.size += this.mine[type].length;
      }
    },
    update: function(clothes) {
      var x = {};
      for (var type in this.mine) {
        x[type] = {};
        for (var i in this.mine[type]) {
          var id = this.mine[type][i];
          x[type][id] = true;
        }
      }
      for (var i in clothes) {
        clothes[i].own = false;
        var t = clothes[i].type.mainType;
        var id = clothes[i].id
        if (x[t] && x[t][clothes[i].id]) {
          clothes[i].own = true;
        }
      }
    }
  };
}

function Source(source) {
  var sources = source.split("/");
  var compact = [];
  for (var i in sources) {
    compact.push(compactSource(sources[i]));
  }
  return {
    rawSource: source,
    sources: sources,
    compacts: compact,
    compact: function() {
      return this.compacts.join("/");
    }
  };
}

function compactSource(source) {
  if (source.indexOf('进') >= 0) {
    return '进';
  }
  if (source.indexOf('定') >= 0) {
    return '染';
  }
  if (source.indexOf('图') >= 0) {
    return '图';
  }
  if (source.indexOf('活动') >= 0) {
    return source.substring(3);
  }
  return source;
}

var clothes = function() {
  var reals = {};
  if (typeof wardrobe_real !== "undefined") {
    for (var i in wardrobe_real) {
      var key = wardrobe_real[i][1] + wardrobe_real[i][2];
      reals[key] = wardrobe_real[i];
    }
  }
  var ret = [];
  for (var i in wardrobe) {
    var key = wardrobe[i][1] + wardrobe[i][2];
    ret.push(Clothes(wardrobe[i], reals[key]));
  }
  return ret;
}();

var clothesSet = function() {
  var ret = {};
  for (var i in clothes) {
    var t = clothes[i].type.mainType;
    if (!ret[t]) {
      ret[t] = {};
    }
    ret[t][clothes[i].id] = clothes[i];
  }
  return ret;
}();

var clothesRanking = function() {
  var ret = {};
  for (var i in clothes) {
    var t = clothes[i].type.type;
    if (!ret[t]) {
      ret[t] = [];
    }
    ret[t].push(clothes[i]);
  }
  return ret;
}();
var shoppingCart = ShoppingCart();
function ShoppingCart() {
  return {
    cart: {},
    totalScore: fakeClothes(this.cart),
    clear: function() {
      this.cart = {};
    },
    contains: function(c) {
      return this.cart[c.type.type] == c;
    },
    remove: function(c) {
      delete this.cart[c];
    },
    putAll: function(clothes) {
      for (var i in clothes) {
        this.put(clothes[i]);
      }
    },
    put: function(c) {
      this.cart[c.type.type] = c;
    },
    toList: function(sortBy) {
      var ret = [];
      for (var t in this.cart) {
        ret.push(this.cart[t]);
      }
      return ret.sort(sortBy);
    },
    getScore: function(cate) {
      if (this.cart[cate]) {
        return this.cart[cate].tmpScore;
      }
      return 0;
    },
    calc: function(boost1, boost2) {
      /*
      for (var c in this.cart) {
        this.cart[c].calc(criteria);
      }
      */
      // fake a clothes
      this.totalScore = fakeClothes(this.cart, boost1, boost2);
    }
  }
};

function accScore(total, totalBonus, items) {
  if (items < ACCRATIO.length) {
    return (total - totalBonus) * ACCRATIO[items] + totalBonus;
  }
  return (total - totalBonus) * 0.4 + totalBonus;
}

function fakeClothes(cart, boost1, boost2) {
  var totalScore = 0;
  var totalAccessoriesBonus = 0;
  var totalAccessories = 0;
  var totalScoreByCategory = ScoreByCategory();
  var totalBonusByCategory = ScoreByCategory();
  var totalAccessoriesByCategory = ScoreByCategory();
  var totalAccessoriesBonusByCategory = ScoreByCategory();
  var numAccessories = 0;
  for (var c in cart) {
    if (c.split('-')[0] == "饰品") {
      totalAccessories += cart[c].tmpScore;
      totalAccessoriesBonus += cart[c].tmpBonus;
      totalAccessoriesByCategory.add(cart[c].tmpScoreByCategory);
      totalAccessoriesBonusByCategory.add(cart[c].bonusByCategory);
      numAccessories ++;
    } else {
      totalScore += cart[c].tmpScore;
      totalScoreByCategory.add(cart[c].tmpScoreByCategory);
      totalBonusByCategory.add(cart[c].bonusByCategory);
    }
  }
  totalScore += accScore(totalAccessories, totalAccessoriesBonus, numAccessories);
  for (var c in totalAccessoriesByCategory.scores) {
    totalAccessoriesByCategory.scores[c][0] = accScore(totalAccessoriesByCategory.scores[c][0], 0,
        numAccessories);
    totalAccessoriesByCategory.scores[c][1] = accScore(totalAccessoriesByCategory.scores[c][1], 0,
        numAccessories);
    totalAccessoriesBonusByCategory.scores[c][0] = totalAccessoriesBonusByCategory.scores[c][0]; // WTF...bonus never chagnes
    totalAccessoriesBonusByCategory.scores[c][1] = totalAccessoriesBonusByCategory.scores[c][1];
  }
  totalScoreByCategory.add(totalAccessoriesByCategory);
  totalBonusByCategory.add(totalAccessoriesBonusByCategory);
  totalScoreByCategory.round();
  totalBonusByCategory.round();
  
  var scores = totalScoreByCategory.scores;
  var bonus = totalBonusByCategory.scores;
  return {
    name: '总分',
    tmpScore: Math.round(totalScore),
    totalScore: Math.round(totalScoreByCategory.boost(boost1, boost2) + totalBonusByCategory.boost(boost1, boost2)),
    toCsv: function() {
      return ['', '', '',
          scoreWithBonusTd(scores.simple[0], bonus.simple[0], boost1 == 'simple', boost2 == 'simple'), 
          scoreWithBonusTd(scores.simple[1], bonus.simple[1], boost1 == 'simple', boost2 == 'simple'),
          scoreWithBonusTd(scores.cute[0], bonus.cute[0], boost1 == 'cute', boost2 == 'cute'),
          scoreWithBonusTd(scores.cute[1], bonus.cute[1], boost1 == 'cute', boost2 == 'cute'),
          scoreWithBonusTd(scores.active[0], bonus.active[0], boost1 == 'active', boost2 == 'active'),
          scoreWithBonusTd(scores.active[1], bonus.active[1], boost1 == 'active', boost2 == 'active'),
          scoreWithBonusTd(scores.pure[0], bonus.pure[0], boost1 == 'pure', boost2 == 'pure'),
          scoreWithBonusTd(scores.pure[1], bonus.pure[1], boost1 == 'pure', boost2 == 'pure'),
          scoreWithBonusTd(scores.cool[0], bonus.cool[0], boost1 == 'cool', boost2 == 'cool'),
          scoreWithBonusTd(scores.cool[1], bonus.cool[1], boost1 == 'cool', boost2 == 'cool'), '', ''];
    }
  };
}

function scoreWithBonusTd(score, bonus, isBoost1, isBoost2) {
  scoreLabel = score + '<br/>+' + bonus;
  if (score > 0) {
    if (isBoost1) {
      return "<span class='red'>1.27x</span>" + "<div>(" + scoreLabel + ")</div>";
    } else if (isBoost2) {
      return "<span class='red'>1.778x</span>" + "<div>(" + scoreLabel + ")</div>";
    }
  } 
  return scoreLabel;
}

function realRating(a, b, realScoreA, realScoreB, type) {
  real = a ? a : b;
  realScore = a ? realScoreA : realScoreB;
  symbol = a ? 1 : -1;
  score = symbol * type.score[real];
  dev = type.deviation[real];
  if (realScore) {
    score = symbol * realScore;
    dev = 0;
  } else {
    score = symbol * type.score[real];  
    dev = type.deviation[real];
  }
  return [a, b, score, dev];
}

function parseSource(source, key) {
  var idx = source.indexOf(key);
  var ridx = source.indexOf('/', idx+1);
  if (ridx < 0) ridx = 99;
  if (idx >= 0) {
    var id = source.substring(idx + 1, Math.min(source.length, ridx));
    while (id.length < 3) id = '0' + id;
    return id;
  }
  return null;
}

function calcDependencies() {
  for (var i in clothes) {
    var c = clothes[i];
    var evol = parseSource(c.source.rawSource, '进');
    if (evol && clothesSet[c.type.mainType][evol]) {
      clothesSet[c.type.mainType][evol].addDep('进', c);
    }
    var remake = parseSource(c.source.rawSource, '定');
    if (remake && clothesSet[c.type.mainType][remake]) {
      clothesSet[c.type.mainType][remake].addDep('定', c);
    }
  }
  for (var i in pattern) {
    var target = clothesSet[pattern[i][0]][pattern[i][1]];
    var source = clothesSet[pattern[i][2]][pattern[i][3]];
    if (!target) continue;
    source.addDep('设计图', target);
  }
}

function load(myClothes) {
  var cs = myClothes.split(",");
  for (var i in clothes) {
    clothes[i].own = false;
    if (cs.indexOf(clothes[i].name) >= 0) {
      clothes[i].own = true;
    }
  }
  var mine = MyClothes();
  mine.filter(clothes);
  return mine;
}

function loadNew(myClothes) {
  var mine = MyClothes();
  mine.deserialize(myClothes);
  mine.update(clothes);
  return mine;
}

function loadFromStorage() {
  var myClothes;
  var myClothesNew;
  if (localStorage) {
    myClothesNew = localStorage.myClothesNew;
    myClothes = localStorage.myClothes;
  } else {
    myClothesNew = getCookie("mine2");
    myClothes = getCookie("mine");
  }
  if (myClothesNew) {
    return loadNew(myClothesNew);
  } else if (myClothes) {
    return load(myClothes);
  }
  return MyClothes();
}

function getCookie(c_name) {
  if (document.cookie.length>0) { 
    c_start=document.cookie.indexOf(c_name + "=")
    if (c_start!=-1) { 
      c_start=c_start + c_name.length+1 
      c_end=document.cookie.indexOf(";",c_start)
      if (c_end==-1) {
        c_end=document.cookie.length
      }
      return unescape(document.cookie.substring(c_start,c_end))
    }
  }
  return "";
}

function setCookie(c_name,value,expiredays) {
  var exdate=new Date()
  exdate.setDate(exdate.getDate()+expiredays)
  document.cookie=c_name+ "=" +escape(value)+
  ((expiredays==null) ? "" : "; expires="+exdate.toGMTString())
}

function save() {
  var myClothes = MyClothes();
  myClothes.filter(clothes);
  var txt = myClothes.serialize();
  if (localStorage) {
    localStorage.myClothesNew = txt;
  } else {
    setCookie("mine2", txt, 3650);
  }
  return myClothes;
}



function byName(a, b) {
  return a.name.localeCompare(b.name);
}
function byString(a, b) {
  return a.localeCompare(b);
}



function calcNum(numParent, num, keep) {
  if (numParent == 0) return 0; // after all, you don't need any deps if goal is already fulfilled
  var kept = keep ? 1 : 0;
  return numParent * (num - kept) + kept;
}

function createOrUpdate(category, id, keep) {
  if (!resourceSet[category]) {
    resourceSet[category] = {};
  }
  if (!resourceSet[category][id]) {
    resourceSet[category][id] = Resource(category, id);
    if (inventory.mine[category] && inventory.mine[category][id]) {
      resourceSet[category][id].inventory = inventory.mine[category][id];
    }
  }
  resourceSet[category][id].keep &= keep;
  return resourceSet[category][id];
}

function deps(parent) {
  var category = parent.category;
  var id = parent.id;
  var num = Math.max(parent.getNumber() - parent.inventory, 0);
  var c = clothesSet[category][id];

  if (patternSet[category] && patternSet[category][id]) {

    for (var i in patternSet[category][id]) {
      var source = patternSet[category][id][i];
      var reqNum = calcNum(num, source.number - 1); // real number
      var child = createOrUpdate(source.category, source.id, true /* keep last */);
      parent.addDeps(child, reqNum, num > 0);
      deps(child);
    }
  }
  var evol = parseSource(c.source.rawSource, '进');
  if (evol && clothesSet[c.type.mainType][evol]) {
    var x = evolveSet[c.type.mainType][id].number;
    var reqNum = calcNum(num, x - 1); // real number
    var child = createOrUpdate(c.type.mainType, evol, true /* keep last */);
    parent.addDeps(child, reqNum, num > 0);
    deps(child);
  }
  var remake = parseSource(c.source.rawSource, '定');
  if (remake && clothesSet[c.type.mainType][remake]) {
    var reqNum = calcNum(num, 1);
    var child = createOrUpdate(c.type.mainType, remake, false /* don't keep */);
    parent.addDeps(child, reqNum, num > 0);
    deps(child);
  }
 
 
}

var root;
var resourceSet = {};


var inventory = Inventory();

function processSources() {
  for (var i in clothes) {
    var c = clothes[i];
    var sources = c.source.sources;
    var tbd = [];
    for (var j in sources) {
      var evol = parseSource(sources[j], '进');
      var remake = parseSource(sources[j], '定');

      if (evol && clothesSet[c.type.mainType][evol]) {
        tbd.push(clothesSet[c.type.mainType][evol].name + evolveSet[c.type.mainType][c.id].number + "进1");
      } else if (remake && clothesSet[c.type.mainType][remake]) {
        tbd.push(clothesSet[c.type.mainType][remake].name + "+"
            + convertSet[c.type.mainType][c.id].num
            + convertSet[c.type.mainType][c.id].source);
      } else {
        tbd.push(sources[j]);
      }
    }
    c.sources = tbd;
  }
}







function resourceSize() {
  var size = 0;
  for (var cate in resourceSet) {
    for (var i in resourceSet[cate]) {
      size ++;
    }
  }
  return size;
}

function visit(node, collector) {
  collector[node.category + node.id] = node;
  for (var v in node.deps) {
    visit(node.deps[v], collector);
  }
}



function taskList(nodes) {
  var ret = "<table class='breakdown'><thead><tr><th>名称</th><th>来源</th><th>需求数量</th></tr></thead>";
  // ret += "<tbody>";
  // for (var i in nodes) {
  //   var node = nodes[i];
  //   var number = Math.max(node.getNumber() - node.inventory, 0);
  //   var c = clothesSet[node.category][node.id];
  //   var name = c.name;
  //   var tr = "<tr><td>" + name + "</td>"
  //     + "<td>" + c.sources.join("/") + "</td>"
  //     + "<td>" + number + "</td></tr>";
  //   ret += tr;
  // }
  // ret += "</tbody></table>";
  return ret;
}
