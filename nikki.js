// Ivan's Workshop

var CATEGORY_HIERARCHY = function() {
  var ret = {};
  for (var i in category) {
    var type = category[i].split('-')[0];
    if (!ret[type]) {
      ret[type] = [];
    }
    ret[type].push(category[i]);
  }
  return ret;
}();


var global = {
  float: null,
  floating: true,
  isFilteringMode: true,
  boostType: 1,
};

// for table use
function thead() {
  var ret = "<tr>";

  
  ret += "<th class='name'>名称</th>\
  <th class='category'>类别</th>\
  <th>编号</th>\
  <th>心级</th>\
  <th>特殊属性</th>\
  <th>来源</th>\
  <th>已拥有</th>\
  <th>还需要</th>";
  ret += "<th><span class='paging'></span></th><th class='top'></th>";
  
  return ret + "</tr>\n";
}

function tr(tds) {
  return "<tr>" + tds + "</tr>\n";
}

function td(data, cls) {
  return "<td class='" + cls + "'>" + data + "</td>";
}

function inventoryCheckbox(type, id, own) {
  var ret = "<input type = 'checkbox' name = 'inventory' id = '" + (type + id)
      + "' onClick='toggleInventory(\"" + type + "\",\"" + id + "\")'";
  if (own) {
    ret += "checked";
  }
  ret += "/>";
  return ret;
}



function toggleInventory(type, id) {
  var checked = !clothesSet[type][id].own;
  clothesSet[type][id].own = checked;
  $('#clickable-' + type + id).toggleClass('own');
  saveAndUpdate();
}


function updateRel(type,id){
  var inputNum = document.getElementById('have-'+type+id).value;
  clothesSet[type][id].have = parseInt(inputNum);
  alert(type+id+'-'+inputNum);
}


function clickableTd(piece) {
  var name = piece.name;
  var type = piece.type.mainType;
  var id = piece.id;
  var own = piece.own;
  var deps = piece.getDeps('');
  var tooltip = '';
  var cls = 'name';
  if (deps && deps.length > 0) {
    tooltip = "tooltip='" + deps + "'";
    if (deps.indexOf('(缺)') > 0) {
      cls += ' deps';
    }
  }
  cls += own ? ' own' : '';
  return "<td id='clickable-" + (type + id) + "' class='" + cls
      + "'><a href='#dummy' class='button' " + tooltip
      + "onClick='toggleInventory(\"" + type + "\",\"" + id + "\")'>"
      + name + "&nbsp;"+calRel(type+'-'+id) + "</a></td>";
}

function row(piece) {
  var ret = "";
  if (!global.isFilteringMode) {
    ret += td(/*piece.tmpScore*/piece.totalScore);
  }
 
  ret += clickableTd(piece);
  var csv = piece.toCsv();
  for (var i in csv) {
    ret += td(render(csv[i]), getStyle(csv[i]));
  }
  //ret+= "<input type='textbox' size=4 value='" + clothesSet[csv[0]][csv[1]].own?1:0 + "'/>";
  var haveNum = clothesSet[csv[0]][csv[1]].have;
   ret+= "<td class='haveInput'><input id='have-" + (csv[0] + csv[1]) + "' type='textbox' size=6 onChange=updateRel(\""
   +csv[0]+ "\",\"" + csv[1] + "\") value=' " + haveNum + "'\></td>";
    
  var require= calRel(csv[0]+'-'+csv[1]);
  ret += td(require,'requireNum');
  return tr(ret);
 
}

function render(rating) {
  if (rating.charAt(0) == '-') {
    return rating.substring(1);
  }
  return rating;
}

function getStyle(rating) {
  if (rating.charAt(0) == '-') {
    return 'negative';
  }
  switch (rating) {
    case "SS": return 'S';
    case "S": return 'S';
    case "A": return 'A';
    case "B": return 'B';
    case "C": return 'C';
    default: return "";
  }
}

function list(rows) {
  ret = "";
  for (var i = rows.length-1;i>0;i--) {
    ret += row(rows[i]);
  }

  return ret;
}

function drawTable(data, div) {
  if ($('#' + div + ' table').length == 0) {
    $('#' + div).html("<table class='mainTable'><thead></thead><tbody></tbody></table>");
  }
  $('#' + div + ' table thead').html(thead());
  $('#' + div + ' table tbody').html(list(data));

  $('span.paging').html("<button class='destoryFloat'></button>");
  redrawThead();
  $('button.destoryFloat').click(function() {
    if (global.floating) {
      global.float.floatThead('destroy');
      global.floating = false;
    } else {
      global.floating = true;
      global.float.floatThead({
        useAbsolutePositioning: false
      });
    }
    redrawThead();
  });

}

function redrawThead() {
  $('button.destoryFloat').text(global.floating ? '关闭浮动' : '打开浮动');
  $('th.top').html(global.floating ? "<a href='#filtersTop'>回到顶部</a>" : "");
}


function byFirst(a, b) {
  return b[0] - a[0];
}
var criteria={};
var uiFilter = {};

function onChangeUiFilter() {
  uiFilter = {};
  $('input[name=inventory]:checked').each(function() {
    uiFilter[$(this).val()] = true;
  });

  if (currentCategory) {
    if (CATEGORY_HIERARCHY[currentCategory].length > 1) {
      $('input[name=category-' + currentCategory + ']:checked').each(function() {
        uiFilter[$(this).val()] = true;
      });
    } else {
      uiFilter[currentCategory] = true;
    }
  }
  refreshTable(criteria);
}

function refreshTable(criteria) {
  drawTable(filtering(criteria, uiFilter), "clothes", false, null);
}

function filtering(criteria, filters) {
  var result = [];
  for (var i in clothes) {
    if (matches(clothes[i], criteria, filters)) {
      result.push(clothes[i]);
    }
  }
  if (global.isFilteringMode) {
    result.sort(byId);
  } 
  return result;
}

function matches(c, criteria, filters) {
  // only filter by feature when filtering
  // if (global.isFilteringMode) {
  //   for (var i in FEATURES) {
  //     var f = FEATURES[i];
  //     if (criteria[f] && criteria[f] * c[f][2] < 0) {
  //       return false;
  //     }
  //   }
  // }
  return ((c.own && filters.own) || (!c.own && filters.missing)) && filters[c.type.type];
}

function byId(a, b) {
  return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
}

function loadCustomInventory() {
  var myClothes = $("#myClothes").val();
  if (myClothes.indexOf('|') > 0) {
    loadNew(myClothes);
  } else {
    load(myClothes);
  } 
  saveAndUpdate();
  refreshTable(criteria);
}

function toggleAll(c) {
  var all = $('#all-' + c)[0].checked;
  var x = $('input[name=category-' + c + ']:checkbox');
  x.each(function() {
    this.checked = all;
  });
  onChangeUiFilter();
}

function drawFilter() {
  out = "<ul class='tabs' id='categoryTab'>";
  for (var c in CATEGORY_HIERARCHY) {
    out += '<li id="' + c + '"><a href="#dummy" onClick="switchCate(\'' + c + '\')">' + c + '</a></li>';
  }
  out += "</ul>";
  for (var c in CATEGORY_HIERARCHY) {
    out += '<div id="category-' + c + '">';
    if (CATEGORY_HIERARCHY[c].length > 1) {
      // draw a select all checkbox...
      out += "<input type='checkbox' id='all-" + c + "' onClick='toggleAll(\"" + c + "\")' checked>"
          + "<label for='all-" + c + "'>全选</label><br/>";
      // draw sub categories
      for (var i in CATEGORY_HIERARCHY[c]) {
        out += "<input type='checkbox' name='category-" + c + "' value='" + CATEGORY_HIERARCHY[c][i]
            + "'' id='" + CATEGORY_HIERARCHY[c][i] + "' onClick='onChangeUiFilter()' checked /><label for='"
            + CATEGORY_HIERARCHY[c][i] + "'>" + CATEGORY_HIERARCHY[c][i] + "</label>\n";
      }
    }
    out += '</div>';
  }
  $('#category_container').html(out);
}

var currentCategory;
function switchCate(c) {
  currentCategory = c;
  $("ul.tabs li").removeClass("active");
  $("#category_container div").removeClass("active");
  $("#" + c).addClass("active");
  $("#category-" + c).addClass("active");
  onChangeUiFilter();
}

function drawImport() {
  var dropdown = $("#importCate")[0];
  var def = document.createElement('option');
  def.text = '请选择类别';
  def.value = '';
  dropdown.add(def);
  // for (var cate in scoring) {
  //   var option = document.createElement('option');
  //   option.text = cate;
  //   option.value = cate;
  //   dropdown.add(option);
  // }
}

function clearImport() {
  $("#importData").val("");
}

function saveAndUpdate() {
  var mine = save();
  updateSize(mine);
}

function updateSize(mine) {
  $("#inventoryCount").text('(' + mine.size + ')');
  $("#myClothes").val(mine.serialize());
  var subcount = {};
  for (c in mine.mineStr) {
    var type = c.split('-')[0];
    if (!subcount[type]) {
      subcount[type] = 0;
    }
    subcount[type] += mine.mineStr[type].length;
  }
  for (c in subcount) {
    $("#" + c + ">a").text(c + "(" + subcount[c] + ")");
  }
}

function doImport() {
  var dropdown = $("#importCate")[0];
  var type = dropdown.options[dropdown.selectedIndex].value;
  var raw = $("#importData").val();
  var data = raw.match(/\d+/g);
  var mapping = {}
  for (var i in data) {
    while (data[i].length < 3) {
      data[i] = "0" + data[i];
    }
    mapping[data[i]] = true;
  }
  var updating = [];
  for (var i in clothes) {
    
    if (clothes[i].type.mainType == type && mapping[clothes[i].id] && i<10) {
      updating.push(clothes[i].name);
    }
    if(i>10){
      updating.push("等");
      break;
    }
  }
  var names = updating.join(",");
  if (confirm("你将要在>>" + type + "<<中导入：\n" + names)) {
    var myClothes = MyClothes();
    myClothes.filter(clothes);
    if (myClothes.mine[type]) {
      myClothes.mine[type] = myClothes.mine[type].concat(data);
    } else {
      myClothes.mine[type] = data;
    }
    myClothes.update(clothes);
    saveAndUpdate();
    refreshTable(criteria);
    clearImport();
  }
}

function moreLink(cate) {
  var link = $("<span class='more'>&nbsp;| More...</a>");
  link.attr("num", 5);
  link.click(function() {
    var num = parseInt($(this).attr("num"));
    for (var i = 0; i < 5; i++) {
      var x = renderRanking(cate, num+i);
      if (x) {
        x.insertBefore($(this));
      } else {
        break;
      }
    }
    if (clothesRanking[cate].length > num + 5) {
      link.attr("num", num + 5);
    } else {
      $(this).remove();
    }
  });
  return link;
}


function init() {
  var mine = loadFromStorage();
  calcDependencies();
  drawFilter();
  drawImport();
  switchCate(category[0]);
  updateSize(mine);

  global.float = $('table.mainTable');
  global.float.floatThead({
    useAbsolutePositioning: false
  });
}
$(document).ready(function() {
  init()
});


