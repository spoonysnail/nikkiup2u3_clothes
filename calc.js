// calc.js

var cost = {
  '1': {evolve: 1200, pattern: 800},
  '2': {evolve: 2400, pattern: 1200},
  '3': {evolve: 4000, pattern: 2000},
  '4': {evolve: 7000, pattern: 4000},
  '5': {evolve: 12000, pattern: 8000},
  '6': {evolve: 20000, pattern: 20000},
};

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
    addDeps: function(node, num, require) {
      this.deps[node.category + node.id] = node;
      node.ref[this.category + this.id] = num;
      node.require[this.category + this.id] = require;
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
    parent.cost = num * cost[c.stars].pattern;
    parent.unit = '金币';
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
    parent.cost = num * cost[clothesSet[c.type.mainType][evol].stars].evolve;
    parent.unit = '金币';
    var x = evolveSet[c.type.mainType][id].number;
    var reqNum = calcNum(num, x - 1); // real number
    var child = createOrUpdate(c.type.mainType, evol, true /* keep last */);
    parent.addDeps(child, reqNum, num > 0);
    deps(child);
  }
  var remake = parseSource(c.source.rawSource, '定');
  if (remake && clothesSet[c.type.mainType][remake]) {
    parent.cost = num * convertSet[category][id].num * convertSet[category][id].price;
    parent.unit = '星光币';
    var reqNum = calcNum(num, 1);
    var child = createOrUpdate(c.type.mainType, remake, false /* don't keep */);
    parent.addDeps(child, reqNum, num > 0);
    deps(child);
  }
  if (c.price) {
    parent.cost = c.price * num;
    parent.unit = c.unit;
  }
  if (c.source.rawSource.indexOf('公') > 0) {
    parent.cost = num * 6 * config.princessRate;
    parent.unit = "体力";
  }
  var limited = 0;
  for (var i in c.source.sources) {
    if (c.source.sources[i].indexOf('公') > 0) {
      limited ++;
    }
    if (c.source.sources[i].indexOf('少') > 0) {
      parent.cost = num * 4 * config.maidenRate;
      parent.unit = "体力";
      limited = -1; // no limit
      break;
    }
  }
  if (limited > 0) {
    parent.limit = Math.ceil(num * config.princessRate / limited / (3 + config.princessExtra));
  }
  if (!parent.cost || parent.cost == 0) {
    if (c.source.rawSource.indexOf("迷") >= 0 || c.source.rawSource.indexOf("幻") >= 0) {
      parent.luck = 1;
    } else if (c.source.rawSource.indexOf("成就") >= 0) {
      parent.effort = 1;
    }
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




function init() {
  // if (url().indexOf("ivangift") > 0) {
  //   $(".announcement").append("By 玉人 and ip君, proof of our existence, and our memories. - Nov 2015");
  // }
  // var category = url("#category");
  // var pattern = url("#pattern");
  processSources();
  // drawPreset();
  // loadMerchant();
  // drawCategory();
  //loadInventory();
  // if (patternSet[category]) {
  //   $("#category").val(category);
  //   changeCategory();
  //   if (patternSet[category][pattern]) {
  //     $("#pattern").val(pattern);
  //     selectPattern();
  //   }
  // }
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

$(document).ready(function() {
  init()
});
