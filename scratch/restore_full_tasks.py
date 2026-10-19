import re
import os

with open('ai-creator-community/scratch/step842_replacement.js') as f:
    s842 = f.read()

with open('ai-creator-community/scratch/step860_replacement.js') as f:
    s860 = f.read()

with open('ai-creator-community/scratch/step130_replacement.js') as f:
    s130 = f.read()

with open('ai-creator-community/scratch/step114_replacement.js') as f:
    s114 = f.read()

with open('ai-creator-community/scratch/step811_renderTaskDetailPage.js') as f:
    s811_raw = f.read()

# Clean s811_raw from line numbers like "3560:   renderTaskDetailPage..."
s811_clean_lines = []
for line in s811_raw.split('\n'):
    m = re.match(r'^\d+:\s*(.*)$', line)
    if m:
        s811_clean_lines.append(m.group(1))
s811_clean = '\n'.join(s811_clean_lines)

# Now check step 860 replacement into s842:
# In s842, "renderSectionCompleted" was replaced by step 860
# Let's find where renderSectionCompleted starts and replace it
# Look at s860:
# Starts with: "// 4. 已完成：双方双向真实互评卡片 + 成果归档与展厅收录态\n    if (status === '已完成') {"
# In s842: "    // 4. 已完成：双方双向真实互评卡片 + 成果归档与展厅收录态"
completed_marker = "// 4. 已完成：双方双向真实互评卡片 + 成果归档与展厅收录态"
if completed_marker in s842:
    idx1 = s842.find(completed_marker)
    # find next state or method
    next_marker = "// 5. 未成交 / 已截止"
    idx2 = s842.find(next_marker)
    if idx1 != -1 and idx2 != -1:
        s842 = s842[:idx1] + s860.strip() + '\n\n    ' + s842[idx2:]
        print('Successfully patched s842 with s860 completed section!')

# Now check step 697 replacement into s114 (renderMyTasks):
with open('ai-creator-community/scratch/clean_step23.js') as f:
    s23 = f.read()

with open('ai-creator-community/scratch/clean_step25.js') as f:
    s25 = f.read()

print('Loaded all snippets successfully.')
