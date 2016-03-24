// calc.js

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

var palette = [
  ["#ffe599", "#ffecb3", "#fff2cc", "#fff9e5"],
  ["#ff99ff", "#ffb3ff", "#ffccff", "#ffe5ff"],
  ["#9999ff", "#b3b3ff", "#ccccff", "#e5e5ff"],
  ["#ff9999", "#ffb7b7", "#ffcccc", "#ffe5e5"]
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

var suitSet = function() {
  ret = {}
  for (var i in suits) {
    var suitCate = suits[i][0];
    var suit = suits[i][1];
    var cate = suits[i][2];
    var id = suits[i][3];
    if (!ret[suitCate]) {
      ret[suitCate] = {};
    }
    if (!ret[suitCate][suit]) {
      ret[suitCate][suit] = [];
    }
    if (!clothesSet[cate][id]) {
      alert("not found: " + cate + "," + id);
    }
    ret[suitCate][suit].push(clothesSet[cate][id]);
  }
  return ret;
}();

function drawCategory() {
  var dropdown = $("#category")[0];
  for (var i in CATEGORIES) {
    var category = CATEGORIES[i];
    var option = document.createElement('option');
    option.text = category;
    option.value = category;
    dropdown.add(option);
  }
  for (var cate in suitSet) {
    var option = document.createElement('option');
    option.text = "成就: " + cate;
    option.value = cate;
    dropdown.add(option);
  }
  changeCategory();
}

function byName(a, b) {
  return a.name.localeCompare(b.name);
}
function byString(a, b) {
  return a.localeCompare(b);
}

function changeCategory() {
  var category = $("#category").val();
  $("#pattern").find('option').remove();
  var dropdown = $("#pattern")[0];
  var option = document.createElement('option');
  option.text = "选一件衣服";
  option.selected = true;
  option.disabled = "disabled";
  option.hidden = "hidden";
  dropdown.add(option);
  if (patternSet[category]) {
    var toSort = [];
    for (var i in patternSet[category]) {
      if (!clothesSet[category][i]) continue;
      toSort.push(clothesSet[category][i]);
    }
    toSort.sort(byName);
    for (var i in toSort) {
      var option = document.createElement('option');
      option.text = toSort[i].name;
      option.value = toSort[i].id;
      dropdown.add(option);
    }
  } else if (suitSet[category]) {
    var toSort = [];
    for (var i in suitSet[category]) {
      toSort.push(i);
    }
    toSort.sort(byString);
    for (var i in toSort) {
      var suit = toSort[i];
      var toSort2 = [];
      for (var j in suitSet[category][suit]) {
        var option = document.createElement('option');
        option.text = suit + " - " + suitSet[category][suit][j].name;
        option.value = suitSet[category][suit][j].type.mainType + '-' + suitSet[category][suit][j].id;
        dropdown.add(option);
      }
    }
  }
  
  updateParam();
}

function selectPattern() {
  var category = $("#category").val();
  var id = $("#pattern").val();
  if (suitSet[category]) {
    var realcate = id.split('-')[0];
    var realid = id.split('-')[1];
    drawTable(realcate, realid);
  } else {
    drawTable(category, id);
  }
  updateParam();
}

function thead() {
  return "<thead><tr>"
    + "<th>名称</th>"
    //+ "<th>编号</th>"
    
    + "<th>拥有数量</th>"
    + "<th>需求数量</th>"
    + "<th>分类</th>"
    + "<th>来源</th>"
    + "<th>获取成本</th>"
    + "</tr></thead>";
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
function drawTable(category, id) {
  var ret = thead();
  root = Resource(category, id);
  root.ref['request'] = 1;
  root.require['request'] = true;
  root.keep = 0;
  $("#table").html("<table id='table'>"+ ret+"<tbody></tbody></table>");
  resourceSet = {};
  deps(root);
  summary(root);
  var theme = 0;
  var sameTheme = resourceSize() < 20;
  for (var i in root.deps) {
    render(root.deps[i], sameTheme ? 0 : theme++, 0);
  }
}

function loadMerchant() {
  for (var i in merchant) {
    var category = merchant[i][0];
    var id = merchant[i][1];
    var price = merchant[i][2];
    var unit = merchant[i][3];
    if (clothesSet[category][id]) {
      clothesSet[category][id].price = price;
      clothesSet[category][id].unit = unit;
    }
  }
}

var inventory = Inventory();
function loadInventory() {
  if (localStorage && localStorage.clothesCount) {
    inventory.deserialize(localStorage.clothesCount);
  }
}

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

function drawPreset() {
  var dropdown = $("#preset")[0];
  for (var i in preset) {
    var option = document.createElement('option');
    option.text = i;
    option.value = i;
    dropdown.add(option);
  }
  if (localStorage.custompreset) {
    preset['custom'] = JSON.parse(localStorage.custompreset);
    var option = document.createElement('option');
    option.text = "自定义人物";
    option.value = "custom";
    dropdown.add(option);
  }
  changePreset(false);
}

function changePreset(calc) {
  var choice = $("#preset").val();

  if (preset[choice]) {
    $("#goldgen").val(preset[choice].generate['金币']);
    $("#coingen").val(preset[choice].generate['星光币']);
    $("#hpgen").val(preset[choice].generate['体力']);
    $("#shoegen").val(preset[choice].generate['水晶鞋']);
    $("#princessgen").val(preset[choice].princessExtra);
    $("#princessrate").val(preset[choice].princessRate);
    $("#maidenrate").val(preset[choice].maidenRate);
    $("#desc").text(preset[choice].desc);
    config = preset[choice];
    if (calc) {
      selectPattern();
    }
  }
}

function updateConfig() {
  if ($("#preset option[value='custom']").length == 0) {
    var option = document.createElement('option');
    option.text = "自定义人物";
    option.value = "custom";
    $("#preset")[0].add(option);
  }
  $("#preset").val('custom');
  if (!preset['custom']) {
    preset['custom'] = {};
    preset['custom'].generate = {};
  }
  preset['custom'].generate['金币'] = parseSafe($("#goldgen"), 1000, 1000000, 90000);
  preset['custom'].generate['星光币'] = parseSafe($("#coingen"), 1, 1000, 45);
  preset['custom'].generate['体力'] = parseSafe($("#hpgen"), 1, 10000, 450);
  preset['custom'].generate['水晶鞋'] = parseSafe($("#shoegen"), 1, 100, 1);
  preset['custom'].princessExtra = parseSafe($("#princessgen"), 0, 100, 0);
  preset['custom'].princessRate = parseSafe($("#princessrate"), 1, 20, 1);
  preset['custom'].maidenRate = parseSafe($("#maidenrate"), 1, 20, 1);
  $("#desc").text("自定义的数值，请根据你自己的个人情况如实填写。");
  config = preset['custom'];
  if (localStorage) {
    localStorage.custompreset = JSON.stringify(preset['custom']);
  }
  selectPattern();
}

function parseSafe(element, lowerbound, upperbound, def) {
  var value = parseInt(element.val());
  if (!value || value < lowerbound || value > upperbound) {
    element.val(def);
    return def;
  }
  return value;
}

function init() {
  if (url().indexOf("ivangift") > 0) {
    $(".announcement").append("By 玉人 and ip君, proof of our existence, and our memories. - Nov 2015");
  }
  var category = url("#category");
  var pattern = url("#pattern");
  processSources();
  drawPreset();
  loadMerchant();
  drawCategory();
  loadInventory();
  if (patternSet[category]) {
    $("#category").val(category);
    changeCategory();
    if (patternSet[category][pattern]) {
      $("#pattern").val(pattern);
      selectPattern();
    }
  }
}

function updateParam() {
  var category = $("#category").val();
  var pattern = $("#pattern").val();
  var param = "category="+category + "&pattern=" + pattern;
  window.location.href = "#" + param;
}

function render(node, theme, layer) {
  var number = Math.max(node.getNumber() - node.inventory, 0);
  var cost = node.cost == 0 ? '-' : (node.cost + node.unit);
  if (node.limit) {
    cost += "/" + node.limit + "天";
  }
  var c = clothesSet[node.category][node.id];
  var name = c.name;
  if (layer > 0) {
    name = "&nbsp;&nbsp;&#x025B9;" + name;
  }
  for (var i = 0; i < layer-1; i ++) {
    name = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + name;
  }
  var color;
  if (layer >= palette[theme].length) {
    color = palette[theme][palette[theme].length - 1];
  } else {
    color = palette[theme][layer];
  }
  if ($("." + node.category + node.id).length < Object.keys(node.ref).length) {
    var tr = $("<tr class='" + node.category + node.id + "'>");
    tr.append("<td style='background: " + color + "'>" + name + "</td>"
      //+ "<td style='background: " + color + "'>" + node.id + "</td>"
      );
    var input = $("<input type='textbox' size=4 value='" + node.inventory + "'/>");
    tr.append($("<td style='background: " + color + "' class='inventory'>").append(input));
    tr.append("<td style='background: " + color + "' class='number'>" + number + "</td>"
      + "<td style='background: " + color + "'>" + node.category + "</td>"
      + "<td style='background: " + color + "'>" + c.sources.join("/") + "</td>"
      + "<td style='background: " + color + "' class='cost'>" + cost + "</td>");
    $("#table tbody").append(tr);

    input.change(function() {
      var num = parseInt($(this).val());
      if (!num) {
        num = 0;
      }
      $(this).val(num);
      updateInventory(node.category, node.id, num);
    });
  } else {
    $("." + node.category + node.id + " .number").text(number);
    $("." + node.category + node.id + " .cost").text(cost);
    $("." + node.category + node.id + " .inventory input").val(node.inventory);
  }
  for (var i in node.deps) {
    render(node.deps[i], theme, layer+1);
  }
}

function updateInventory(category, id, value) {
  resourceSet[category][id].inventory = value;
  deps(resourceSet[category][id]);
  summary(root);
  var theme = 0;
  var sameTheme = resourceSize() < 20;
  for (var i in root.deps) {
    render(root.deps[i], sameTheme ? 0 : theme++, 0);
  }

  inventory.update(category, id, value);
  if (localStorage) {
    localStorage.clothesCount = inventory.serialize();
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

function summary(node) {
  var collector = {};
  visit(node, collector);
  var sum = {};
  var princess = [];
  var maiden = [] ;
  for (var i in collector) {
    if (collector[i].cost > 0) {
      if (!sum[collector[i].unit]) {
        sum[collector[i].unit] = 0;
      }
      sum[collector[i].unit] += collector[i].cost;
      if (collector[i].limit) {
        if (!sum['公主关次数限制']) {
          sum['公主关次数限制'] = 0;
        }
        if (sum['公主关次数限制'] < collector[i].limit) {
          sum['公主关次数限制'] = collector[i].limit;
        }
      }
    }
    if (collector[i].luck) {
      sum['一些运气'] = '许多';
    }
    if (collector[i].effort) {
      sum['一些努力'] = '总有一';
    }

    var c = clothesSet[collector[i].category][collector[i].id];
    if (c.source.rawSource.indexOf('公') > 0 && collector[i].getNumber() > collector[i].inventory) {
      princess.push(collector[i]);
    }
    if (c.source.rawSource.indexOf('少') > 0 && collector[i].getNumber() > collector[i].inventory) {
      maiden.push(collector[i]);
    }
  }
  var ret = "<table>";
  for (var unit in sum) {
    if (unit in config.generate) {
      var days = Math.ceil(sum[unit] / config.generate[unit]);
      ret += "<tr><td>" + unit + ": " + formatNumber(sum[unit]) + "</td><td>" + days + "天</td></tr>";
    } else if (unit == "雪晶片") {
      ret += "<tr><td>" + unit + ": " + formatNumber(sum[unit]) + "</td><td>" + "抓紧</td></tr>";
    } else {
      ret += "<tr><td>" + unit + "</td><td>" + sum[unit] + "天</td></tr>";
    }
    
  }
  ret += "</table>";
  $("#summary").html(ret);
  $("#breakdown").empty();
  if (princess.length > 0) {
    $("#breakdown").append("公主关掉落列表");
    $("#breakdown").append(taskList(princess));
  }
  if (maiden.length > 0) {
    $("#breakdown").append("少女关掉落列表");
    $("#breakdown").append(taskList(maiden));
  }
}

function formatNumber(number) {
  return numeral(number).format('0,0');
}

function taskList(nodes) {
  var ret = "<table class='breakdown'><thead><tr><th>名称</th><th>来源</th><th>需求数量</th></tr></thead>";
  ret += "<tbody>";
  for (var i in nodes) {
    var node = nodes[i];
    var number = Math.max(node.getNumber() - node.inventory, 0);
    var c = clothesSet[node.category][node.id];
    var name = c.name;
    var tr = "<tr><td>" + name + "</td>"
      + "<td>" + c.sources.join("/") + "</td>"
      + "<td>" + number + "</td></tr>";
    ret += tr;
  }
  ret += "</tbody></table>";
  return ret;
}

$(document).ready(function() {
  init()
});
