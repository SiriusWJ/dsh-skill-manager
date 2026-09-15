window.__ModuleLoader__.load({
  id: "dsh-skill-manager",
  factory: (require) => {
    var module = { exports: {} }
    var React = require("react")
    var name = "dsh-skill-manager"
    var inject = ["slots"]
    var API = {
      list: "/api/dsh-skill-manager/list",
      setEnabled: "/api/dsh-skill-manager/set-enabled",
    }

    var CSS = [
      ".dsm-card{display:flex;flex-direction:column;gap:12px;padding:14px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.28));border-radius:12px;background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.04));color:var(--dsw-alias-label-primary,inherit)}",
      ".dsm-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
      ".dsm-title{font-size:15px;font-weight:650;margin:0}",
      ".dsm-summary{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.85))}",
      ".dsm-spacer{flex:1}",
      ".dsm-btn{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));border-radius:7px;padding:5px 10px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}",
      ".dsm-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f7cff)}",
      ".dsm-btn:disabled{opacity:.5;cursor:default}",
      ".dsm-note,.dsm-status{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.85))}",
      ".dsm-error{color:var(--dsw-alias-state-error-primary,#d64545)}",
      ".dsm-search{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));border-radius:8px;padding:7px 10px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.06));color:inherit;font:inherit}",
      ".dsm-list{display:flex;flex-direction:column;max-height:480px;overflow:auto;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.2))}",
      ".dsm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 2px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.16))}",
      ".dsm-info{min-width:0;display:flex;flex-direction:column;gap:3px}",
      ".dsm-name{font:600 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      ".dsm-desc{font-size:12px;line-height:1.45;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.85));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dsm-meta{font-size:11px;color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dsm-switch{width:42px;height:24px;border:0;border-radius:999px;padding:2px;background:rgba(128,128,128,.35);cursor:pointer;transition:background .15s}",
      ".dsm-switch[data-enabled=true]{background:var(--dsw-alias-brand-primary,#4f7cff)}",
      ".dsm-switch:disabled{opacity:.5;cursor:default}",
      ".dsm-thumb{display:block;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.28);transform:translateX(0);transition:transform .15s}",
      ".dsm-switch[data-enabled=true] .dsm-thumb{transform:translateX(18px)}",
      ".dsm-empty{padding:18px 0;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65))}",
      "@media(max-width:640px){.dsm-card{padding:10px}.dsm-list{max-height:55vh}}",
    ].join("\n")

    function sourceLabel(skill) {
      if (skill.source === "user-dsh") return "用户 · ~/.dsh/skills"
      if (skill.source === "user-agents") return "用户 · ~/.agents/skills"
      if (skill.source === "project-dsh") return "项目 · " + (skill.workspace || ".dsh/skills")
      if (skill.source === "project-agents") return "项目 · " + (skill.workspace || ".agents/skills")
      return skill.source || "本地"
    }

    function request(path, options) {
      var init = options || {}
      init.cache = "no-store"
      init.signal = AbortSignal.timeout(20000)
      if (init.body !== undefined) init.headers = { "content-type": "application/json" }
      return fetch(path, init).then(function (response) {
        return response.json().catch(function () { return {} }).then(function (body) {
          if (!response.ok) throw new Error(body.error || ("HTTP " + response.status))
          return body
        })
      })
    }

    function SkillManagerCard() {
      var el = React.createElement
      var state0 = React.useState(null)
      var skills = state0[0]
      var setSkills = state0[1]
      var state1 = React.useState("")
      var query = state1[0]
      var setQuery = state1[1]
      var state2 = React.useState("")
      var error = state2[0]
      var setError = state2[1]
      var state3 = React.useState("")
      var busy = state3[0]
      var setBusy = state3[1]

      var load = React.useCallback(function () {
        setError("")
        return request(API.list).then(function (body) {
          setSkills(Array.isArray(body.skills) ? body.skills : [])
        }).catch(function (cause) {
          setError("加载失败：" + String((cause && cause.message) || cause))
        })
      }, [])

      React.useEffect(function () { load() }, [load])

      function toggle(skill) {
        if (busy) return
        setBusy(skill.path)
        setError("")
        request(API.setEnabled, {
          method: "POST",
          body: JSON.stringify({ name: skill.name, path: skill.path, enabled: !skill.enabled }),
        }).then(function (body) {
          setSkills(function (current) {
            return current.map(function (item) {
              return item.path === skill.path ? Object.assign({}, item, { enabled: body.enabled === true }) : item
            })
          })
        }).catch(function (cause) {
          setError("操作失败：" + String((cause && cause.message) || cause))
        }).finally(function () { setBusy("") })
      }

      var list = skills || []
      var needle = query.trim().toLowerCase()
      var visible = needle === "" ? list : list.filter(function (skill) {
        return [skill.name, skill.description, skill.whenToUse, skill.path, skill.workspace]
          .filter(Boolean).join(" ").toLowerCase().includes(needle)
      })
      var enabled = list.filter(function (skill) { return skill.enabled }).length

      return el("section", { className: "dsm-card" },
        el("div", { className: "dsm-head" },
          el("h3", { className: "dsm-title" }, "技能管理"),
          el("span", { className: "dsm-summary" }, skills === null ? "正在加载…" : enabled + " / " + list.length + " 已启用"),
          el("span", { className: "dsm-spacer" }),
          el("button", { type: "button", className: "dsm-btn", disabled: !!busy, onClick: load }, "刷新")),
        el("p", { className: "dsm-note" }, "管理用户与当前工作区的本地技能。关闭后技能仍可由 /命令 手动调用，但不会自动进入模型技能目录。"),
        el("input", {
          className: "dsm-search", type: "search", value: query,
          placeholder: "搜索名称、描述或路径…", "aria-label": "搜索技能",
          onChange: function (event) { setQuery(event.target.value) },
        }),
        error ? el("p", { className: "dsm-status dsm-error" }, error) : null,
        skills === null
          ? el("div", { className: "dsm-empty" }, "正在扫描本地技能…")
          : visible.length === 0
            ? el("div", { className: "dsm-empty" }, needle ? "没有匹配的技能" : "未发现本地技能")
            : el("div", { className: "dsm-list" }, visible.map(function (skill) {
                return el("div", { key: skill.path, className: "dsm-row" },
                  el("div", { className: "dsm-info", title: skill.path },
                    el("div", { className: "dsm-name" }, skill.name),
                    el("div", { className: "dsm-desc" }, skill.description),
                    el("div", { className: "dsm-meta" }, sourceLabel(skill) + (skill.linked ? " · 链接" : "") + " · " + skill.path)),
                  el("button", {
                    type: "button", role: "switch", className: "dsm-switch",
                    "aria-checked": skill.enabled, "aria-label": (skill.enabled ? "禁用 " : "启用 ") + skill.name,
                    "data-enabled": skill.enabled ? "true" : "false",
                    disabled: !!busy, onClick: function () { toggle(skill) },
                  }, el("span", { className: "dsm-thumb" })))
              })))
    }

    function apply(ctx) {
      var slots = ctx.get("slots")
      if (slots === undefined) return
      if (typeof document !== "undefined") {
        ctx.effect(function () {
          var tag = document.createElement("style")
          tag.setAttribute("data-dsh-skill-manager", "")
          tag.textContent = CSS
          document.head.appendChild(tag)
          return function () { if (tag.parentNode) tag.parentNode.removeChild(tag) }
        }, "dsh-skill-manager: styles")
      }
      slots.inject("settings.plugin.item", function () {
        return slots.register({
          name: "settings.plugin.item",
          key: "skill-manager",
        }, function () { return React.createElement(SkillManagerCard) })
      })
    }

    module.exports = { name: name, inject: inject, apply: apply }
    return module.exports
  },
})
