#!/usr/bin/env bash
# Claude Code PreToolUse hook：拦截 git push，提示先做安全检查
# stdin 收 Bash 工具的 hook event JSON：{ tool_name, tool_input: { command }, ... }
# 输出 JSON 时 Claude 会停下并向用户确认；exit 0 静默放行

set -u

# 读 stdin 取出 tool_input.command（用 Python 解析 JSON，避开 jq 依赖）
INPUT="$(cat)"
CMD="$(echo "$INPUT" | /usr/bin/python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get("tool_input", {}).get("command", ""))
except Exception:
    print("")
' 2>/dev/null)"

# 跳过标记：命令里含 SKIP_PUSH_CHECK 或注释 #bypass-check 时不拦截
# （用户确认要直接 push 时 Claude 用这个跳过）
if echo "$CMD" | grep -qE 'SKIP_PUSH_CHECK|bypass-check'; then
  exit 0
fi

# 拦截：命令含 "git push"（不论前面有没有 cd ... && 或管道）
if echo "$CMD" | grep -qE 'git[[:space:]]+push'; then
  cat <<'EOF'
{
  "continue": false,
  "stopReason": "🛡️ 推送拦截 — 请先确认是否做发布前检查\n\n本次推送涉及：\n  1. 敏感信息扫描（凭证 / 密钥 / 真实路径 / 邮箱泄漏）\n  2. 文件大小检查（异常大文件 / 构建产物）\n  3. .gitignore 完整性（.env / node_modules / out 等）\n  4. panel.js 客户端 script syntax 自检（如改了 panel.js）\n\n建议：\n  ✅ 跑完整检查 → bash scripts/pre-push-check.sh （通过后再 push）\n  ⏭️  本次跳过 → 在 push 命令前加 SKIP_PUSH_CHECK=1，例如：\n     SKIP_PUSH_CHECK=1 git push origin main\n\n请直接询问用户：「要先跑安全检查再推，还是跳过直接 push？」"
}
EOF
  exit 0
fi

# 其他 Bash 命令静默放行
exit 0
