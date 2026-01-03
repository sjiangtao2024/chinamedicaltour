import pandas as pd
import os

# 读取Excel文件（Windows路径兼容）
df = pd.read_excel(r"docs\\new-requirements\\Body check up package.xlsx", engine="openpyxl")

# 创建带位置标记的markdown模板
with open("translation_template.md", "w", encoding="utf-8") as f:
    f.write("# 体检套餐翻译模板\n\n")

    # 处理K/L列 (索引10/11)
    for idx, row in df.iterrows():
        if pd.notna(row.iloc[10]):
            f.write(f"<!-- CELL:K{idx+2} -->\n{row.iloc[10]}\n\n")
        if pd.notna(row.iloc[11]):
            f.write(f"<!-- CELL:L{idx+2} -->\n{row.iloc[11]}\n\n")

    # 处理O/P列 (索引14/15)
    for idx, row in df.iterrows():
        if pd.notna(row.iloc[14]):
            f.write(f"<!-- CELL:O{idx+2} -->\n{row.iloc[14]}\n\n")
        if pd.notna(row.iloc[15]):
            f.write(f"<!-- CELL:P{idx+2} -->\n{row.iloc[15]}\n\n")

print("[OK] 导出完成！请将 translation_template.md 提交给专业翻译")
print("注意：请严格保留 <!-- CELL:... --> 标记格式")