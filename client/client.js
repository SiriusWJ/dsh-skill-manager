window.__ModuleLoader__.load({
  id: "dsh-skill-manager",
  factory: (require) => {
    var module = { exports: {} }
    var React = require("react")
    var primitives = null
    try { primitives = require("@deepseek-ai/dsh-client-ui-primitives") } catch { primitives = null }
    var name = "dsh-skill-manager"
    var inject = ["slots"]
    var API = {
      list: "/api/dsh-skill-manager/list",
      setEnabled: "/api/dsh-skill-manager/set-enabled",
    }

    // Card chrome mirrors PluginCard.module.css from
    // @deepseek-ai/dsh-client-ui-settings-plugins so this card looks and behaves
    // like the plugin cards the section itself ships.
    var CSS = [
      ".dsm-card{border:.5px solid var(--dsw-alias-border-l4,rgba(128,128,128,.28));background:var(--dsw-alias-bg-layer-3,rgba(128,128,128,.04));border-radius:16px;list-style:none;transition:border-color .16s,background .16s}",
      ".dsm-card:hover{border-color:var(--dsw-alias-label-dimmed,rgba(128,128,128,.5))}",
      ".dsm-cardOpen{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.06));border-color:var(--dsw-alias-label-dimmed,rgba(128,128,128,.5))}",
      ".dsm-header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}",
      ".dsm-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f7cff);outline-offset:-2px}",
      ".dsm-headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}",
      ".dsm-name{color:var(--dsw-alias-label-primary,inherit);font-size:15px;font-weight:600;line-height:1.4}",
      ".dsm-description{color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65));font-size:13px;line-height:1.5}",
      ".dsm-chevron{color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65));flex:none;transition:transform .16s}",
      ".dsm-chevronOpen{transform:rotate(180deg)}",
      ".dsm-body{border-top:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));margin:0 16px;padding:12px 0 8px;display:flex;flex-direction:column;gap:12px}",
      ".dsm-toolbar{display:flex;align-items:center;gap:8px}",
      ".dsm-search{flex:1;min-width:0;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;padding:5px 10px;background:var(--dsw-alias-bg-layer-3,rgba(128,128,128,.06));color:inherit;font:inherit;font-size:13px;line-height:1.5}",
      ".dsm-btn{appearance:none;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.85));background:0 0;flex:none}",
      ".dsm-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary,inherit);border-color:var(--dsw-alias-label-dimmed,rgba(128,128,128,.5))}",
      ".dsm-btn:disabled{opacity:.5;cursor:default}",
      ".dsm-note,.dsm-status{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65))}",
      ".dsm-error{color:var(--dsw-alias-state-error-primary,#d64545)}",
      ".dsm-list{display:flex;flex-direction:column;max-height:480px;overflow:auto;border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2))}",
      ".dsm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 2px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.16))}",
      ".dsm-info{min-width:0;display:flex;flex-direction:column;gap:3px}",
      ".dsm-skill{font:600 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;transition:color .15s}",
      ".dsm-row[data-enabled=false] .dsm-skill{color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65))}",
      ".dsm-desc{font-size:12px;line-height:1.45;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.85));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dsm-meta{font-size:11px;color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dsm-state{align-items:center;gap:10px;flex:none;display:flex}",
      ".dsm-stateText{font-size:11px;line-height:1.4;font-weight:600;color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65))}",
      ".dsm-stateText[data-enabled=true]{color:var(--dsw-alias-state-success-primary,#22c55e)}",
      ".dsm-switch{box-sizing:border-box;width:42px;height:24px;border:0;border-radius:999px;padding:2px;background:rgba(128,128,128,.4);cursor:pointer;transition:background .15s}",
      ".dsm-switch:hover:not(:disabled){background:rgba(128,128,128,.55)}",
      ".dsm-switch[data-enabled=true]{background:var(--dsw-alias-state-success-primary,#22c55e)}",
      ".dsm-switch[data-enabled=true]:hover:not(:disabled){background:var(--dsw-static-green-400,#4ed17e)}",
      ".dsm-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f7cff);outline-offset:2px}",
      ".dsm-switch:disabled{opacity:.5;cursor:default}",
      ".dsm-thumb{display:block;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.28);transform:translateX(0);transition:transform .15s}",
      ".dsm-switch[data-enabled=true] .dsm-thumb{transform:translateX(18px)}",
      ".dsm-countOn{color:var(--dsw-alias-state-success-primary,#22c55e);font-weight:600}",
      ".dsm-empty{padding:18px 0;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary,rgba(128,128,128,.65))}",
      "@media(max-width:640px){.dsm-header{padding:12px}.dsm-body{margin:0 12px}.dsm-list{max-height:55vh}}",
    ].join("\n")

    function sourceLabel(skill) {
      if (skill.source === "user-dsh") return "用户 · ~/.dsh/skills"
      if (skill.source === "user-agents") return "用户 · ~/.agents/skills"
      if (skill.source === "project-dsh") return "项目 · " + (skill.workspace || ".dsh/skills")
      if (skill.source === "project-agents") return "项目 · " + (skill.workspace || ".agents/skills")
      return skill.source || "本地"
    }

    function Chevron(props) {
      var el = React.createElement
      if (primitives && primitives.IconChevronDownOutline14) {
        return el(primitives.IconChevronDownOutline14, { className: props.className })
      }
      return el("svg", {
        className: props.className, width: 14, height: 14, viewBox: "0 0 14 14",
        "aria-hidden": "true", focusable: "false",
      }, el("path", {
        d: "M3.5 5.25 7 8.75l3.5-3.5", fill: "none", stroke: "currentColor",
        strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
      }))
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
      // Official plugin cards open collapsed; match them so the settings page
      // reads as one uniform list, and keep the on-count visible in the header.
      var state4 = React.useState(false)
      var open = state4[0]
      var setOpen = state4[1]

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
      var summary = skills === null
        ? "正在加载…"
        : el("span", null,
            el("span", { className: "dsm-countOn" }, String(enabled)),
            " / " + list.length + " 已启用")

      return el("li", { className: "dsm-card" + (open ? " dsm-cardOpen" : "") },
        el("button", {
          type: "button",
          className: "dsm-header",
          "aria-expanded": open,
          "aria-label": (open ? "收起设置" : "展开设置") + "：技能管理",
          onClick: function () { setOpen(!open) },
        },
          el("span", { className: "dsm-headText" },
            el("span", { className: "dsm-name" }, "技能管理"),
            el("span", { className: "dsm-description" }, summary)),
          el(Chevron, { className: "dsm-chevron" + (open ? " dsm-chevronOpen" : "") })),
        open
          ? el("div", { className: "dsm-body" },
              el("div", { className: "dsm-toolbar" },
                el("input", {
                  className: "dsm-search", type: "search", value: query,
                  placeholder: "搜索名称、描述或路径…", "aria-label": "搜索技能",
                  onChange: function (event) { setQuery(event.target.value) },
                }),
                el("button", { type: "button", className: "dsm-btn", disabled: !!busy, onClick: load }, "刷新")),
              el("p", { className: "dsm-note" }, "管理用户与当前工作区的本地技能。关闭后技能仍可由 /命令 手动调用，但不会自动进入模型技能目录。"),
              error ? el("p", { className: "dsm-status dsm-error" }, error) : null,
              skills === null
                ? el("div", { className: "dsm-empty" }, "正在扫描本地技能…")
                : visible.length === 0
                  ? el("div", { className: "dsm-empty" }, needle ? "没有匹配的技能" : "未发现本地技能")
                  : el("div", { className: "dsm-list" }, visible.map(function (skill) {
                      return el("div", {
                        key: skill.path, className: "dsm-row",
                        "data-enabled": skill.enabled ? "true" : "false",
                      },
                        el("div", { className: "dsm-info", title: skill.path },
                          el("div", { className: "dsm-skill" }, skill.name),
                          el("div", { className: "dsm-desc" }, skill.description),
                          el("div", { className: "dsm-meta" }, sourceLabel(skill) + (skill.linked ? " · 链接" : "") + " · " + skill.path)),
                        el("div", { className: "dsm-state" },
                          el("span", {
                            className: "dsm-stateText",
                            "data-enabled": skill.enabled ? "true" : "false",
                          }, skill.enabled ? "已启用" : "已禁用"),
                          el("button", {
                            type: "button", role: "switch", className: "dsm-switch",
                            "aria-checked": skill.enabled, "aria-label": (skill.enabled ? "禁用 " : "启用 ") + skill.name,
                            title: skill.enabled ? "点击禁用模型自动调用" : "点击启用模型自动调用",
                            "data-enabled": skill.enabled ? "true" : "false",
                            disabled: !!busy, onClick: function () { toggle(skill) },
                          }, el("span", { className: "dsm-thumb" }))))
                    })))
          : null)
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
