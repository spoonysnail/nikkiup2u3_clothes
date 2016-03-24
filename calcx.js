function drawNpc() {
  var dropdown = $("#npc")[0];
  for (var i in npc) {
    var option = document.createElement('option');
    option.text = i;
    option.value = i;
    dropdown.add(option);
  }
  changeNpc();
}

function drawSkill() {
  var skills = [];
  for (var s in skillSet) {
    if (s.indexOf("短CD技能") >= 0) {
      continue;
    }
    skills.push(s);
  }
  $('#playerSkills').selectivity({
    items: skills,
    multiple: true,
    placeholder: '按顺序选择技能'
  });
  $('#playerSkills').on('change', function(evt) {
    validate();
  });
  $('#playerSkills').on('selectivity-opening', function(evt) {
    if (getPlayerSkills().length >= 4) {
      evt.preventDefault();
    }
  });
}

function getPlayerSkills() {

  var out = [];
  var skills = $('#playerSkills').selectivity("val");
  for (var i in skills) {
    out.push(skillSet[skills[i]]);
  }
  return out;
}

function validate() {
  var skills = getPlayerSkills();
  var errors = [];
  if (skills.length < 4) {
    errors.push("技能未用满4个。除非对方有沉睡技能，不然请使用填充技能来帮助计时。");
  }
  if (skills[0] && skills[0].cd > 10) {
    errors.push("第一顺位技能CD过长。"); 
  }
  if (skills[1] && skills[1].cd > 10) {
    errors.push("第二顺位技能CD过长。如果对方没有沉睡技能尽量使用短CD技能"); 
  }
  if (!containsSkill(skills, "暖暖的微笑")) {
    errors.push("未使用暖暖的微笑。暖暖的微笑是收益最高的技能。");
  }
  if (!containsSkill(skills, "迷人飞吻")) {
    errors.push("未使用迷人飞吻。迷人飞吻是收益次高的技能。");
  }
  $("#validation").html(errors.join("<br/>"));
}

function calculate() {
  var x = $("#npc").val();
  var enemy = Player("enemy", false);
  var player = Player("player", true);
  for (var i in npc[x]) {
    enemy.skills.put(skillSet[npc[x][i]]);
  }
  var skills = getPlayerSkills();
  var suggestion = [];
  for (var i in skills) {
    suggestion.push(skills[i]);
  }
  for (var i in suggestion) {
    player.skills.put(suggestion[i]);
  }
  if (suggestion[0] && suggestion[0].cd < 15) {
    suggestion.push(suggestion[0]);  
  }
  if (suggestion[1] && suggestion[1].cd < 15) {
    suggestion.push(suggestion[1]);  
  }

  var eventBus = EventBus();
  var param = Parameter();
  param.isSim = false;
  param.collector = Collector();
  combat(player, suggestion, enemy, eventBus, 0, param);
  if ($("#panel").length == 0) {
    $("#test").append($("<div id='panel' class='panel'>"));
  }
  param.collector.render($("#panel"));
  $("#panel").collapse({});
}

function changeNpc() {
  var x = $("#npc").val();
  $("#enemy").text("npc 技能: ");
  var enemy = Player("enemy", false);
  for (var i in npc[x]) {
    $("#enemy").append(npc[x][i] + "&nbsp;&nbsp;");
    enemy.skills.put(skillSet[npc[x][i]]);
  }
  var suggestion = skillSuggestion(enemy.skills.skills);
  $("#playerSuggestion").text("推荐的技能顺序: ");
  for (var i in suggestion) {
    $("#playerSuggestion").append(suggestion[i].name + "&nbsp;&nbsp;");
  }
}

function init() {
  drawNpc();
  drawSkill();
}

function combat(player, sequence, enemy, eventBus, ts, param) {
  if (ts > 15) {
    if (param.isSim) {
      output(player, enemy);
    } else {
      param.collector.collect(player, enemy, param.odd);
    }
    return;
  }

  var avail = player.avail(ts);
  if (avail.length > 0) {
    var skill;
    if (sequence.length > 0) {
      console.assert(containsSkill(avail, sequence[0].name));
      if (!containsSkill(avail, sequence[0].name)) {
        skill = avail[0];
      } else {
        skill = sequence.shift();
      }
    } else {
      skill = avail[0];
    }
    
    
    player.use(skill, ts);
    if (param.isSim) {
      logEvent(player, skill, avail, ts);
    }
    eventBus.put(skill, ts + skill.casting, skill.isSelf ? true : false);
  }

  avail = enemy.avail(ts);
  if (avail.length > 0) {
    if (param.isSim) {
      var chosen = Math.floor(Math.random() * avail.length);
      var skill = avail[chosen];
      enemy.use(skill, ts);
      logEvent(enemy, skill, avail, ts);
      eventBus.put(skill, ts + skill.casting, skill.isSelf ? false : true);
    } else {
      var odd = param.odd;
      for (var i in avail) {
        var skill = avail[i];
        // folk here
        var copiedEnemy = $.extend(true, {}, enemy);
        var copiedSequence = sequence.slice();
        var copiedPlayer = $.extend(true, {}, player);
        var copiedEventBus = $.extend(true, {}, eventBus);

        copiedEnemy.use(skill, ts);
        copiedEventBus.put(skill, ts + skill.casting, skill.isSelf ? false : true);
        param.odd = odd * avail.length;
        combat(copiedPlayer, copiedSequence, copiedEnemy, copiedEventBus, ts, param);
      }
      return;
    }
  }
  eventBus.use(player, enemy, ts);
  combat(player, sequence, enemy, eventBus, Math.min(player.nextTime(), enemy.nextTime(), eventBus.nextTime()), param);
}

function Parameter() {
  return {
    odd: 1,
    isSim: true,
    collector: null,
  }
}

function logToKey(log) {
  var keys = [];

  if (log['暖暖的微笑'] && log['迷人飞吻'] && log['暖暖的微笑'].length == 2 && log['迷人飞吻'].length == 1) {
    judgeSmile1 = Math.floor(log['暖暖的微笑'][0] / 3);
    judgeSmile2 = Math.floor(log['暖暖的微笑'][1] / 3);
    judgeKiss = Math.ceil(log['迷人飞吻'][0] / 3);
    if (judgeKiss != judgeSmile1 && judgeKiss != judgeSmile2) {
      keys.push("微笑与飞吻未用于同一评委");
    }
  } else {
    if (!log['暖暖的微笑'] || log['暖暖的微笑'].length < 2) {
      keys.push("少一次暖暖的微笑");
    }
    if (!log['迷人飞吻'] || log['迷人飞吻'].length < 1) {
      keys.push("少一次迷人飞吻");
    }
  }
  if (log['挑剔的目光'] > 0) {
    keys.push('挑剔的目光' + log['挑剔的目光'] + '次');
  }
  if (log['圣诞礼物'] > 0) {
    keys.push('圣诞礼物' + log['圣诞礼物'] + '次');
  }
  if (log['灰姑娘时钟'] > 0) {
    keys.push('灰姑娘时钟' + log['灰姑娘时钟'] + '次');
  }
  if (keys.length == 0) {
    return "perfect";
  } else {
    return keys.join(",");
  }
}

function Collector() {
  return {
    stats: {},
    collect: function(player, enemy, odd) {
      var key = logToKey(player.log);
      if (this.stats[key]) {
        this.stats[key].add(1, odd, player.summary, enemy.summary);
      } else {
        this.stats[key] = Stats(1, odd, player.summary, enemy.summary);
      }
    },
    render: function($div) {
      $div.empty();
      for (var key in this.stats) {
        var stats = this.stats[key];
        $div.append("<h3>" + key + ": " + stats.a + "/" + stats.b + "</h3>");
        $content = $("<div>");
        $div.append($content);
        for (var i in stats.logs) {
          $content.append("<p>");
          $content.append("<div>enemy</div>");
          outputSummary($content, stats.logs[i][1]);
          $content.append("<div>player</div>");
          outputSummary($content, stats.logs[i][0]);
          $content.append("</p>");
          $content.append("<hr/>");
        }
      }
    }
  }
}

function lcs(a, b) {
  if (a > b) {
    return lcs(b, a);
  }
  if (b % a == 0) {
    return a;
  }
  return lcs(b % a, a);
}

function Stats(a, b, player, enemy) {
  return {
    a: a,
    b: b,
    logs: [[player, enemy]],
    add: function(a1, b1, player, enemy) {
      this.a = this.a * b1 + this.b * a1;
      this.b = this.b * b1;
      c = lcs(this.a, this.b);
      this.a /= c;
      this.b /= c;
      this.logs.push([player, enemy]);
    }
  }
}

function logEvent(player, skill, avail, ts) {
  var names = [];
  for (var i in avail) {
    names.push(avail[i].name);
  }
  var cds = [];
  for (var s in player.skills.cd) {
    if (player.skills.cd[s] > ts) {
      cds.push(s + ":" + player.skills.cd[s]);
    }
  }
  $("#test").append("<div>" + ts.toFixed(1) + "s: [" + player.name + "]["+ skill.name + "]&nbsp;&nbsp; available: " + names.join(",")
      + "&nbsp;&nbsp;CD:" + cds.join(",")
      + "</div>");
}

function output(player, enemy) {
  $("#test").append("<hr/>");
  $("#test").append("<div>enemy</div>");
  for (var i in enemy.summary) {
    $("#test").append("<div>" + enemy.summary[i] + "</div>");
  }
  for (var i in enemy.log) {
    $("#test").append("<div>" + i + ":" + enemy.log[i] + "</div>");
  }

  $("#test").append("<hr/>");
  $("#test").append("<div>player</div>");
  for (var i in player.summary) {
    $("#test").append("<div>" + player.summary[i] + "</div>");
  }
  for (var i in player.log) {
    $("#test").append("<div>" + i + ":" + player.log[i] + "</div>");
  }
}

function outputSummary($div, summary) {
  for (var i in summary) {
    $div.append("<div>" + summary[i] + "</div>");
  }
}

$(document).ready(function() {
  init()
});
