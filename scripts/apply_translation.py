import pandas as pd
import re
import os

# 读取原始Excel
try:
    df = pd.read_excel(r"docs\\new-requirements\\Body check up package.xlsx", engine="openpyxl")
except Exception as e:
    print(f"错误：无法读取Excel文件 - {str(e)}")
    exit(1)

# 解析翻译结果
try:
    with open("translated_content.md", "r", encoding="utf-8") as f:
        content = f.read()
except FileNotFoundError:
    print("错误：找不到 translated_content.md 文件，请先保存翻译内容")
    exit(1)

translation_log = []

# 定位并填充翻译
for match in re.finditer(r"<!-- CELL:(\w+)(\d+) -->([\s\S]*?)(?=<!--|$)", content):
    col, row, text = match.groups()
    row_idx = int(row) - 2  # Excel行号→pandas索引

    # 映射目标列（K→M, L→N, O→Q, P→R）
    col_map = {
        'K': 12,  # M列
        'L': 13,  # N列
        'O': 16,  # Q列
        'P': 17   # R列
    }

    if col in col_map:
        try:
            df.iat[row_idx, col_map[col]] = text.strip()
            translation_log.append(f"成功：{col}{row} → {['M','N','Q','R'][list(col_map.keys()).index(col)]}{row}")
        except Exception as e:
            translation_log.append(f"错误 {col}{row}：{str(e)}")
    else:
        translation_log.append(f"跳过无效列：{col}{row}")

# 保存结果
try:
    output_path = r"docs\\new-requirements\\translated_package.xlsx"
    df.to_excel(output_path, index=False, engine="openpyxl")
    print("\n[OK] 翻译应用成功！")
    print(f"输出文件：{output_path}")

    # 生成日志
    with open("translation_log.md", "w", encoding="utf-8") as log:
        log.write("# 翻译日志\n")
        log.write(f"处理条目总数：{len(translation_log)}\n\n")
        for entry in translation_log:
            log.write(f"- {entry}\n")

except Exception as e:
    print(f"错误：保存Excel文件失败 - {str(e)}")